import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Contexto, GuardarContexto } from '@/domain/contexto'
import type { PerfilInterpretado, PerfilMarca } from '@/domain/perfilMarca'
import { apiFetch } from './http'

export const claveContexto = ['contexto'] as const
export const clavePerfilMarca = ['perfil-marca'] as const

/** Cada cuánto se consulta el perfil mientras se genera. */
export const INTERVALO_PERFIL_MS = 3000

export const contextoQuery = () =>
  queryOptions({
    queryKey: claveContexto,
    queryFn: () => apiFetch<Contexto>('/api/contexto'),
    staleTime: 60_000,
  })

export const useContexto = () => useQuery(contextoQuery())

export function useGuardarContexto() {
  const consultas = useQueryClient()
  return useMutation({
    mutationFn: (cuerpo: GuardarContexto) =>
      apiFetch<Contexto>('/api/contexto', { method: 'PUT', json: cuerpo }),
    onSuccess: (contexto) => consultas.setQueryData(claveContexto, contexto),
  })
}

/**
 * El perfil de marca. Mientras está `generando` se consulta cada `intervaloMs`; apenas cambia de
 * estado (o la pantalla se desmonta) el intervalo se corta solo, y no corre con la pestaña oculta.
 */
export const perfilMarcaQuery = (intervaloMs = INTERVALO_PERFIL_MS) =>
  queryOptions({
    queryKey: clavePerfilMarca,
    queryFn: () => apiFetch<PerfilMarca>('/api/perfil-marca'),
    staleTime: 30_000,
    refetchInterval: (consulta) =>
      consulta.state.data?.estado === 'generando' ? intervaloMs : false,
    refetchIntervalInBackground: false,
  })

export const usePerfilMarca = (intervaloMs?: number) => useQuery(perfilMarcaQuery(intervaloMs))

export function useGenerarPerfil() {
  const consultas = useQueryClient()
  return useMutation({
    mutationFn: () => apiFetch<PerfilMarca>('/api/perfil-marca/generar', { method: 'POST' }),
    onSuccess: (perfil) => consultas.setQueryData(clavePerfilMarca, perfil),
  })
}

export function useConfirmarPerfil() {
  const consultas = useQueryClient()
  return useMutation({
    mutationFn: (confirmado: PerfilInterpretado) =>
      apiFetch<PerfilMarca>('/api/perfil-marca', { method: 'PUT', json: { confirmado } }),
    onSuccess: (perfil) => consultas.setQueryData(clavePerfilMarca, perfil),
  })
}
