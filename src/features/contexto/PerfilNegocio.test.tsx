import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { configurarPerfilMock, PREGUNTAS_MOCK, perfilListoMock } from '@/mocks/contexto'
import { server } from '@/mocks/server'
import { crearRouter } from '@/router'

function montar(ruta: string) {
  const router = crearRouter(createMemoryHistory({ initialEntries: [ruta] }))
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

const respuestas = (extra: object = {}) =>
  server.use(
    http.get('*/api/contexto', () =>
      HttpResponse.json({
        version: 1,
        estado: 'completo',
        preguntas: PREGUNTAS_MOCK,
        respuestas: { rubro: 'gastronomia', objetivo: 'whatsapp', ...extra },
      }),
    ),
  )

describe('Perfil de marca', () => {
  it('muestra las respuestas con sus etiquetas, lo no respondido y el perfil de marca', async () => {
    respuestas({ que_puede_producir: ['fotos_producto', 'carruseles'], tono: 'Rioplatense' })
    configurarPerfilMock({ perfil: perfilListoMock() })
    montar('/perfil')
    expect(
      await screen.findByRole('heading', { name: 'Perfil de marca', level: 1 }),
    ).toBeInTheDocument()
    const lista = await screen.findByText('¿Cuál es el rubro?')
    const bloque = lista.closest('dl')!
    expect(within(bloque).getByText('Gastronomía')).toBeInTheDocument()
    expect(within(bloque).getByText('Pedidos o reservas por WhatsApp')).toBeInTheDocument()
    expect(within(bloque).getByText('Fotos de producto, Carruseles con texto')).toBeInTheDocument()
    expect(within(bloque).getByText('Rioplatense')).toBeInTheDocument()
    expect(within(bloque).getAllByText('Sin responder').length).toBeGreaterThan(0)
    expect(await screen.findByLabelText('Tono')).toBeInTheDocument()
  })

  it('edita las respuestas y las guarda', async () => {
    respuestas()
    let cuerpo: unknown
    server.use(
      http.put('*/api/contexto', async ({ request }) => {
        cuerpo = await request.json()
        return HttpResponse.json({
          version: 1,
          estado: 'completo',
          preguntas: PREGUNTAS_MOCK,
          respuestas: (cuerpo as { respuestas: object }).respuestas,
        })
      }),
    )
    montar('/perfil')
    await userEvent.click(await screen.findByRole('button', { name: 'Editar respuestas' }))
    expect(screen.getByRole('radio', { name: 'Pedidos o reservas por WhatsApp' })).toBeChecked()
    await userEvent.click(screen.getByRole('radio', { name: 'Vender online' }))
    await userEvent.type(
      screen.getByRole('textbox', { name: '¿En qué zona o ciudad estás?' }),
      'Palermo',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Guardar respuestas' }))
    expect(await screen.findByText('Guardamos tus respuestas.')).toBeInTheDocument()
    expect(cuerpo).toEqual({
      respuestas: { rubro: 'gastronomia', objetivo: 'venta_online', zona: 'Palermo' },
    })
    expect(screen.getByText('Palermo')).toBeInTheDocument()
    expect(screen.getByText('Vender online')).toBeInTheDocument()
  })

  it('un 422 se muestra en su pregunta y deja seguir editando', async () => {
    respuestas()
    server.use(
      http.put('*/api/contexto', () =>
        HttpResponse.json(
          { detalle: 'Hay respuestas inválidas', problemas: { zona: 'Máximo 80 caracteres' } },
          { status: 422 },
        ),
      ),
    )
    montar('/perfil')
    await userEvent.click(await screen.findByRole('button', { name: 'Editar respuestas' }))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar respuestas' }))
    const zona = await screen.findByRole('textbox', { name: '¿En qué zona o ciudad estás?' })
    expect(zona).toBeInvalid()
    expect(await screen.findByRole('alert')).toHaveTextContent('Máximo 80 caracteres')
    expect(screen.getByRole('button', { name: 'Guardar respuestas' })).toBeEnabled()
  })

  it('cancelar vuelve a la lista sin guardar; si falta el cuestionario ofrece completarlo', async () => {
    montar('/perfil')
    expect(await screen.findByRole('button', { name: 'Completar respuestas' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Completar respuestas' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('button', { name: 'Guardar respuestas' })).toBeNull()
  })

  it('está en el menú del usuario y lleva a /perfil', async () => {
    const router = montar('/')
    await userEvent.click(await screen.findByRole('button', { name: 'Perfil de marca' }))
    expect(
      await screen.findByRole('heading', { name: 'Perfil de marca', level: 1 }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/perfil')
  })
})
