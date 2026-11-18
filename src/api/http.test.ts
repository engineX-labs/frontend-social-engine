import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { streamChat } from '@/features/chat/api'
import { avisarNoAutorizado, obtenerToken } from './auth'
import { ApiError, apiFetch, cabecerasConAuth, reintentarConsulta, urlApi } from './http'

vi.mock('./auth', () => ({ obtenerToken: vi.fn(), avisarNoAutorizado: vi.fn() }))
const token = vi.mocked(obtenerToken)
const noAutorizado = vi.mocked(avisarNoAutorizado)

beforeEach(() => {
  token.mockResolvedValue(null)
  noAutorizado.mockClear()
})

describe('urlApi', () => {
  it('sin VITE_API_URL usa el origen actual', () => {
    expect(urlApi('/api/calendario').pathname).toBe('/api/calendario')
  })
})

describe('cabecerasConAuth', () => {
  it('agrega Authorization: Bearer y conserva las cabeceras que ya había', async () => {
    token.mockResolvedValue('jwt-de-prueba')
    const c = await cabecerasConAuth({ Accept: 'text/event-stream' })
    expect(c.get('Authorization')).toBe('Bearer jwt-de-prueba')
    expect(c.get('Accept')).toBe('text/event-stream')
  })

  it('sin token no manda Authorization', async () => {
    const c = await cabecerasConAuth({ Accept: 'application/json' })
    expect(c.has('Authorization')).toBe(false)
    expect(c.get('Accept')).toBe('application/json')
  })
})

describe('apiFetch', () => {
  it('manda el token y los params en el pedido', async () => {
    token.mockResolvedValue('jwt-de-prueba')
    let visto: { auth: string | null; mes: string | null } | null = null
    server.use(
      http.get('*/api/prueba', ({ request }) => {
        visto = {
          auth: request.headers.get('Authorization'),
          mes: new URL(request.url).searchParams.get('mes'),
        }
        return HttpResponse.json({ ok: true })
      }),
    )
    await expect(apiFetch('/api/prueba', { params: { mes: '2026-11' } })).resolves.toEqual({
      ok: true,
    })
    expect(visto).toEqual({ auth: 'Bearer jwt-de-prueba', mes: '2026-11' })
  })

  it('sin token no manda Authorization', async () => {
    let auth: string | null = 'sin-leer'
    server.use(
      http.get('*/api/prueba', ({ request }) => {
        auth = request.headers.get('Authorization')
        return HttpResponse.json({})
      }),
    )
    await apiFetch('/api/prueba')
    expect(auth).toBeNull()
  })

  it('un error de la API lleva el status y el `detalle`', async () => {
    server.use(
      http.get('*/api/prueba', () =>
        HttpResponse.json({ detalle: 'Falta iniciar sesión' }, { status: 401 }),
      ),
    )
    await expect(apiFetch('/api/prueba')).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      message: 'Falta iniciar sesión',
    })
  })

  it('un 401 avisa para volver al ingreso; un 403 o un 500 no', async () => {
    server.use(http.get('*/api/prueba', () => HttpResponse.json({ detalle: 'x' }, { status: 401 })))
    await expect(apiFetch('/api/prueba')).rejects.toMatchObject({ status: 401 })
    expect(noAutorizado).toHaveBeenCalledTimes(1)

    for (const status of [403, 404, 500]) {
      server.use(http.get('*/api/prueba', () => HttpResponse.json({}, { status })))
      await expect(apiFetch('/api/prueba')).rejects.toMatchObject({ status })
    }
    expect(noAutorizado).toHaveBeenCalledTimes(1)
  })

  it('manda un cuerpo JSON con su Content-Type', async () => {
    let visto: { tipo: string | null; cuerpo: unknown } | null = null
    server.use(
      http.post('*/api/prueba', async ({ request }) => {
        visto = { tipo: request.headers.get('Content-Type'), cuerpo: await request.json() }
        return HttpResponse.json({ ok: true }, { status: 201 })
      }),
    )
    await apiFetch('/api/prueba', { method: 'POST', json: { redId: 'a', medios: [] } })
    expect(visto).toEqual({ tipo: 'application/json', cuerpo: { redId: 'a', medios: [] } })
  })

  it('un 204 no tiene cuerpo y devuelve undefined', async () => {
    server.use(http.delete('*/api/prueba/1', () => new HttpResponse(null, { status: 204 })))
    await expect(apiFetch('/api/prueba/1', { method: 'DELETE' })).resolves.toBeUndefined()
  })

  it('un 422 conserva los problemas y el código si llega', async () => {
    server.use(
      http.post('*/api/prueba', () =>
        HttpResponse.json(
          { detalle: 'Pedido inválido', problemas: ['Uno', 'Dos', 3], codigo: 'regla' },
          { status: 422 },
        ),
      ),
    )
    const error = await apiFetch('/api/prueba', { method: 'POST', json: {} }).catch(
      (e: unknown) => e,
    )
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 422,
      message: 'Pedido inválido',
      problemas: ['Uno', 'Dos'],
      codigo: 'regla',
    })
  })

  it('un error sin cuerpo legible usa el código de estado', async () => {
    server.use(http.get('*/api/prueba', () => new HttpResponse('caído', { status: 502 })))
    const error = await apiFetch('/api/prueba').catch((e: unknown) => e)
    expect(error).toMatchObject({ status: 502, message: 'Error 502', problemas: [], codigo: null })
  })
})

describe('streamChat', () => {
  it('también manda el token', async () => {
    token.mockResolvedValue('jwt-de-prueba')
    let auth: string | null = null
    server.use(
      http.post('*/api/chat', ({ request }) => {
        auth = request.headers.get('Authorization')
        return new HttpResponse('data: [DONE]\n\n', {
          headers: { 'Content-Type': 'text/event-stream' },
        })
      }),
    )
    for await (const _ of streamChat({ mensajes: [{ rol: 'usuario', texto: 'hola' }] })) void _
    expect(auth).toBe('Bearer jwt-de-prueba')
  })
})

describe('streamChat (errores)', () => {
  it('un 401 del chat también avisa para volver al ingreso', async () => {
    server.use(http.post('*/api/chat', () => HttpResponse.json({ detalle: 'x' }, { status: 401 })))
    const leer = async () => {
      for await (const _ of streamChat({ mensajes: [{ rol: 'usuario', texto: 'hola' }] })) void _
    }
    await expect(leer()).rejects.toMatchObject({ status: 401 })
    expect(noAutorizado).toHaveBeenCalledTimes(1)
  })
})

describe('reintentarConsulta', () => {
  it('reintenta una vez los fallos de red o 5xx', () => {
    expect(reintentarConsulta(0, new TypeError('red'))).toBe(true)
    expect(reintentarConsulta(0, new ApiError(500, 'caído'))).toBe(true)
    expect(reintentarConsulta(1, new ApiError(500, 'caído'))).toBe(false)
  })

  it('no reintenta 401, 403 ni 404', () => {
    for (const status of [401, 403, 404]) {
      expect(reintentarConsulta(0, new ApiError(status, 'x'))).toBe(false)
    }
  })
})
