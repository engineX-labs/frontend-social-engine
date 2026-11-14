import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { createMemoryHistory } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { crearRouter } from '@/router'
import { validarCalendarioSearch } from './search'

function montar(ruta = '/') {
  const router = crearRouter(createMemoryHistory({ initialEntries: [ruta] }))
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('shell', () => {
  it('muestra el calendario en / y navega al chat', async () => {
    montar('/')
    expect(await screen.findByRole('heading', { name: 'Calendario' })).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('link', { name: /Fidel/ })[0]!)
    expect(await screen.findByRole('heading', { name: 'Fidel' })).toBeInTheDocument()
  })
  it('alterna el tema y lo fija en el documento', async () => {
    montar('/')
    await userEvent.click(await screen.findByRole('button', { name: /modo claro y oscuro/ }))
    expect(['light', 'dark']).toContain(document.documentElement.dataset.theme)
  })
})

describe('validarCalendarioSearch', () => {
  it('descarta valores inválidos', () => {
    expect(
      validarCalendarioSearch({ mes: '2026-13', dia: 'x', item: '', ocultar: ['idea', 'raro'] }),
    ).toEqual({
      ocultar: ['idea'],
    })
  })
  it('acepta valores válidos', () => {
    expect(validarCalendarioSearch({ mes: '2026-11', dia: '2026-11-14', item: 'pub-1' })).toEqual({
      mes: '2026-11',
      dia: '2026-11-14',
      item: 'pub-1',
    })
  })
})

describe('validarCalendarioSearch: días reales', () => {
  it('rechaza fechas inexistentes', () => {
    expect(validarCalendarioSearch({ dia: '2026-02-31' })).toEqual({})
    expect(validarCalendarioSearch({ dia: '2026-02-28' })).toEqual({ dia: '2026-02-28' })
  })
})
