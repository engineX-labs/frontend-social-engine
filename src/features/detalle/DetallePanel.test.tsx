import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import type { Publicada } from '@/domain/types'
import { buscarItem } from '@/mocks/datos'
import { server } from '@/mocks/server'
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

  it('publicada sin análisis (el backend lo manda vacío hasta S3): no pinta la sección', async () => {
    const base = buscarItem('pub-1') as Publicada
    server.use(http.get('*/api/items/pub-1', () => HttpResponse.json({ ...base, analisis: '' })))
    await montar('/?item=pub-1')
    const d = within(await panel())
    expect(await d.findByText('Alcance')).toBeInTheDocument()
    expect(d.queryByText('Análisis de Fidel')).not.toBeInTheDocument()
    expect(d.getByText('Copy')).toBeInTheDocument()
  })

  it('403 en el detalle: avisa que falta el comercio y no ofrece reintentar', async () => {
    server.use(
      http.get('*/api/items/:id', () =>
        HttpResponse.json({ detalle: 'sin comercio' }, { status: 403 }),
      ),
    )
    await montar('/?item=pub-1')
    const d = within(await panel())
    expect(await d.findByRole('alert')).toHaveTextContent(
      'Tu usuario todavía no tiene un comercio asignado.',
    )
    expect(d.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
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
    expect(await screen.findByText(/Copy copiado/)).toBeInTheDocument()
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

  it('"Preguntarle a Fidel" abre a Fidel con la idea como contexto', async () => {
    const { router } = await montar('/?item=idea-2')
    await userEvent.click(await screen.findByRole('button', { name: /Preguntarle a Fidel/ }))
    // Sin matchMedia (jsdom) el detalle se trata como modal: se cierra para dejar a Fidel a la vista.
    await waitFor(() => expect(router.state.location.search).toEqual({ sobre: 'idea-2' }))
    const barra = await screen.findByRole('complementary', { name: 'Fidel' })
    expect(await within(barra).findByTestId('contexto-texto')).toHaveTextContent(/^Idea:/)
  })
})

describe('DetallePanel: regresiones del review', () => {
  it('idea sin propuestas no ofrece copiar un copy vacío', async () => {
    const { server } = await import('@/mocks/server')
    const { http, HttpResponse } = await import('msw')
    server.use(
      http.get('*/api/items/:id', () =>
        HttpResponse.json({
          tipo: 'idea',
          id: 'idea-x',
          red: 'instagram',
          fecha: '2026-11-17T22:00:00.000Z',
          formato: 'Foto',
          ideaPortada: 'Luz natural',
          copyPropuestas: [],
          porQue: ['a', 'a'],
        }),
      ),
    )
    await montar('/?item=idea-x')
    const d = within(await panel())
    expect(await d.findByRole('button', { name: /Copiar copy/ })).toBeDisabled()
    expect(d.queryByText(/de 0/)).not.toBeInTheDocument()
  })
})
