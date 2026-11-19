import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Red } from '@/domain/types'
import { apiFetch } from './http'

/** Estado de la cuenta de un comercio (lo calcula el backend; el front solo lo lee). */
export type EstadoComercio = 'en_preparacion' | 'sin_redes' | 'activo'

export interface ComercioPropio {
  id: string
  nombre: string
  estado: EstadoComercio
}

/** `GET /api/yo`: `comercio` es `null` para un usuario que todavía no hizo la bienvenida. */
export interface Yo {
  comercio: ComercioPropio | null
}

export type EstadoRed = 'conectada' | 'hay_que_reconectar'

export interface RedDeConexion {
  id: string
  plataforma: Red
  username: string
  estado: EstadoRed
}

export interface RedesDeConexion {
  redes: RedDeConexion[]
  plataformasFaltantes: Red[]
}

export interface ResultadoSincronizar {
  nuevas: number
  redes: RedDeConexion[]
}

export const yoQuery = () =>
  queryOptions({
    queryKey: ['yo'],
    queryFn: () => apiFetch<Yo>('/api/yo'),
    staleTime: 30_000,
  })

export const useYo = () => useQuery(yoQuery())

/** `POST /api/comercio`: idempotente (201 si lo crea, 200 si ya existía). */
export function useCrearComercio() {
  const consultas = useQueryClient()
  return useMutation({
    mutationFn: (nombre: string) =>
      apiFetch<ComercioPropio>('/api/comercio', { method: 'POST', json: { nombre } }),
    onSuccess: (comercio) => consultas.setQueryData<Yo>(yoQuery().queryKey, { comercio }),
  })
}

export const redesDeConexionQuery = () =>
  queryOptions({
    queryKey: ['conexion', 'redes'],
    queryFn: () => apiFetch<RedesDeConexion>('/api/conexion/redes'),
    staleTime: 0,
  })

export const useRedesDeConexion = (habilitada = true) =>
  useQuery({ ...redesDeConexionQuery(), enabled: habilitada })

/** `POST /api/conexion/redes/{plataforma}`: la URL de Zernio a la que hay que mandar al navegador. */
export function useIniciarConexion() {
  return useMutation({
    mutationFn: ({ plataforma, reconectarRedId }: { plataforma: Red; reconectarRedId?: string }) =>
      apiFetch<{ authUrl: string }>(`/api/conexion/redes/${plataforma}`, {
        method: 'POST',
        json: { reconectarRedId: reconectarRedId ?? null },
      }),
  })
}

/** `POST /api/conexion/redes/sincronizar`: al volver del OAuth. Refresca las redes y el estado. */
export function useSincronizarRedes() {
  const consultas = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiFetch<ResultadoSincronizar>('/api/conexion/redes/sincronizar', { method: 'POST' }),
    onSuccess: () => {
      void consultas.invalidateQueries({ queryKey: ['conexion'] })
      void consultas.invalidateQueries({ queryKey: ['yo'] })
    },
  })
}
