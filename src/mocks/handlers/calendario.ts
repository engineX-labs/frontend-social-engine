import { http, HttpResponse } from 'msw'
import { buscarItem, calendarioDelMes } from '../datos'
import { programadasParaElCalendario } from '../programadas'

export const calendarioHandlers = [
  http.get('*/api/calendario', ({ request }) => {
    const mes = new URL(request.url).searchParams.get('mes')
    if (!mes || !/^\d{4}-(0[1-9]|1[0-2])$/.test(mes))
      return HttpResponse.json({ detalle: 'Parámetro mes inválido (YYYY-MM)' }, { status: 422 })
    return HttpResponse.json({
      ...calendarioDelMes(mes),
      programadas: programadasParaElCalendario(mes),
    })
  }),
  http.get('*/api/items/:id', ({ params }) => {
    const item = buscarItem(String(params.id))
    return item
      ? HttpResponse.json(item)
      : HttpResponse.json({ detalle: 'No encontrado' }, { status: 404 })
  }),
]
