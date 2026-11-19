import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { irA } from '@/lib/navegar'
import { fijarRegistro, iniciarConexion, marcarParaReconectar } from '@/mocks/registro'
import { server } from '@/mocks/server'
import { ConectarRedes } from './ConectarRedes'
import { leerRetorno, limpiarRetorno, marcarConexionEnCurso, type Retorno } from './retorno'

vi.mock('@/lib/navegar', () => ({ irA: vi.fn() }))

function montar(props: Parameters<typeof ConectarRedes>[0] = {}) {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ConectarRedes {...props} />
    </QueryClientProvider>,
  )
}

const volvio: Retorno = { error: null, reconectando: false }

describe('ConectarRedes', () => {
  beforeEach(() => {
    vi.mocked(irA).mockClear()
    fijarRegistro('sin_redes')
  })

  it('sin redes ofrece conectar Instagram y TikTok', async () => {
    montar()
    expect(await screen.findByRole('button', { name: 'Conectar Instagram' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Conectar TikTok' })).toBeEnabled()
    expect(screen.getByRole('heading', { name: 'Conectá tus redes' })).toBeInTheDocument()
  })

  it('conectar pide la authUrl, anota la conexión en curso y manda al navegador ahí', async () => {
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Conectar Instagram' }))
    await waitFor(() => expect(irA).toHaveBeenCalledWith(`${window.location.origin}/`))
    expect(leerRetorno()).toEqual({ error: null, reconectando: false })
  })

  it('manda reconectarRedId null al conectar una red nueva', async () => {
    let cuerpo: unknown
    server.use(
      http.post('*/api/conexion/redes/tiktok', async ({ request }) => {
        cuerpo = await request.json()
        return HttpResponse.json({ authUrl: 'https://zernio.test/auth' })
      }),
    )
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Conectar TikTok' }))
    await waitFor(() => expect(irA).toHaveBeenCalledWith('https://zernio.test/auth'))
    expect(cuerpo).toEqual({ reconectarRedId: null })
  })

  it('una red que hay que reconectar ofrece reconectarla con su id', async () => {
    fijarRegistro('activo')
    marcarParaReconectar('instagram')
    let cuerpo: unknown
    server.use(
      http.post('*/api/conexion/redes/instagram', async ({ request }) => {
        cuerpo = await request.json()
        return HttpResponse.json({ authUrl: 'https://zernio.test/reauth' })
      }),
    )
    montar()
    expect(await screen.findByText('Hay que reconectarla')).toBeInTheDocument()
    expect(screen.getByText('@casaalamo')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reconectar Instagram' }))
    await waitFor(() => expect(irA).toHaveBeenCalledWith('https://zernio.test/reauth'))
    expect(cuerpo).toEqual({ reconectarRedId: 'red-ig' })
    expect(leerRetorno()?.reconectando).toBe(true)
  })

  it('una red conectada muestra su usuario y no ofrece conectarla de nuevo', async () => {
    fijarRegistro('activo')
    montar()
    expect(await screen.findByText('@casaalamo')).toBeInTheDocument()
    expect(screen.getByText('Conectada')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Conectar Instagram' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Conectar TikTok' })).toBeInTheDocument()
  })

  it('si la cuenta todavía se está preparando muestra el mensaje del backend (409)', async () => {
    fijarRegistro('en_preparacion')
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Conectar Instagram' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Tu cuenta todavía se está preparando',
    )
    expect(irA).not.toHaveBeenCalled()
  })

  it('un error inesperado al conectar muestra un mensaje genérico y deja reintentar', async () => {
    server.use(
      http.post('*/api/conexion/redes/instagram', () =>
        HttpResponse.json({ detalle: 'boom' }, { status: 500 }),
      ),
    )
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Conectar Instagram' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos abrir la conexión')
    expect(screen.getByRole('button', { name: 'Conectar Instagram' })).toBeEnabled()
  })

  it('si no cargan las redes ofrece reintentar', async () => {
    let falla = true
    server.use(
      http.get('*/api/conexion/redes', () =>
        falla
          ? HttpResponse.json({ detalle: 'x' }, { status: 500 })
          : HttpResponse.json({ redes: [], plataformasFaltantes: ['instagram', 'tiktok'] }),
      ),
    )
    montar()
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar tus redes')
    falla = false
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('button', { name: 'Conectar Instagram' })).toBeInTheDocument()
  })

  describe('al volver del OAuth', () => {
    it('sincroniza, muestra la red nueva y deja ir al calendario', async () => {
      iniciarConexion('instagram', null) // el usuario autorizó en Zernio
      const alContinuar = vi.fn()
      montar({ retorno: volvio, onContinuar: alContinuar })
      expect(await screen.findByText('Listo: conectamos tu red.')).toBeInTheDocument()
      expect(await screen.findByText('@instagram.demo')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Ir al calendario' }))
      expect(alContinuar).toHaveBeenCalledTimes(1)
    })

    it('mientras sincroniza avisa que está verificando', () => {
      montar({ retorno: volvio })
      expect(screen.getByText('Verificando tu conexión…')).toBeInTheDocument()
    })

    it('si el usuario canceló lo dice y deja intentarlo de nuevo', async () => {
      montar({ retorno: { error: 'cancelada', reconectando: false }, onContinuar: vi.fn() })
      expect(await screen.findByText(/No se conectó la red: cancelaste/)).toBeInTheDocument()
      expect(await screen.findByRole('button', { name: 'Conectar Instagram' })).toBeEnabled()
      expect(screen.queryByRole('button', { name: 'Ir al calendario' })).toBeNull()
    })

    it('si no hay redes nuevas (y no hubo error) lo avisa', async () => {
      montar({ retorno: volvio })
      expect(await screen.findByText(/No encontramos redes nuevas/)).toBeInTheDocument()
    })

    it('una reconexión exitosa dice que se volvió a conectar', async () => {
      fijarRegistro('activo')
      marcarParaReconectar('instagram')
      iniciarConexion('instagram', 'red-ig')
      montar({ retorno: { error: null, reconectando: true } })
      expect(await screen.findByText('Listo: volvimos a conectar tu red.')).toBeInTheDocument()
    })

    it('si sincronizar falla ofrece reintentar y reintenta', async () => {
      let falla = true
      iniciarConexion('instagram', null)
      server.use(
        http.post('*/api/conexion/redes/sincronizar', () =>
          falla
            ? HttpResponse.json({ detalle: 'x' }, { status: 502 })
            : HttpResponse.json({ nuevas: 0, redes: [] }),
        ),
      )
      montar({ retorno: volvio })
      expect(await screen.findByText('No pudimos verificar tu conexión.')).toBeInTheDocument()
      falla = false
      await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
      expect(await screen.findByText(/No encontramos redes nuevas/)).toBeInTheDocument()
    })

    it('sincroniza una sola vez y limpia el rastro', async () => {
      marcarConexionEnCurso('instagram', false)
      let llamadas = 0
      server.use(
        http.post('*/api/conexion/redes/sincronizar', () => {
          llamadas += 1
          return HttpResponse.json({ nuevas: 0, redes: [] })
        }),
      )
      montar({ retorno: leerRetorno() })
      await screen.findByText(/No encontramos redes nuevas/)
      expect(llamadas).toBe(1)
      expect(leerRetorno()).toBeNull()
    })
  })
})

describe('retorno', () => {
  it('sin rastro ni error no hay vuelta', () => {
    expect(leerRetorno()).toBeNull()
  })

  it('el rastro de una conexión en curso es una vuelta, y limpiar la borra', () => {
    marcarConexionEnCurso('tiktok', false)
    expect(leerRetorno()).toEqual({ error: null, reconectando: false })
    limpiarRetorno()
    expect(leerRetorno()).toBeNull()
  })

  it('un error en la URL es una vuelta cancelada y limpiar deja la URL sin él', () => {
    window.history.replaceState(null, '', '/?error=access_denied&otro=1')
    expect(leerRetorno()).toEqual({ error: 'cancelada', reconectando: false })
    limpiarRetorno()
    expect(window.location.search).toBe('?otro=1')
    window.history.replaceState(null, '', '/')
  })
})
