import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useCalendario, useItem } from './calendario'

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

describe('API de calendario (mock MSW)', () => {
  it('devuelve publicadas, ideas y resumen del mes', async () => {
    const { result } = renderHook(() => useCalendario('2026-11'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const d = result.current.data!
    expect(d.mes).toBe('2026-11')
    expect(d.publicadas.length).toBeGreaterThan(0)
    expect(d.ideas).toHaveLength(3)
    expect(d.resumen.medianaAlcance).toBeGreaterThan(0)
  })
  it('un mes sin datos viene vacío', async () => {
    const { result } = renderHook(() => useCalendario('2027-03'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.publicadas).toEqual([])
  })
  it('busca un item por id y falla con 404 si no existe', async () => {
    const ok = renderHook(() => useItem('pub-1'), { wrapper })
    await waitFor(() => expect(ok.result.current.isSuccess).toBe(true))
    expect(ok.result.current.data?.tipo).toBe('publicada')
    const mal = renderHook(() => useItem('nada'), { wrapper })
    await waitFor(() => expect(mal.result.current.isError).toBe(true))
  })
})
