import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Entrada } from '@/app/Entrada'
import { fijarRegistro } from '@/mocks/registro'
import { server } from '@/mocks/server'

function montar() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <Entrada pasos={[]}>
        <p>el calendario</p>
      </Entrada>
    </QueryClientProvider>,
  )
}

const campo = () => screen.getByLabelText('Key de Zernio')
const boton = () => screen.getByRole('button', { name: 'Conectar mi cuenta de Zernio' })

describe('EnPreparacion: alta de prueba con la key de Zernio', () => {
  beforeEach(() => fijarRegistro('en_preparacion'))

  it('con la bandera apagada no ofrece pegar la key', async () => {
    vi.stubEnv('VITE_ALTA_CON_KEY', '')
    montar()
    expect(
      await screen.findByRole('heading', { name: 'Estamos preparando tu cuenta' }),
    ).toBeVisible()
    expect(screen.queryByLabelText('Key de Zernio')).toBeNull()
  })

  describe('con la bandera prendida', () => {
    beforeEach(() => vi.stubEnv('VITE_ALTA_CON_KEY', 'true'))

    it('el campo es de tipo contraseña y sin autocompletar', async () => {
      montar()
      await screen.findByRole('heading', { name: 'Estamos preparando tu cuenta' })
      expect(campo()).toHaveAttribute('type', 'password')
      expect(campo()).toHaveAttribute('autocomplete', 'off')
    })

    it('una key corta o vacía se marca y no se envía', async () => {
      let pedidos = 0
      server.use(
        http.post('*/api/conexion/cuenta', () => {
          pedidos += 1
          return HttpResponse.json({})
        }),
      )
      montar()
      const usuario = userEvent.setup()
      await screen.findByRole('heading', { name: 'Estamos preparando tu cuenta' })
      await usuario.click(boton())
      expect(await screen.findByRole('alert')).toHaveTextContent('Pegá la key completa.')
      expect(pedidos).toBe(0)
    })

    it('con una key válida manda la key, pasa al calendario y no deja la key en pantalla', async () => {
      let cuerpo: unknown
      server.use(
        http.post('*/api/conexion/cuenta', async ({ request }) => {
          cuerpo = await request.clone().json()
          return HttpResponse.json({ estado: 'activo', redes: [] })
        }),
      )
      montar()
      const usuario = userEvent.setup()
      await screen.findByRole('heading', { name: 'Estamos preparando tu cuenta' })
      await usuario.type(campo(), '  zk_clave_de_prueba_1234 ')
      await usuario.click(boton())
      await waitFor(() => expect(cuerpo).toEqual({ apiKey: 'zk_clave_de_prueba_1234' }))
    })

    it('con el mock completo pasa de «preparando» al calendario', async () => {
      montar()
      const usuario = userEvent.setup()
      await screen.findByRole('heading', { name: 'Estamos preparando tu cuenta' })
      await usuario.type(campo(), 'zk_clave_de_prueba_1234')
      await usuario.click(boton())
      expect(await screen.findByText('el calendario')).toBeVisible()
    })

    it('una key inválida muestra el mensaje del backend, vacía el campo y sigue en «preparando»', async () => {
      montar()
      const usuario = userEvent.setup()
      await screen.findByRole('heading', { name: 'Estamos preparando tu cuenta' })
      await usuario.type(campo(), 'mala_clave_1234')
      await usuario.click(boton())
      expect(await screen.findByRole('alert')).toHaveTextContent('Esa key de Zernio no es válida')
      expect(campo()).toHaveValue('')
      expect(screen.queryByText('el calendario')).toBeNull()
    })

    it('una cuenta de Zernio ya usada muestra el mensaje del backend', async () => {
      montar()
      const usuario = userEvent.setup()
      await screen.findByRole('heading', { name: 'Estamos preparando tu cuenta' })
      await usuario.type(campo(), 'ajena_clave_1234')
      await usuario.click(boton())
      expect(await screen.findByRole('alert')).toHaveTextContent('ya está en uso en otro comercio')
    })

    it('un error del servidor muestra un mensaje genérico, sin detalles', async () => {
      server.use(
        http.post('*/api/conexion/cuenta', () =>
          HttpResponse.json({ detalle: 'Zernio no respondió' }, { status: 502 }),
        ),
      )
      montar()
      const usuario = userEvent.setup()
      await screen.findByRole('heading', { name: 'Estamos preparando tu cuenta' })
      await usuario.type(campo(), 'zk_clave_de_prueba_1234')
      await usuario.click(boton())
      expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos revisar la key')
    })
  })
})
