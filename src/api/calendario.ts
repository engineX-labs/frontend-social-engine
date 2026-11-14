import { queryOptions, useQuery } from '@tanstack/react-query'
import type { CalendarioMes, Item } from '@/domain/types'
import { apiFetch } from './http'

export const calendarioQuery = (mes: string) =>
  queryOptions({
    queryKey: ['calendario', mes],
    queryFn: () => apiFetch<CalendarioMes>('/api/calendario', { params: { mes } }),
    staleTime: 60_000,
  })

export const itemQuery = (id: string) =>
  queryOptions({
    queryKey: ['item', id],
    queryFn: () => apiFetch<Item>(`/api/items/${encodeURIComponent(id)}`),
    staleTime: 60_000,
  })

export const useCalendario = (mes: string) => useQuery(calendarioQuery(mes))
export const useItem = (id: string | undefined) =>
  useQuery({ ...itemQuery(id ?? ''), enabled: Boolean(id) })
