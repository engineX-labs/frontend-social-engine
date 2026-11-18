import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { borrarProgramada, crearProgramada } from '@/api/publicacion'
import { validarCalendarioSearch } from '@/app/search'
import { aUtcDesdeBA } from '@/lib/fecha'
import { calendarioDelMes } from '@/mocks/datos'
import { avanzarPieza, mockPublicacion } from '@/mocks/programadas'
import { server } from '@/mocks/server'
import { crearRouter } from '@/router'
import { CalendarioView } from './CalendarioView'

function montar(ruta: string) {
  const root = createRootRoute()
  const index = createRoute({
    getParentRoute: () => root,
    path: '/',
    validateSearch: validarCalendarioSearch,
    component: CalendarioView,
  })
  const router = createRouter({
    routeTree: root.addChildren([index]),
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

const prender = () => vi.stubEnv('VITE_PUBLICACION_HABILITADA', 'true')

/**
 * Noviembre de 2026 con una pieza en cada estado (el mock trae borrador sin fecha, programada,
 * publicada, fallida y «Confirmando…»; acá se completan «Publicando», «No se publicó», un borrador
 * con fecha y una fallida con motivo).
 */
async function mezclarEstados() {
  avanzarPieza('prog-2', 'publicando')
  avanzarPieza('prog-5', 'fallida', { error: 'No se publicó' })
  await crearProgramada({
    redId: 'red-ig',
    accion: 'borrador',
    tipo: 'reel',
    medios: [],
    programadaPara: aUtcDesdeBA(2026, 11, 23, 15, 30),
  })
  const rechazada = await crearProgramada({
    redId: 'red-ig',
    accion: 'borrador',
    tipo: 'foto',
    medios: [],
    programadaPara: aUtcDesdeBA(2026, 11, 24, 9, 0),
  })
  avanzarPieza(rechazada.id, 'fallida', {
    error: 'Zernio rechazó la publicación; revisá el contenido',
  })
}

afterEach(() => vi.unstubAllEnvs())

describe('Calendario con piezas programadas (escritorio)', () => {
  beforeEach(() => prender())

  it('dibuja cada estado con su hora, formato, red y estado en el nombre accesible', async () => {
    await mezclarEstados()
    montar('/?mes=2026-11')
    const nombres = [
      '20:00 Carrusel en Instagram, publicando',
      '19:00 Video en TikTok, programada',
      '18:30 Historia en Instagram, publicada',
      '12:00 Foto en Instagram, no se publicó',
      '10:00 Fotos en TikTok, confirmando…',
      '15:30 Reel en Instagram, borrador',
      '09:00 Foto en Instagram, falló',
    ]
    for (const nombre of nombres)
      expect(await screen.findByRole('button', { name: nombre })).toBeInTheDocument()
  })

  it('cada chip dice su estado con texto, no solo con color', async () => {
    await mezclarEstados()
    montar('/?mes=2026-11')
    const chip = await screen.findByRole('button', {
      name: '12:00 Foto en Instagram, no se publicó',
    })
    expect(within(chip).getByText('No se publicó')).toBeInTheDocument()
    expect(within(chip).getByText('Foto')).toBeInTheDocument()
    expect(within(chip).getByText('12:00')).toBeInTheDocument()
    const confirmando = screen.getByRole('button', { name: /confirmando/ })
    expect(within(confirmando).getByText('Confirmando…')).toBeInTheDocument()
  })

  it('las publicadas también dicen su red cuando publicar está prendido', async () => {
    montar('/?mes=2026-11')
    expect(
      await screen.findByRole('button', { name: '20:04 Reel en Instagram, publicada' }),
    ).toBeInTheDocument()
  })

  it('una publicada de TikTok con formato Video o Historia se ve bien (también con publicar apagado)', async () => {
    vi.unstubAllEnvs()
    const base = calendarioDelMes('2026-11')
    server.use(
      http.get('*/api/calendario', () =>
        HttpResponse.json({
          ...base,
          publicadas: [
            {
              ...base.publicadas[0]!,
              id: 'tt-1',
              red: 'tiktok',
              formato: 'Video',
              fecha: aUtcDesdeBA(2026, 11, 20, 18, 0),
            },
            {
              ...base.publicadas[1]!,
              id: 'ig-h',
              formato: 'Historia',
              fecha: aUtcDesdeBA(2026, 11, 21, 18, 0),
            },
          ],
        }),
      ),
    )
    montar('/?mes=2026-11&dia=2026-11-20')
    const chipTikTok = await screen.findByRole('button', {
      name: '18:00 Video en TikTok, publicada',
    })
    expect(within(chipTikTok).getByText('Video')).toBeInTheDocument()
    // La de Instagram, con publicar apagado, queda como siempre: sin red en el nombre.
    expect(screen.getByRole('button', { name: '18:00 Historia, publicada' })).toBeInTheDocument()
    // Y la agenda del día nombra la red.
    expect(screen.getAllByText('TikTok').length).toBeGreaterThan(0)
  })

  it('el resumen del mes no cuenta las piezas programadas', async () => {
    const cifras = async () => {
      const resumen = await screen.findByRole('region', { name: 'Resumen' })
      return [...resumen.querySelectorAll('.sr-only')].map((n) => n.textContent)
    }
    montar('/?mes=2026-11')
    await screen.findByRole('button', { name: '19:00 Video en TikTok, programada' })
    const conPiezas = await cifras()
    cleanup()
    // Las mismas cifras que con publicar apagado (donde las piezas ni se dibujan).
    vi.unstubAllEnvs()
    montar('/?mes=2026-11')
    await screen.findByRole('button', { name: '20:04 Reel, publicada' })
    expect(await cifras()).toEqual(conPiezas)
    expect(conPiezas.length).toBeGreaterThan(0)
  })

  it('un clic en una pieza guardada abre `?item=` con su id y su día', async () => {
    const router = montar('/?mes=2026-11')
    await userEvent.click(
      await screen.findByRole('button', { name: '19:00 Video en TikTok, programada' }),
    )
    await waitFor(() => expect(busqueda(router).item).toBe('prog-3'))
    expect(busqueda(router).dia).toBe('2026-11-21')
  })

  it('el filtro «Programadas» las oculta, queda en la URL y no toca a los otros', async () => {
    const router = montar('/?mes=2026-11')
    const filtro = await screen.findByRole('button', { name: /Programadas/ })
    expect(filtro).toHaveAttribute('aria-pressed', 'true')
    // 5 con día en noviembre (la del borrador sin fecha no cuenta acá).
    await waitFor(() => expect(filtro).toHaveTextContent('5'))
    await userEvent.click(filtro)
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: '19:00 Video en TikTok, programada' }),
      ).toBeNull(),
    )
    expect(busqueda(router).ocultar).toEqual(['programada'])
    expect(screen.getByRole('button', { name: /Programadas/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(
      screen.getByRole('button', { name: '20:04 Reel en Instagram, publicada' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '19:00 Carrusel, sugerida' })).toBeInTheDocument()
    // Sin las programadas tampoco hay borradores sin fecha.
    expect(screen.queryByRole('region', { name: 'Borradores sin fecha' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /Programadas/ }))
    expect(
      await screen.findByRole('button', { name: '19:00 Video en TikTok, programada' }),
    ).toBeInTheDocument()
  })

  it('un `ocultar` viejo o desconocido en la URL no rompe nada', async () => {
    montar('/?mes=2026-11&ocultar=idea&ocultar=cualquiera')
    expect(
      await screen.findByRole('button', { name: '19:00 Video en TikTok, programada' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /sugerida/ })).toBeNull()
  })

  it('un mes sin nada nombra las piezas programadas en el aviso', async () => {
    montar('/?mes=2027-03')
    expect(
      await screen.findByText(/todavía no tiene publicaciones, piezas programadas ni ideas/),
    ).toBeInTheDocument()
  })

  it('«+N más» cuenta también las piezas guardadas', async () => {
    avanzarPieza('prog-2', 'publicando')
    await crearProgramada({
      redId: 'red-ig',
      accion: 'borrador',
      tipo: 'foto',
      medios: [],
      programadaPara: aUtcDesdeBA(2026, 11, 19, 21, 0),
    })
    montar('/?mes=2026-11')
    // El 19 hay una idea, una pieza publicándose y un borrador: 2 chips y «+1 más».
    expect(
      await screen.findByRole('button', {
        name: /Ver 1 publicación más del jueves 19 de noviembre/,
      }),
    ).toBeInTheDocument()
  })
})

describe('Borradores sin fecha', () => {
  beforeEach(() => prender())

  it('es una fila plegada con su conteo, que se abre y deja abrir cada borrador', async () => {
    const router = montar('/?mes=2026-11')
    const region = await screen.findByRole('region', { name: 'Borradores sin fecha' })
    const boton = within(region).getByRole('button', { name: /Borradores sin fecha/ })
    expect(boton).toHaveAttribute('aria-expanded', 'false')
    expect(boton).toHaveTextContent('1')
    expect(within(region).queryByRole('list')).toBeNull()
    await userEvent.click(boton)
    expect(boton).toHaveAttribute('aria-expanded', 'true')
    const tarjeta = within(region).getByRole('button', { name: 'Reel en Instagram, borrador' })
    expect(within(tarjeta).getByText(/Idea de reel/)).toBeInTheDocument()
    // No tiene hora: no es de ningún día.
    expect(tarjeta.getAttribute('aria-label')).not.toMatch(/\d\d:\d\d/)
    await userEvent.click(tarjeta)
    await waitFor(() => expect(busqueda(router).item).toBe('prog-1'))
    expect(busqueda(router).dia).toBeUndefined()
  })

  it('con varios borradores cuenta todos y no depende del mes', async () => {
    await crearProgramada({ redId: 'red-tt', accion: 'borrador', tipo: 'video', medios: [] })
    montar('/?mes=2027-03')
    const region = await screen.findByRole('region', { name: 'Borradores sin fecha' })
    expect(within(region).getByRole('button', { name: /Borradores sin fecha/ })).toHaveTextContent(
      '2',
    )
  })

  it('sin borradores sin fecha no dibuja nada', async () => {
    await borrarProgramada('prog-1')
    montar('/?mes=2026-11')
    await screen.findByRole('button', { name: '19:00 Video en TikTok, programada' })
    expect(screen.queryByRole('region', { name: 'Borradores sin fecha' })).toBeNull()
  })

  it('si no se puede traer la lista, avisa sin romper el calendario y reintenta', async () => {
    let falla = true
    server.use(
      http.get('*/api/programadas', () =>
        falla ? HttpResponse.json({ detalle: 'caído' }, { status: 500 }) : HttpResponse.json([]),
      ),
    )
    montar('/?mes=2026-11')
    expect(
      await screen.findByText('No pudimos cargar los borradores sin fecha.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '19:00 Video en TikTok, programada' }),
    ).toBeInTheDocument()
    falla = false
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() =>
      expect(screen.queryByText('No pudimos cargar los borradores sin fecha.')).toBeNull(),
    )
  })
})

describe('Calendario con la publicación apagada', () => {
  it('es el de siempre: sin piezas, sin filtro nuevo, sin lista y sin pedir nada de publicar', async () => {
    const pedidos: string[] = []
    server.events.on('request:start', ({ request }) => {
      pedidos.push(new URL(request.url).pathname)
    })
    try {
      montar('/?mes=2026-11')
      expect(
        await screen.findByRole('button', { name: '20:04 Reel, publicada' }),
      ).toBeInTheDocument()
      // El mock de calendario sí manda `programadas`: la UI las ignora.
      expect(screen.queryByRole('button', { name: /programada$/ })).toBeNull()
      expect(screen.queryByRole('button', { name: /Programadas/ })).toBeNull()
      expect(screen.queryByRole('region', { name: 'Borradores sin fecha' })).toBeNull()
      expect(
        screen.getByRole('group', { name: 'Filtrar por tipo' }).querySelectorAll('button'),
      ).toHaveLength(2)
      await waitFor(() => expect(pedidos).toContain('/api/calendario'))
      expect(
        pedidos.filter((p) => p.includes('/api/programadas') || p.includes('/api/redes')),
      ).toEqual([])
    } finally {
      server.events.removeAllListeners()
    }
  })

  it('el aviso de un día vacío y de un mes vacío son los de antes', async () => {
    montar('/?mes=2026-11&dia=2026-11-11')
    expect(await screen.findByText('No hay publicaciones ni ideas de Fidel.')).toBeInTheDocument()
  })
})

describe('Con la bandera del front prendida y el backend sin publicar (404)', () => {
  it('esconde todo igual que con la bandera apagada', async () => {
    prender()
    mockPublicacion.habilitada = false
    montar('/?mes=2026-11')
    await screen.findByRole('button', { name: /20:04 Reel/ })
    await waitFor(() => expect(screen.queryByRole('button', { name: /Programadas/ })).toBeNull())
    expect(screen.queryByRole('region', { name: 'Borradores sin fecha' })).toBeNull()
    expect(screen.queryByRole('button', { name: /programada$/ })).toBeNull()
  })
})

describe('Calendario con piezas programadas (móvil)', () => {
  beforeEach(() => {
    prender()
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
  })
  afterEach(() => vi.unstubAllGlobals())

  it('el nombre del día cuenta las piezas por estado', async () => {
    await mezclarEstados()
    montar('/?mes=2026-11')
    expect(
      await screen.findByRole('button', {
        name: 'jueves 19 de noviembre: 1 publicándose y 1 sugerida',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'viernes 13 de noviembre: 1 sin publicar' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'jueves 12 de noviembre: 1 publicada' }),
    ).toBeInTheDocument()
  })

  it('la agenda del día muestra la tarjeta con red, formato, hora y estado, y abre la pieza', async () => {
    await mezclarEstados()
    const router = montar('/?mes=2026-11&dia=2026-11-24')
    const tarjeta = await screen.findByRole('button', { name: '09:00 Foto en Instagram, falló' })
    expect(within(tarjeta).getByText('Instagram')).toBeInTheDocument()
    expect(within(tarjeta).getByText('Falló')).toBeInTheDocument()
    // El motivo del fallo se lee en la tarjeta.
    expect(
      within(tarjeta).getByText('Zernio rechazó la publicación; revisá el contenido'),
    ).toBeInTheDocument()
    await userEvent.click(tarjeta)
    await waitFor(() => expect(busqueda(router).item).toBeTruthy())
  })

  it('«Confirmando…» y «No se publicó» explican qué pasa', async () => {
    avanzarPieza('prog-5', 'fallida', { error: 'No se publicó' })
    montar('/?mes=2026-11&dia=2026-11-14')
    expect(await screen.findByText(/Estamos confirmando si se publicó/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /viernes 13 de noviembre/ }))
    expect(await screen.findByText(/No se publicó. Podés crearla de nuevo/)).toBeInTheDocument()
  })

  it('un día sin nada dice que no hay publicaciones, piezas programadas ni ideas', async () => {
    montar('/?mes=2026-11&dia=2026-11-11')
    expect(
      await screen.findByText('No hay publicaciones, piezas programadas ni ideas de Fidel.'),
    ).toBeInTheDocument()
  })
})

describe('Detalle de una pieza guardada (todavía sin panel propio)', () => {
  it('abrir `?item=` de una programada muestra el estado de «no encontrado» sin romper', async () => {
    prender()
    const history = createMemoryHistory({ initialEntries: ['/?mes=2026-11&item=prog-2'] })
    const router = crearRouter(history)
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
    await router.load()
    const dialogo = await screen.findByRole('dialog')
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
      /No encontramos este elemento/,
    )
    // El calendario de atrás sigue en pie.
    expect(await screen.findByRole('heading', { name: 'Noviembre 2026' })).toBeInTheDocument()
  })
})
