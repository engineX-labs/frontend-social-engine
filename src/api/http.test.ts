import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { streamChat } from '@/features/chat/api'
import { obtenerToken } from './auth'
import { ApiError, apiFetch, cabecerasConAuth, reintentarConsulta, urlApi } from './http'

vi.mock('./auth', () => ({ obtenerToken: vi.fn() }))
const token = vi.mocked(obtenerToken)

beforeEach(() => token.mockResolvedValue(null))

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
