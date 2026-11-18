import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { validarCalendarioSearch } from '@/app/search'
import type { CalendarioMes, Programada, Publicada } from '@/domain/types'
import { calendarioDelMes } from '@/mocks/datos'
import { server } from '@/mocks/server'
import { agruparPorDia, programadasDelCalendario } from './agrupar'
import { CalendarioView } from './CalendarioView'

const pub = calendarioDelMes('2026-11').publicadas[0] as Publicada
const pieza = (extra: Partial<Programada> = {}): Programada => ({
  tipo: 'programada',
  id: 'prog-x',
  red: 'instagram',
  redId: 'red-ig',
  estado: 'publicando',
  formato: 'reel',
  texto: 'Nuevo reel',
  medios: [],
  fecha: pub.fecha,
  error: null,
  urlPublicada: null,
  itemId: null,
  ...extra,
})
const mes = (programadas: Programada[], publicadas: Publicada[] = []): CalendarioMes => ({
  ...calendarioDelMes('2026-11'),
  publicadas,
  programadas,
})
const cuantas = (datos: CalendarioMes, id: string) =>
  [...agruparPorDia(datos, []).values()].flat().filter((i) => i.id === id).length

describe('una publicación nunca se dibuja dos veces', () => {
  it('pasar de publicando a publicada con itemId, y después a la lista de publicadas, la deja una sola vez', () => {
    const idPublicada = pub.id
    // 1. Publicándose: solo en `programadas`.
    expect(cuantas(mes([pieza()]), 'prog-x')).toBe(1)
    // 2. Publicada y enlazada, pero todavía sin métricas: sigue saliendo en `programadas`.
    const enlazada = pieza({ estado: 'publicada', itemId: idPublicada })
    expect(cuantas(mes([enlazada]), 'prog-x')).toBe(1)
    expect(cuantas(mes([enlazada]), idPublicada)).toBe(0)
    // 3. Con sus métricas sale en `publicadas`: la pieza se omite, queda solo la publicación.
    const completo = mes([enlazada], [pub])
    expect(cuantas(completo, 'prog-x')).toBe(0)
    expect(cuantas(completo, idPublicada)).toBe(1)
  })

  it('solo se omite la pieza cuyo itemId sale en publicadas, no otras publicadas', () => {
    const otra = pieza({ id: 'prog-y', estado: 'publicada', itemId: 'otra-publicacion' })
    expect(programadasDelCalendario(mes([otra], [pub])).map((p) => p.id)).toEqual(['prog-y'])
    const sinItem = pieza({ id: 'prog-z', estado: 'publicada', itemId: null })
    expect(programadasDelCalendario(mes([sinItem], [pub])).map((p) => p.id)).toEqual(['prog-z'])
  })

  it('en pantalla: la pieza enlazada no suma al filtro «Programadas» ni repite el chip', async () => {
    vi.stubEnv('VITE_PUBLICACION_HABILITADA', 'true')
    const enlazada = pieza({ estado: 'publicada', itemId: pub.id })
    server.use(
      http.get('*/api/calendario', () =>
        HttpResponse.json(
          mes([enlazada, pieza({ id: 'prog-otra', fecha: '2026-11-24T15:00:00.000Z' })], [pub]),
        ),
      ),
    )
    const root = createRootRoute()
    const index = createRoute({
      getParentRoute: () => root,
      path: '/',
      validateSearch: validarCalendarioSearch,
      component: CalendarioView,
    })
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <RouterProvider
          router={createRouter({
            routeTree: root.addChildren([index]),
            history: createMemoryHistory({ initialEntries: ['/?mes=2026-11'] }),
          })}
        />
      </QueryClientProvider>,
    )
    const filtros = await screen.findByRole('group', { name: 'Filtrar por tipo' })
    await waitFor(() =>
      expect(within(filtros).getByRole('button', { name: /Programadas/ })).toHaveTextContent('1'),
    )
    expect(within(filtros).getByRole('button', { name: /Publicadas/ })).toHaveTextContent('1')
    vi.unstubAllEnvs()
  })
})
