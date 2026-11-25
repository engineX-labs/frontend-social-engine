import { http, HttpResponse } from 'msw'
import {
  ErrorRegistroMock,
  cargarCuentaPropia,
  crearComercio,
  iniciarConexion,
  redesDeConexion,
  sincronizar,
  yo,
} from '../registro'

/** Responde con el resultado, o con el error del mock tal como lo mandaría el backend. */
async function responder(fn: () => Response | Promise<Response>): Promise<Response> {
  try {
    return await fn()
  } catch (e) {
    if (e instanceof ErrorRegistroMock) return HttpResponse.json(e.cuerpo, { status: e.status })
    throw e
  }
}

export const registroHandlers = [
  http.get('*/api/yo', () => responder(() => HttpResponse.json(yo()))),
  http.post('*/api/comercio', ({ request }) =>
    responder(async () => {
      const cuerpo = (await request.json().catch(() => ({}))) as { nombre?: unknown }
      const { comercio, estado } = crearComercio(cuerpo)
      return HttpResponse.json(comercio, { status: estado })
    }),
  ),
  http.post('*/api/conexion/cuenta', ({ request }) =>
    responder(async () => {
      const cuerpo = (await request.json().catch(() => ({}))) as { apiKey?: unknown }
      return HttpResponse.json(cargarCuentaPropia(cuerpo))
    }),
  ),
  http.get('*/api/conexion/redes', () => responder(() => HttpResponse.json(redesDeConexion()))),
  // `sincronizar` va antes que `:plataforma`: es una ruta literal y no una plataforma.
  http.post('*/api/conexion/redes/sincronizar', () =>
    responder(() => HttpResponse.json(sincronizar())),
  ),
  http.post('*/api/conexion/redes/:plataforma', ({ params, request }) =>
    responder(async () => {
      const cuerpo = (await request.json().catch(() => ({}))) as { reconectarRedId?: string | null }
      const authUrl = iniciarConexion(String(params.plataforma), cuerpo.reconectarRedId ?? null)
      return HttpResponse.json({ authUrl })
    }),
  ),
]
