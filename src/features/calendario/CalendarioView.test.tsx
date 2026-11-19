import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { validarCalendarioSearch } from '@/app/search'
import { calendarioDelMes } from '@/mocks/datos'
import { server } from '@/mocks/server'
import { CalendarioView } from './CalendarioView'

function montar(ruta: string) {
  const root = createRootRoute()
  const index = createRoute({
    getParentRoute: () => root,
    path: '/',
    validateSearch: validarCalendarioSearch,
    component: CalendarioView,
  })
  const chat = createRoute({ getParentRoute: () => root, path: '/chat', component: () => null })
  const router = createRouter({
    routeTree: root.addChildren([index, chat]),
    history: createMemoryHistory({ initialEntries: [ruta] }),
  })
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

const busqueda = (r: ReturnType<typeof montar>) =>
  r.state.location.search as Record<string, unknown>

describe('CalendarioView (escritorio)', () => {
  it('dibuja la grilla de noviembre 2026 con chips y el banner de Fidel', async () => {
    montar('/?mes=2026-11')
    expect(await screen.findByRole('heading', { name: 'Noviembre 2026' })).toBeInTheDocument()
    // 30 días + 5 de octubre/diciembre para completar semanas = 35 celdas (lunes 26/10 a domingo 29/11 + 30).
    const dias = within(await screen.findByRole('list', { name: 'Días del mes' })).getAllByRole(
      'listitem',
    )
    expect(dias.length % 7).toBe(0)
    expect(await screen.findByRole('button', { name: '20:04 Reel, publicada' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '19:00 Carrusel, sugerida' })).toBeInTheDocument()
    expect(screen.getByText(/Fidel te sugiere 3 ideas/)).toBeInTheDocument()
  })

  it('navega entre meses y escribe el mes en la URL', async () => {
    const router = montar('/?mes=2026-11')
    await screen.findByRole('heading', { name: 'Noviembre 2026' })
    await userEvent.click(screen.getByRole('button', { name: /Mes anterior/ }))
    expect(await screen.findByRole('heading', { name: 'Octubre 2026' })).toBeInTheDocument()
    expect(busqueda(router).mes).toBe('2026-10')
    await userEvent.click(screen.getByRole('button', { name: /Mes siguiente/ }))
    await userEvent.click(screen.getByRole('button', { name: /Mes siguiente/ }))
    expect(await screen.findByRole('heading', { name: 'Diciembre 2026' })).toBeInTheDocument()
  })

  it('"Hoy" vuelve al mes actual y selecciona el día', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-14T15:00:00Z') })
    try {
      const router = montar('/?mes=2026-09')
      await screen.findByRole('heading', { name: 'Septiembre 2026' })
      await userEvent.click(screen.getByRole('button', { name: 'Hoy' }))
      expect(await screen.findByRole('heading', { name: 'Noviembre 2026' })).toBeInTheDocument()
      expect(busqueda(router).dia).toBe('2026-11-14')
      expect(
        await screen.findByRole('heading', { name: /Sábado 14 de noviembre/ }),
      ).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('los filtros ocultan chips y quedan en la URL', async () => {
    const router = montar('/?mes=2026-11')
    await screen.findByRole('button', { name: '19:00 Carrusel, sugerida' })
    const sugeridas = screen.getByRole('button', { name: /Sugeridas/ })
    expect(sugeridas).toHaveAttribute('aria-pressed', 'true')
    expect(sugeridas).toHaveTextContent('3')
    await userEvent.click(sugeridas)
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: '19:00 Carrusel, sugerida' })).toBeNull(),
    )
    expect(busqueda(router).ocultar).toEqual(['idea'])
    expect(screen.getByRole('button', { name: /Sugeridas/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: '20:04 Reel, publicada' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Publicadas/ }))
    await waitFor(() => expect(screen.queryByRole('button', { name: /publicada$/ })).toBeNull())
  })

  it('un clic en un chip setea `item` en la URL', async () => {
    const router = montar('/?mes=2026-11')
    await userEvent.click(await screen.findByRole('button', { name: '20:04 Reel, publicada' }))
    await waitFor(() => expect(busqueda(router).item).toBe('pub-1'))
    expect(busqueda(router).mes).toBe('2026-11')
  })

  it('el resumen muestra las cifras del mes y abre la mejor publicación', async () => {
    const router = montar('/?mes=2026-11')
    const resumen = await screen.findByRole('region', { name: 'Resumen' })
    const r = within(resumen)
    expect(r.getByText('Publicaciones')).toBeInTheDocument()
    expect(r.getByText('Mediana de alcance')).toBeInTheDocument()
    expect(r.getByText('Mejor horario')).toBeInTheDocument()
    await userEvent.click(r.getByRole('button', { name: /Tu mejor publicación de noviembre/ }))
    await waitFor(() => expect(busqueda(router).item).toBe('pub-1'))
  })

  it('el banner abre la primera idea', async () => {
    const router = montar('/?mes=2026-11')
    await userEvent.click(await screen.findByRole('button', { name: 'Ver idea' }))
    await waitFor(() => expect(busqueda(router).item).toBe('idea-1'))
  })

  it('"+N más" elige el día y muestra su agenda', async () => {
    const base = calendarioDelMes('2026-11')
    const extra = ['pub-2', 'pub-3'].map((id, i) => ({
      ...base.publicadas[i]!,
      id: `x-${id}`,
      fecha: base.publicadas[0]!.fecha,
    }))
    server.use(
      http.get('*/api/calendario', () =>
        HttpResponse.json({ ...base, publicadas: [...base.publicadas, ...extra] }),
      ),
    )
    const router = montar('/?mes=2026-11')
    await userEvent.click(await screen.findByRole('button', { name: /Ver 1 publicación más del/ }))
    await waitFor(() => expect(busqueda(router).dia).toBe('2026-11-05'))
    expect(
      await screen.findByRole('heading', { name: /Jueves 5 de noviembre/ }),
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('button', { name: /Tres prendas|Cinco looks|Domingo/ }).length,
    ).toBeGreaterThan(0)
  })

  it('un día sin publicaciones muestra un vacío claro', async () => {
    montar('/?mes=2026-11&dia=2026-11-12')
    expect(await screen.findByText('Nada para este día.')).toBeInTheDocument()
    expect(screen.getByText('No hay publicaciones ni ideas de Fidel.')).toBeInTheDocument()
  })

  it('un mes sin datos avisa y no muestra el banner', async () => {
    montar('/?mes=2027-03')
    expect(await screen.findByText(/todavía no tiene publicaciones/)).toBeInTheDocument()
    expect(screen.queryByText(/Fidel te sugiere/)).toBeNull()
  })

  it('muestra el error y reintenta', async () => {
    let falla = true
    server.use(
      http.get('*/api/calendario', () =>
        falla
          ? HttpResponse.json({ detalle: 'caído' }, { status: 500 })
          : HttpResponse.json({
              mes: '2026-11',
              publicadas: [],
              ideas: [],
              resumen: {},
            }),
      ),
    )
    montar('/?mes=2026-11')
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar el calendario.')
    falla = false
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText(/todavía no tiene publicaciones/)).toBeInTheDocument()
  })

  it('401: pide iniciar sesión y no ofrece reintentar', async () => {
    server.use(
      http.get('*/api/calendario', () =>
        HttpResponse.json({ detalle: 'Falta iniciar sesión' }, { status: 401 }),
      ),
    )
    montar('/?mes=2026-11')
    expect(await screen.findByRole('alert')).toHaveTextContent(/sesión/i)
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull()
  })

  it('403: avisa que el usuario no tiene comercio y no ofrece reintentar', async () => {
    server.use(
      http.get('*/api/calendario', () =>
        HttpResponse.json(
          { detalle: 'Tu usuario todavía no tiene un comercio asignado' },
          { status: 403 },
        ),
      ),
    )
    montar('/?mes=2026-11')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Tu usuario todavía no tiene un comercio asignado.',
    )
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull()
  })

  it('con la respuesta real del backend (sin ideas, mes sin publicaciones) no se rompe', async () => {
    server.use(
      http.get('*/api/calendario', () =>
        HttpResponse.json({
          mes: '2026-11',
          publicadas: [],
          ideas: [],
          resumen: {
            cantidad: 0,
            medianaAlcance: 0,
            medianaPorFormato: {},
            mejorHora: 19,
            medianaNoche: null,
            medianaResto: null,
            mejorAlcance: 0,
          },
        }),
      ),
    )
    montar('/?mes=2026-11')
    expect(await screen.findByText(/todavía no tiene publicaciones/)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByText(/Fidel te sugiere/)).toBeNull()
  })
})

describe('CalendarioView (móvil)', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
  })
  afterEach(() => vi.unstubAllGlobals())

  it('reduce la grilla a días y muestra la agenda del día elegido', async () => {
    const router = montar('/?mes=2026-11')
    expect(screen.queryByRole('button', { name: '20:04 Reel, publicada' })).toBeNull()
    const dia = await screen.findByRole('button', { name: /^jueves 5 de noviembre: 1 publicada/ })
    expect(dia).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(dia)
    await waitFor(() => expect(busqueda(router).dia).toBe('2026-11-05'))
    expect(screen.getByRole('button', { name: /^jueves 5 de noviembre/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    const tarjeta = await screen.findByRole('button', { name: /Tres prendas/ })
    await userEvent.click(tarjeta)
    await waitFor(() => expect(busqueda(router).item).toBe('pub-1'))
  })
})

describe('CalendarioView (día inválido)', () => {
  it('ignora un día que no existe en el mes', async () => {
    montar('/?mes=2026-02&dia=2026-02-31')
    await screen.findByRole('heading', { name: 'Febrero 2026' })
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull()
  })
})
