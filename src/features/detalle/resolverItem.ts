import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { programadaQuery, usePublicacionDisponible } from '@/api/publicacion'
import type { CalendarioMes, Programada } from '@/domain/types'

/** Qué es lo que abre `?item=<id>`: una pieza guardada desde la app, otra cosa, o todavía no se sabe. */
export type Resolucion =
  { tipo: 'programada'; pieza: Programada } | { tipo: 'otro' } | { tipo: 'cargando' }

/**
 * Busca el id en lo que ya está en memoria (calendario, listas de piezas, una pieza pedida antes): así
 * abrir algo desde el calendario no necesita preguntar nada y no hay parpadeo. `undefined` = no se sabe.
 */
export function buscarEnCache(
  queryClient: QueryClient,
  id: string,
): Programada | 'otro' | undefined {
  for (const [, mes] of queryClient.getQueriesData<CalendarioMes>({ queryKey: ['calendario'] })) {
    if (!mes) continue
    const pieza = mes.programadas?.find((p) => p.id === id)
    if (pieza) return pieza
    if (mes.publicadas?.some((p) => p.id === id) || mes.ideas?.some((i) => i.id === id))
      return 'otro'
  }
  for (const [, lista] of queryClient.getQueriesData<Programada[]>({ queryKey: ['programadas'] })) {
    const pieza = lista?.find((p) => p.id === id)
    if (pieza) return pieza
  }
  return queryClient.getQueryData<Programada>(['programada', id])
}

/**
 * Distingue una pieza guardada desde la app de una publicación o una idea. Con publicar apagado (o el
 * backend en 404) nunca pregunta por piezas: todo es lo de siempre. Una vez que sabe que es una pieza
 * se queda con eso aunque el calendario se vuelva a pedir (por ejemplo, al cancelarla).
 */
export function useResolverItem(id: string): Resolucion {
  const queryClient = useQueryClient()
  const { disponible } = usePublicacionDisponible()
  const conocido = disponible ? buscarEnCache(queryClient, id) : 'otro'
  const consulta = useQuery({
    ...programadaQuery(id),
    enabled: disponible && conocido === undefined,
  })
  const [fijada, setFijada] = useState<{ id: string; pieza: Programada } | null>(null)

  let resuelta: Resolucion
  if (conocido && conocido !== 'otro') resuelta = { tipo: 'programada', pieza: conocido }
  else if (conocido === 'otro') resuelta = { tipo: 'otro' }
  else if (consulta.data) resuelta = { tipo: 'programada', pieza: consulta.data }
  else if (consulta.isPending) resuelta = { tipo: 'cargando' }
  else resuelta = { tipo: 'otro' }

  // Lo fijado es de un id: si `?item=` pasa a otro, se resuelve de nuevo.
  if (resuelta.tipo === 'programada' && fijada?.id !== id) setFijada({ id, pieza: resuelta.pieza })
  if (fijada?.id === id) return { tipo: 'programada', pieza: fijada.pieza }
  return resuelta
}
