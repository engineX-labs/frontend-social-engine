import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { irA } from '@/lib/navegar'
import { marcarConexionEnCurso } from '@/features/registro/retorno'
import {
  cargarCuentaDeZernio,
  fijarRegistro,
  iniciarConexion,
  marcarParaReconectar,
} from '@/mocks/registro'
import { server } from '@/mocks/server'
import { clerkPrueba } from '@/test/clerk'
import { Acceso } from './Acceso'
import { Entrada } from './Entrada'
import type { PasoDeEntrada } from './pasosDeEntrada'

vi.mock('@/lib/navegar', () => ({ irA: vi.fn() }))

function montar(pasos?: readonly PasoDeEntrada[]) {
  const consultas = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const utilidades = render(
    <QueryClientProvider client={consultas}>
      <Entrada pasos={pasos}>
        <p>el calendario</p>
      </Entrada>
    </QueryClientProvider>,
  )
  return { consultas, ...utilidades }
}

describe('Entrada: un usuario sin comercio', () => {
  beforeEach(() => fijarRegistro('sin_comercio'))

  it('ve la bienvenida, no el aviso de 403 ni el calendario', async () => {
    montar()
    expect(await screen.findByRole('heading', { name: 'Te damos la bienvenida' })).toBeVisible()
    expect(screen.getByLabelText('Nombre del comercio')).toBeInTheDocument()
    expect(screen.queryByText(/todavía no tiene un comercio/)).toBeNull()
    expect(screen.queryByText('el calendario')).toBeNull()
  })

  it('mientras carga muestra un estado de carga', () => {
    montar()
    expect(screen.getByRole('status', { name: 'Cargando tu cuenta' })).toBeInTheDocument()
  })

  it('pide el nombre: vacío o de más de 80 caracteres se marca y no se envía', async () => {
    let pedidos = 0
    server.use(
      http.post('*/api/comercio', () => {
        pedidos += 1
        return HttpResponse.json({}, { status: 201 })
      }),
    )
    montar()
    const usuario = userEvent.setup()
    await usuario.click(await screen.findByRole('button', { name: 'Continuar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Escribí el nombre de tu comercio.')
    await usuario.type(screen.getByLabelText('Nombre del comercio'), 'x'.repeat(81))
    await usuario.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Hasta 80 caracteres.')
    expect(pedidos).toBe(0)
  })

  it('crea el comercio con el nombre (sin espacios de más) y pasa a «preparando tu cuenta»', async () => {
    let cuerpo: unknown
    server.use(
      http.post('*/api/comercio', async ({ request }) => {
        cuerpo = await request.clone().json()
        return HttpResponse.json(
          { id: 'c1', nombre: 'Panadería Sol', estado: 'en_preparacion' },
          { status: 201 },
        )
      }),
    )
    montar()
    const usuario = userEvent.setup()
    await usuario.type(await screen.findByLabelText('Nombre del comercio'), '  Panadería Sol ')
    await usuario.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(
      await screen.findByRole('heading', { name: 'Estamos preparando tu cuenta' }),
    ).toBeVisible()
    expect(cuerpo).toEqual({ nombre: 'Panadería Sol' })
  })

  it('si falla crear el comercio lo avisa y deja reintentar', async () => {
    server.use(
      http.post('*/api/comercio', () => HttpResponse.json({ detalle: 'x' }, { status: 500 })),
    )
    montar()
    const usuario = userEvent.setup()
    await usuario.type(await screen.findByLabelText('Nombre del comercio'), 'Sol')
    await usuario.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(await screen.findByText('No pudimos crear tu comercio. Probá de nuevo.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled()
  })
})

describe('Entrada: según el estado del comercio', () => {
  it('en_preparacion: «Estamos preparando tu cuenta, te avisamos por mail»', async () => {
    fijarRegistro('en_preparacion')
    montar()
    expect(
      await screen.findByRole('heading', { name: 'Estamos preparando tu cuenta' }),
    ).toBeVisible()
    expect(screen.getByText(/te avisamos por mail/)).toBeVisible()
    expect(screen.queryByText('el calendario')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('en_preparacion: «Revisar de nuevo» pasa a conectar redes cuando cargamos la cuenta', async () => {
    fijarRegistro('en_preparacion')
    montar()
    const usuario = userEvent.setup()
    await usuario.click(await screen.findByRole('button', { name: 'Revisar de nuevo' }))
    expect(screen.getByRole('heading', { name: 'Estamos preparando tu cuenta' })).toBeVisible()
    cargarCuentaDeZernio()
    await usuario.click(screen.getByRole('button', { name: 'Revisar de nuevo' }))
    expect(await screen.findByRole('heading', { name: 'Conectá tus redes' })).toBeVisible()
  })

  it('sin_redes: «Conectá tus redes» con Instagram y TikTok', async () => {
    fijarRegistro('sin_redes')
    montar()
    expect(await screen.findByRole('heading', { name: 'Conectá tus redes' })).toBeVisible()
    expect(await screen.findByRole('button', { name: 'Conectar Instagram' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Conectar TikTok' })).toBeEnabled()
    expect(screen.queryByText('el calendario')).toBeNull()
  })

  it('activo: el calendario de siempre, sin pantallas de entrada', async () => {
    fijarRegistro('activo')
    montar()
    expect(await screen.findByText('el calendario')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Salir' })).toBeNull()
  })

  it('un error al cargar la cuenta ofrece reintentar', async () => {
    let falla = true
    server.use(
      http.get('*/api/yo', () =>
        falla
          ? HttpResponse.json({ detalle: 'x' }, { status: 500 })
          : HttpResponse.json({ comercio: null }),
      ),
    )
    montar()
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar tu cuenta')
    falla = false
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('heading', { name: 'Te damos la bienvenida' })).toBeVisible()
  })

  it('un 401 de /api/yo cierra la sesión y vuelve al ingreso, con la caché vacía', async () => {
    server.use(http.get('*/api/yo', () => HttpResponse.json({ detalle: 'x' }, { status: 401 })))
    const consultas = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    consultas.setQueryData(['calendario', '2026-11'], { de: 'otro usuario' })
    render(
      <QueryClientProvider client={consultas}>
        <Acceso clave="pk_test_de_prueba">
          <Entrada>
            <p>el calendario</p>
          </Entrada>
        </Acceso>
      </QueryClientProvider>,
    )
    expect(await screen.findByTestId('clerk-sign-in')).toBeInTheDocument()
    expect(clerkPrueba.signOut).toHaveBeenCalledTimes(1)
    expect(screen.getByText(/Tu sesión venció/)).toBeInTheDocument()
    expect(consultas.getQueryData(['calendario', '2026-11'])).toBeUndefined()
  })

  it('«Salir» cierra la sesión', async () => {
    fijarRegistro('en_preparacion')
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Salir' }))
    expect(clerkPrueba.signOut).toHaveBeenCalledTimes(1)
  })
})

describe('Entrada: al volver del OAuth', () => {
  beforeEach(() => vi.mocked(irA).mockClear())

  it('sincroniza, muestra el resultado y después deja ir al calendario', async () => {
    fijarRegistro('sin_redes')
    iniciarConexion('instagram', null)
    marcarConexionEnCurso('instagram', false)
    montar()
    expect(await screen.findByText('Listo: conectamos tu red.')).toBeVisible()
    // Ya está activa, pero se muestra el resultado hasta que el usuario sigue.
    expect(screen.queryByText('el calendario')).toBeNull()
    await userEvent.click(await screen.findByRole('button', { name: 'Ir al calendario' }))
    expect(await screen.findByText('el calendario')).toBeInTheDocument()
  })

  it('con una cuenta activa que reconectó una red también muestra el resultado', async () => {
    fijarRegistro('activo')
    marcarParaReconectar('instagram')
    iniciarConexion('instagram', 'red-ig')
    marcarConexionEnCurso('instagram', true)
    montar()
    expect(await screen.findByText('Listo: volvimos a conectar tu red.')).toBeVisible()
    await userEvent.click(await screen.findByRole('button', { name: 'Ir al calendario' }))
    expect(await screen.findByText('el calendario')).toBeInTheDocument()
  })

  it('si el usuario canceló, lo dice y no ofrece seguir sin redes', async () => {
    fijarRegistro('sin_redes')
    window.history.replaceState(null, '', '/?error=access_denied')
    montar()
    expect(await screen.findByText(/No se conectó la red: cancelaste/)).toBeVisible()
    await waitFor(() => expect(window.location.search).toBe(''))
    expect(screen.queryByRole('button', { name: 'Ir al calendario' })).toBeNull()
    expect(await screen.findByRole('button', { name: 'Conectar Instagram' })).toBeEnabled()
  })
})

describe('Entrada: pasos extra (punto de extensión del cuestionario)', () => {
  let pasoListo = false
  const PasoPendiente: PasoDeEntrada = ({ comercio, children }) =>
    pasoListo ? children : <p>Paso extra de {comercio.nombre}</p>
  afterEach(() => {
    pasoListo = false
  })

  it('sin pasos (hoy) no cambia nada', async () => {
    fijarRegistro('activo')
    montar([])
    expect(await screen.findByText('el calendario')).toBeInTheDocument()
  })

  it('un paso pendiente va después de la bienvenida y antes del estado de la cuenta', async () => {
    fijarRegistro('en_preparacion')
    montar([PasoPendiente])
    expect(await screen.findByText('Paso extra de Casa Álamo')).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Estamos preparando tu cuenta' })).toBeNull()
  })

  it('con el paso completo sigue la pantalla del estado', async () => {
    fijarRegistro('en_preparacion')
    pasoListo = true
    montar([PasoPendiente])
    expect(
      await screen.findByRole('heading', { name: 'Estamos preparando tu cuenta' }),
    ).toBeVisible()
  })

  it('sin comercio la bienvenida va primero: los pasos no se ven', async () => {
    fijarRegistro('sin_comercio')
    montar([PasoPendiente])
    expect(await screen.findByRole('heading', { name: 'Te damos la bienvenida' })).toBeVisible()
    expect(screen.queryByText(/Paso extra/)).toBeNull()
  })
})
