import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { useState } from 'react'
import { server } from '@/mocks/server'
import { SelectorRed } from './SelectorRed'

function Controlado({ inicial, disabled }: { inicial?: string; disabled?: boolean }) {
  const [valor, setValor] = useState<string | undefined>(inicial)
  return (
    <>
      <SelectorRed valor={valor} onChange={setValor} disabled={disabled} />
      <output data-testid="valor">{valor ?? 'nada'}</output>
    </>
  )
}

function montar(ui: React.ReactElement) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {ui}
    </QueryClientProvider>,
  )
}

describe('SelectorRed', () => {
  it('lista las redes con su nombre y usuario, sin ninguna elegida', async () => {
    montar(<Controlado />)
    const grupo = await screen.findByRole('radiogroup', { name: 'Red' })
    expect(grupo).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Instagram @casa\.alamo/ })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: /TikTok @casa\.alamo/ })).not.toBeChecked()
  })

  it('elige con el click', async () => {
    montar(<Controlado />)
    await userEvent.click(await screen.findByRole('radio', { name: /TikTok/ }))
    expect(screen.getByTestId('valor')).toHaveTextContent('red-tt')
    expect(screen.getByRole('radio', { name: /TikTok/ })).toBeChecked()
  })

  it('elige con el teclado: Tab entra al grupo y las flechas cambian la red', async () => {
    montar(<Controlado inicial="red-ig" />)
    await screen.findByRole('radiogroup')
    await userEvent.tab()
    expect(screen.getByRole('radio', { name: /Instagram/ })).toHaveFocus()
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByTestId('valor')).toHaveTextContent('red-tt')
    expect(screen.getByRole('radio', { name: /TikTok/ })).toBeChecked()
  })

  it('avisa si la conexión tiene problemas pero deja elegirla igual', async () => {
    server.use(
      http.get('*/api/redes', () =>
        HttpResponse.json([
          { id: 'red-ig', red: 'instagram', username: 'casa.alamo', salud: 'healthy' },
          { id: 'red-tt', red: 'tiktok', username: 'casa.alamo', salud: 'expired' },
        ]),
      ),
    )
    montar(<Controlado />)
    const tiktok = await screen.findByRole('radio', { name: /TikTok/ })
    expect(tiktok).toHaveAccessibleDescription(/La conexión tiene problemas/)
    expect(screen.getByRole('radio', { name: /Instagram/ })).not.toHaveAccessibleDescription()
    await userEvent.click(tiktok)
    expect(screen.getByTestId('valor')).toHaveTextContent('red-tt')
  })

  it('una red sin salud medida (null) no muestra aviso', async () => {
    server.use(
      http.get('*/api/redes', () =>
        HttpResponse.json([{ id: 'red-ig', red: 'instagram', username: 'x', salud: null }]),
      ),
    )
    montar(<Controlado />)
    expect(
      await screen.findByRole('radio', { name: /Instagram @x/ }),
    ).not.toHaveAccessibleDescription()
  })

  it('deshabilitado no deja elegir', async () => {
    montar(<Controlado disabled />)
    const ig = await screen.findByRole('radio', { name: /Instagram/ })
    expect(ig).toBeDisabled()
    await userEvent.click(ig)
    expect(screen.getByTestId('valor')).toHaveTextContent('nada')
  })

  it('muestra el estado de carga mientras espera', () => {
    montar(<Controlado />)
    expect(screen.getByRole('status', { name: 'Cargando redes' })).toBeInTheDocument()
  })

  it('sin redes conectadas lo dice', async () => {
    server.use(http.get('*/api/redes', () => HttpResponse.json([])))
    montar(<Controlado />)
    expect(await screen.findByText('Todavía no hay redes conectadas.')).toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })

  it('un 503 muestra el error y deja reintentar, y al reintentar carga', async () => {
    let intentos = 0
    server.use(
      http.get('*/api/redes', () => {
        intentos += 1
        return intentos === 1
          ? HttpResponse.json({ detalle: 'caído' }, { status: 503 })
          : HttpResponse.json([{ id: 'red-ig', red: 'instagram', username: 'x', salud: 'healthy' }])
      }),
    )
    montar(<Controlado />)
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar tus redes.')
    await userEvent.click(screen.getByRole('button', { name: /Reintentar/ }))
    expect(await screen.findByRole('radio', { name: /Instagram @x/ })).toBeInTheDocument()
  })

  it('un 404 muestra el error y deja reintentar', async () => {
    server.use(
      http.get('*/api/redes', () =>
        HttpResponse.json({ detalle: 'No encontrado' }, { status: 404 }),
      ),
    )
    montar(<Controlado />)
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar tus redes.')
    expect(screen.getByRole('button', { name: /Reintentar/ })).toBeInTheDocument()
  })

  it('un 401 o un 403 no ofrecen reintentar', async () => {
    server.use(http.get('*/api/redes', () => HttpResponse.json({ detalle: 'x' }, { status: 403 })))
    montar(<Controlado />)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Tu usuario todavía no tiene un comercio asignado.',
    )
    expect(screen.queryByRole('button', { name: /Reintentar/ })).not.toBeInTheDocument()
  })
})
