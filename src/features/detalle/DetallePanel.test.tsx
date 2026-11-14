import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { crearRouter } from '@/router'

async function montar(ruta: string) {
  const history = createMemoryHistory({ initialEntries: [ruta] })
  const router = crearRouter(history)
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  await router.load()
  return { router, history }
}

const panel = () => screen.findByRole('dialog')

describe('DetallePanel', () => {
  it('no se renderiza sin ?item', async () => {
    await montar('/')
    await screen.findByRole('heading', { name: 'Calendario' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('publicada: muestra resultado, comparación y análisis', async () => {
    await montar('/?item=pub-1')
    const d = within(await panel())
    expect(await d.findByText('Alcance')).toBeInTheDocument()
    // El alcance aparece en el resultado y, cuando carga el mes, también en la barra comparativa.
    expect(d.getAllByText('3.980').length).toBeGreaterThan(0)
    expect(await d.findByText(/× tu mediana/)).toBeInTheDocument()
    expect(d.getByText(/Puesto 1 de/)).toBeInTheDocument()
    expect(d.getByText('Análisis de Fidel')).toBeInTheDocument()
    expect(d.getByText(/llegó a .* veces tu mediana/)).toBeInTheDocument()
  })

  it('idea: rota propuestas y despliega "Por qué"', async () => {
    await montar('/?item=idea-1')
    const d = within(await panel())
    expect(await d.findByText('1 de 3')).toBeInTheDocument()
    expect(d.getByText(/Cinco looks para la semana, uno por día\. Deslizá y elegí/)).toBeVisible()
    await userEvent.click(d.getByRole('button', { name: 'Otra propuesta' }))
    expect(d.getByText('2 de 3')).toBeInTheDocument()
    expect(d.getByText(/Lo nuevo de la semana en una sola mirada/)).toBeInTheDocument()
    expect(d.queryByText(/Cinco looks para la semana/)).not.toBeInTheDocument()
    const resumen = d.getByText('Por qué esta propuesta')
    expect(resumen.closest('details')).not.toHaveAttribute('open')
    await userEvent.click(resumen)
    expect(resumen.closest('details')).toHaveAttribute('open')
    expect(d.queryByRole('button', { name: /Aprobar|Programar|Quitar/ })).not.toBeInTheDocument()
  })

  it('"Copiar copy" avisa que se copió', async () => {
    const user = userEvent.setup()
    await montar('/?item=idea-1')
    const d = within(await panel())
    await user.click(await d.findByRole('button', { name: 'Copiar copy' }))
    expect(await d.findByText('Copiado')).toBeInTheDocument()
    expect(await navigator.clipboard.readText()).toMatch(/Cinco looks/)
  })

  it('el botón cerrar quita item y conserva el resto de los params', async () => {
    const { router } = await montar('/?mes=2026-11&item=pub-1')
    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar detalle' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(router.state.location.search).toEqual({ mes: '2026-11' })
  })

  it('Escape cierra el panel', async () => {
    const { router } = await montar('/?item=pub-1')
    await panel()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(router.state.location.search).toEqual({})
  })

  it('enfoca el botón cerrar al abrir', async () => {
    await montar('/?item=pub-1')
    await panel()
    expect(screen.getByRole('button', { name: 'Cerrar detalle' })).toHaveFocus()
  })

  it('un id inexistente muestra un error', async () => {
    await montar('/?item=nada')
    expect(await screen.findByRole('alert')).toHaveTextContent(/No encontramos/)
  })

  it('"Preguntarle a Fidel" navega a /chat?item=', async () => {
    const { router } = await montar('/?item=idea-2')
    await userEvent.click(await screen.findByRole('link', { name: /Preguntarle a Fidel/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/chat'))
    expect(router.state.location.search).toEqual({ item: 'idea-2' })
  })
})
