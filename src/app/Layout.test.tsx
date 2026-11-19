import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { createMemoryHistory } from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { crearRouter } from '@/router'
import { validarCalendarioSearch } from './search'

function montar(ruta = '/') {
  const router = crearRouter(createMemoryHistory({ initialEntries: [ruta] }))
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

const barra = () => screen.findByRole('complementary', { name: 'Fidel' })

describe('shell', () => {
  it('un solo dashboard: calendario y Fidel en la barra lateral, sin navegación de secciones', async () => {
    montar('/')
    expect(await screen.findByRole('heading', { name: 'Calendario' })).toBeInTheDocument()
    expect(within(await barra()).getByText('Hola, soy Fidel')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Secciones' })).toBeNull()
  })

  it('la barra se pliega a un riel, se vuelve a abrir y conserva la conversación', async () => {
    montar('/')
    const b = within(await barra())
    await userEvent.type(b.getByRole('textbox'), '¿A qué hora me conviene publicar?{Enter}')
    expect(await b.findByText(/De 18 a 22 h tu mediana/)).toBeInTheDocument()
    await userEvent.click(b.getByRole('button', { name: 'Plegar a Fidel' }))
    expect(b.queryByRole('textbox')).toBeNull()
    expect(localStorage.getItem('fidel:abierto')).toBe('0')
    await userEvent.click(b.getByRole('button', { name: 'Abrir a Fidel' }))
    expect(await b.findByText(/De 18 a 22 h tu mediana/)).toBeInTheDocument()
  })

  it('el borde ajusta el ancho con teclado, dentro de los límites', async () => {
    montar('/')
    const borde = within(await barra()).getByRole('separator', { name: /Ancho de la barra/ })
    expect(borde).toHaveAttribute('aria-valuenow', '400')
    fireEvent.keyDown(borde, { key: 'ArrowRight' })
    expect(borde).toHaveAttribute('aria-valuenow', '416')
    fireEvent.keyDown(borde, { key: 'End' })
    expect(borde).toHaveAttribute('aria-valuenow', '560')
    fireEvent.keyDown(borde, { key: 'ArrowRight' })
    expect(borde).toHaveAttribute('aria-valuenow', '560')
    fireEvent.doubleClick(borde)
    expect(borde).toHaveAttribute('aria-valuenow', '400')
  })

  it('/chat?item= redirige al calendario con Fidel abierto sobre ese ítem', async () => {
    const router = montar('/chat?item=pub-1')
    expect(await within(await barra()).findByText(/Reel del 5 nov/)).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(router.state.location.search).toEqual({ sobre: 'pub-1' })
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

describe('shell en el celular', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
  })
  afterEach(() => vi.unstubAllGlobals())

  it('el botón flotante abre a Fidel como hoja y Escape la cierra', async () => {
    montar('/')
    await screen.findByRole('heading', { name: 'Calendario' })
    expect(screen.queryByRole('complementary', { name: 'Fidel' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Hablar con Fidel' }))
    const hoja = await screen.findByRole('dialog', { name: 'Chat con Fidel' })
    expect(within(hoja).getByText('Hola, soy Fidel')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Chat con Fidel' })).toBeNull())
  })
})
