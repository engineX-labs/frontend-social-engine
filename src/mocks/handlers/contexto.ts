import { http, HttpResponse } from 'msw'
import {
  ErrorContexto,
  confirmarPerfil,
  generarPerfil,
  guardarContexto,
  verContexto,
  verPerfil,
} from '../contexto'

function responder(fn: () => Response): Response {
  try {
    return fn()
  } catch (e) {
    if (e instanceof ErrorContexto) return HttpResponse.json(e.cuerpo, { status: e.status })
    throw e
  }
}

export const contextoHandlers = [
  http.get('*/api/contexto', () => HttpResponse.json(verContexto())),
  http.put('*/api/contexto', async ({ request }) => {
    const cuerpo = (await request.json()) as Parameters<typeof guardarContexto>[0]
    return responder(() => HttpResponse.json(guardarContexto(cuerpo)))
  }),
  http.get('*/api/perfil-marca', () => HttpResponse.json(verPerfil())),
  http.post('*/api/perfil-marca/generar', () =>
    responder(() => HttpResponse.json(generarPerfil(), { status: 202 })),
  ),
  http.put('*/api/perfil-marca', async ({ request }) => {
    const cuerpo = (await request.json()) as { confirmado?: Parameters<typeof confirmarPerfil>[0] }
    return responder(() => HttpResponse.json(confirmarPerfil(cuerpo.confirmado)))
  }),
]
