import { delay, http, HttpResponse } from 'msw'
import { registrarProveedorDeToken } from '@/api/auth'
import { ApiError } from '@/api/http'
import { subidaMockUrl } from '@/mocks/handlers/publicacion'
import { mockPublicacion } from '@/mocks/programadas'
import { server } from '@/mocks/server'
import {
  aceptarDe,
  ayudaDeMedios,
  ErrorDeSubida,
  limiteDeMedios,
  MAX_ARCHIVO,
  subirArchivo,
  SubidaCancelada,
  tipoDeMedio,
  validarArchivo,
} from './subida'

/**
 * El PUT va a otro origen (el almacenamiento de Zernio) con un Content-Type que no es «simple»: el
 * navegador, y jsdom también, manda antes un OPTIONS y exige `Access-Control-Allow-Origin` en la
 * respuesta. Acá se simula un almacenamiento que sí lo permite; que el de Zernio lo permita desde
 * nuestro dominio NO está verificado (ver el informe de la Fase 3).
 */
const CORS = { 'Access-Control-Allow-Origin': '*' }
beforeEach(() => {
  server.use(
    http.options(
      `${subidaMockUrl}/put/*`,
      () =>
        new HttpResponse(null, {
          status: 204,
          headers: {
            ...CORS,
            'Access-Control-Allow-Methods': 'PUT',
            'Access-Control-Allow-Headers': '*',
          },
        }),
    ),
    http.put(
      `${subidaMockUrl}/put/*`,
      () => new HttpResponse(null, { status: 200, headers: CORS }),
    ),
  )
})

const archivo = (nombre = 'foto.jpg', tipo = 'image/jpeg', contenido = 'contenido') =>
  new File([contenido], nombre, { type: tipo })
const sub = (type: string, size = 1000, name = 'a') => ({ name, type, size })

describe('tipoDeMedio', () => {
  it('distingue imagen de video por el contentType', () => {
    expect(tipoDeMedio('image/png')).toBe('imagen')
    expect(tipoDeMedio('video/mp4')).toBe('video')
    expect(tipoDeMedio('video/quicktime')).toBe('video')
  })
})

describe('limiteDeMedios', () => {
  it('es el de las reglas del backend por tipo de pieza', () => {
    expect(limiteDeMedios('foto')).toBe(1)
    expect(limiteDeMedios('historia')).toBe(1)
    expect(limiteDeMedios('reel')).toBe(1)
    expect(limiteDeMedios('video')).toBe(1)
    expect(limiteDeMedios('carrusel')).toBe(20)
    expect(limiteDeMedios('fotos')).toBe(35)
  })
})

describe('aceptarDe y ayudaDeMedios', () => {
  it('foto y fotos aceptan solo imágenes; reel y video solo video; historia y carrusel ambos', () => {
    expect(aceptarDe('foto')).toBe('image/jpeg,image/png,image/webp')
    expect(aceptarDe('fotos')).toBe('image/jpeg,image/png,image/webp')
    expect(aceptarDe('reel')).toBe('video/mp4,video/quicktime')
    expect(aceptarDe('video')).toBe('video/mp4,video/quicktime')
    expect(aceptarDe('historia').split(',')).toHaveLength(5)
    expect(aceptarDe('carrusel').split(',')).toHaveLength(5)
  })
  it('hay una pista para cada tipo', () => {
    for (const t of ['foto', 'carrusel', 'reel', 'historia', 'video', 'fotos'] as const)
      expect(ayudaDeMedios(t)).not.toBe('')
    expect(ayudaDeMedios('fotos')).toContain('35')
    expect(ayudaDeMedios('carrusel')).toContain('20')
  })
})

describe('validarArchivo', () => {
  it('acepta cada combinación válida de tipo de archivo y de pieza', () => {
    expect(validarArchivo(sub('image/jpeg'), 'foto')).toBeNull()
    expect(validarArchivo(sub('image/png'), 'fotos')).toBeNull()
    expect(validarArchivo(sub('image/webp'), 'carrusel')).toBeNull()
    expect(validarArchivo(sub('video/mp4'), 'carrusel')).toBeNull()
    expect(validarArchivo(sub('video/mp4'), 'reel')).toBeNull()
    expect(validarArchivo(sub('video/quicktime'), 'video')).toBeNull()
    expect(validarArchivo(sub('image/jpeg'), 'historia')).toBeNull()
    expect(validarArchivo(sub('video/mp4'), 'historia')).toBeNull()
  })

  it('rechaza un tipo de archivo que no está admitido', () => {
    expect(validarArchivo(sub('image/gif', 10, 'baile.gif'), 'foto')).toBe(
      '«baile.gif» no es un tipo de archivo admitido. Usá JPG, PNG, WebP, MP4 o MOV.',
    )
    expect(validarArchivo(sub('', 10, 'sin-tipo'), 'foto')).toContain(
      'no es un tipo de archivo admitido',
    )
    expect(validarArchivo(sub('application/pdf'), 'carrusel')).toContain('no es un tipo de archivo')
  })

  it('un video no entra en una foto o en fotos de TikTok, y una imagen no entra en un reel o un video', () => {
    expect(validarArchivo(sub('video/mp4', 1, 'v.mp4'), 'foto')).toBe(
      '«v.mp4» es un video. La foto lleva una imagen.',
    )
    expect(validarArchivo(sub('video/mp4', 1, 'v.mp4'), 'fotos')).toBe(
      '«v.mp4» es un video. Las fotos de TikTok llevan imágenes.',
    )
    expect(validarArchivo(sub('image/png', 1, 'i.png'), 'reel')).toBe(
      '«i.png» es una imagen. El reel lleva un video.',
    )
    expect(validarArchivo(sub('image/png', 1, 'i.png'), 'video')).toBe(
      '«i.png» es una imagen. El video de TikTok lleva un video.',
    )
  })

  it('5 GB exactos valen y un byte más no', () => {
    expect(validarArchivo(sub('video/mp4', MAX_ARCHIVO), 'reel')).toBeNull()
    expect(validarArchivo(sub('video/mp4', MAX_ARCHIVO + 1, 'grande.mp4'), 'reel')).toBe(
      '«grande.mp4» pesa más de 5 GB.',
    )
  })

  it('un archivo vacío no se sube (el backend exige un tamaño mayor a 0)', () => {
    expect(validarArchivo(sub('image/jpeg', 0, 'vacio.jpg'), 'foto')).toBe(
      '«vacio.jpg» está vacío.',
    )
    expect(validarArchivo(sub('image/jpeg', 1), 'foto')).toBeNull()
  })
})

describe('subirArchivo', () => {
  it('pide la URL firmada, sube el archivo y devuelve el medio con su publicUrl', async () => {
    const avances: number[] = []
    const medio = await subirArchivo(archivo('reel.mp4', 'video/mp4'), {
      alProgreso: (f) => avances.push(f),
    })
    expect(medio.tipo).toBe('video')
    expect(medio.url).toMatch(/^https:\/\/mock\.zernio\.test\/medios\/.+reel\.mp4$/)
    expect(avances.at(-1)).toBe(1)
    expect(avances.every((f) => f >= 0 && f <= 1)).toBe(true)
  })

  it('manda el nombre, el tipo y el tamaño al pedir la URL', async () => {
    let cuerpo: unknown
    server.use(
      http.post('*/api/medios', async ({ request }) => {
        cuerpo = await request.json()
        return HttpResponse.json({
          uploadUrl: `${subidaMockUrl}/put/x`,
          publicUrl: 'https://mock.zernio.test/medios/x',
        })
      }),
    )
    await subirArchivo(archivo('look.png', 'image/png', '12345'))
    expect(cuerpo).toEqual({ nombre: 'look.png', contentType: 'image/png', tamanio: 5 })
  })

  it('el PUT va con el Content-Type del archivo y SIN Authorization, aunque haya token', async () => {
    registrarProveedorDeToken(async () => 'jwt-de-clerk')
    const vistos: Record<string, string | null> = {}
    server.use(
      http.post('*/api/medios', ({ request }) => {
        vistos.authPost = request.headers.get('Authorization')
        return HttpResponse.json({
          uploadUrl: `${subidaMockUrl}/put/x`,
          publicUrl: 'https://mock.zernio.test/medios/x',
        })
      }),
      http.put(`${subidaMockUrl}/put/*`, async ({ request }) => {
        vistos.authPut = request.headers.get('Authorization')
        vistos.tipoPut = request.headers.get('Content-Type')
        vistos.cookiePut = request.headers.get('Cookie')
        vistos.cuerpoPut = await request.text()
        return new HttpResponse(null, { status: 200, headers: CORS })
      }),
    )
    await subirArchivo(archivo('v.mp4', 'video/mp4', 'bytes-del-video'))
    // Nuestra API sí recibe el token; el almacenamiento de Zernio, nunca.
    expect(vistos.authPost).toBe('Bearer jwt-de-clerk')
    expect(vistos.authPut).toBeNull()
    expect(vistos.cookiePut).toBeNull()
    expect(vistos.tipoPut).toBe('video/mp4')
    expect(vistos.cuerpoPut).toBe('bytes-del-video')
  })

  it('un PUT que responde con error rechaza con ErrorDeSubida y su status, sin exponer la URL', async () => {
    server.use(
      http.put(
        `${subidaMockUrl}/put/*`,
        () => new HttpResponse(null, { status: 500, headers: CORS }),
      ),
    )
    const error = await subirArchivo(archivo()).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ErrorDeSubida)
    expect(error).toMatchObject({
      status: 500,
      message: 'No se pudo subir el archivo (error 500).',
    })
    expect((error as Error).message).not.toContain('mock-subida')
  })

  it('un PUT bloqueado (CORS) o sin red rechaza con ErrorDeSubida sin status', async () => {
    server.use(http.put(`${subidaMockUrl}/put/*`, () => HttpResponse.error()))
    const error = await subirArchivo(archivo()).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ErrorDeSubida)
    expect(error).toMatchObject({ status: null })
    expect((error as Error).message).toBe('No se pudo subir el archivo. Revisá tu conexión.')
  })

  it('si el backend no firma (422) rechaza con ApiError y no llega a subir nada', async () => {
    let subio = false
    server.use(
      http.post('*/api/medios', () =>
        HttpResponse.json({ detalle: 'Tipo de archivo no admitido' }, { status: 422 }),
      ),
      http.put(`${subidaMockUrl}/put/*`, () => {
        subio = true
        return new HttpResponse(null, { status: 200, headers: CORS })
      }),
    )
    const error = await subirArchivo(archivo()).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 422, message: 'Tipo de archivo no admitido' })
    expect(subio).toBe(false)
  })

  it('con la publicación apagada en el backend el pedido de la URL da 404', async () => {
    mockPublicacion.habilitada = false
    const error = await subirArchivo(archivo()).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 404 })
  })

  it('cancelar mientras se sube corta el PUT y rechaza con SubidaCancelada', async () => {
    let llegoElPut = false
    server.use(
      http.put(`${subidaMockUrl}/put/*`, async () => {
        llegoElPut = true
        await delay('infinite')
        return new HttpResponse(null, { status: 200, headers: CORS })
      }),
    )
    const control = new AbortController()
    const promesa = subirArchivo(archivo(), { senal: control.signal }).catch((e: unknown) => e)
    await vi.waitFor(() => expect(llegoElPut).toBe(true))
    control.abort()
    expect(await promesa).toBeInstanceOf(SubidaCancelada)
  })

  it('cancelar mientras se pide la URL rechaza enseguida con SubidaCancelada', async () => {
    server.use(
      http.post('*/api/medios', async () => {
        await delay('infinite')
        return HttpResponse.json({})
      }),
    )
    const control = new AbortController()
    const promesa = subirArchivo(archivo(), { senal: control.signal }).catch((e: unknown) => e)
    control.abort()
    expect(await promesa).toBeInstanceOf(SubidaCancelada)
  })

  it('una señal ya cancelada no llega a subir nada', async () => {
    let subio = false
    server.use(
      http.put(`${subidaMockUrl}/put/*`, () => {
        subio = true
        return new HttpResponse(null, { status: 200, headers: CORS })
      }),
    )
    const control = new AbortController()
    control.abort()
    const error = await subirArchivo(archivo(), { senal: control.signal }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(SubidaCancelada)
    expect(subio).toBe(false)
  })
})
