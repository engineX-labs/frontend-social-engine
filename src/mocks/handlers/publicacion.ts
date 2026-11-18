import { http, HttpResponse } from 'msw'
import {
  ErrorMock,
  borradoresSinFecha,
  cancelarPieza,
  crearPieza,
  editarPieza,
  exigirHabilitada,
  opcionesTikTok,
  programadasDelMes,
  redes,
  reintentarPieza,
  verPieza,
  type CuerpoCrear,
  type CuerpoEditar,
} from '../programadas'

const MES = /^\d{4}-(0[1-9]|1[0-2])$/
const TIPOS_DE_MEDIO = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
const MAX_MEDIO = 5 * 1024 ** 3

/** Responde con el resultado, o con el error del mock tal como lo mandaría el backend. */
async function responder(fn: () => Response | Promise<Response>): Promise<Response> {
  try {
    return await fn()
  } catch (e) {
    if (e instanceof ErrorMock) return HttpResponse.json(e.cuerpo, { status: e.status })
    throw e
  }
}

export const subidaMockUrl = 'https://mock-subida.zernio.test'
const CORS_SUBIDA = { 'Access-Control-Allow-Origin': '*' }

export const publicacionHandlers = [
  http.get('*/api/redes', () =>
    responder(() => {
      exigirHabilitada()
      return HttpResponse.json(redes())
    }),
  ),
  http.get('*/api/redes/:id/opciones-tiktok', ({ params }) =>
    responder(() => {
      exigirHabilitada()
      return HttpResponse.json(opcionesTikTok(String(params.id)))
    }),
  ),
  http.post('*/api/medios', ({ request }) =>
    responder(async () => {
      exigirHabilitada()
      const c = (await request.json()) as {
        nombre?: string
        contentType?: string
        tamanio?: number
      }
      if (!c.nombre || !c.contentType || !TIPOS_DE_MEDIO.includes(c.contentType))
        return HttpResponse.json({ detalle: 'Tipo de archivo no admitido' }, { status: 422 })
      if (!c.tamanio || c.tamanio <= 0 || c.tamanio > MAX_MEDIO)
        return HttpResponse.json({ detalle: 'Tamaño de archivo no admitido' }, { status: 422 })
      const nombre = encodeURIComponent(`${crypto.randomUUID()}-${c.nombre}`)
      return HttpResponse.json({
        uploadUrl: `${subidaMockUrl}/put/${nombre}`,
        publicUrl: `https://mock.zernio.test/medios/${nombre}`,
      })
    }),
  ),
  // El almacenamiento de Zernio al que el navegador sube el archivo con la URL firmada. Es de otro
  // origen: un navegador (y jsdom) manda antes un OPTIONS y exige `Access-Control-Allow-Origin`.
  http.options(
    `${subidaMockUrl}/put/*`,
    () =>
      new HttpResponse(null, {
        status: 204,
        headers: {
          ...CORS_SUBIDA,
          'Access-Control-Allow-Methods': 'PUT',
          'Access-Control-Allow-Headers': '*',
        },
      }),
  ),
  http.put(
    `${subidaMockUrl}/put/*`,
    () => new HttpResponse(null, { status: 200, headers: CORS_SUBIDA }),
  ),
  http.post('*/api/programadas', ({ request }) =>
    responder(async () => {
      const { pieza, estado } = crearPieza((await request.json()) as CuerpoCrear)
      return HttpResponse.json(pieza, { status: estado })
    }),
  ),
  http.get('*/api/programadas', ({ request }) =>
    responder(() => {
      exigirHabilitada()
      const mes = new URL(request.url).searchParams.get('mes')
      if (mes === null) return HttpResponse.json(borradoresSinFecha())
      if (!MES.test(mes))
        return HttpResponse.json({ detalle: 'Parámetro mes inválido (YYYY-MM)' }, { status: 422 })
      return HttpResponse.json(programadasDelMes(mes))
    }),
  ),
  http.get('*/api/programadas/:id', ({ params }) =>
    responder(() => HttpResponse.json(verPieza(String(params.id)))),
  ),
  http.patch('*/api/programadas/:id', ({ params, request }) =>
    responder(async () =>
      HttpResponse.json(editarPieza(String(params.id), (await request.json()) as CuerpoEditar)),
    ),
  ),
  http.delete('*/api/programadas/:id', ({ params }) =>
    responder(() => {
      cancelarPieza(String(params.id))
      return new HttpResponse(null, { status: 204 })
    }),
  ),
  http.post('*/api/programadas/:id/reintentar', ({ params }) =>
    responder(() => HttpResponse.json(reintentarPieza(String(params.id)))),
  ),
]
