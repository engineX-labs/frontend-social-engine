import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { publicacionHabilitada } from '@/app/publicacion'
import type {
  Medio,
  OpcionesTikTok,
  OpcionesTikTokRed,
  Programada,
  RedConectada,
  SubidaMedio,
  TipoPieza,
} from '@/domain/types'
import { apiFetch, ApiError } from './http'

/** Cuerpo de `POST /api/programadas`. */
export interface NuevaProgramada {
  /** uuid v4, uno por envío del formulario: repetirlo no crea otra pieza ni publica dos veces. */
  id?: string
  redId: string
  accion: 'borrador' | 'programar' | 'publicar_ahora'
  tipo: TipoPieza
  texto?: string | null
  medios: Medio[]
  /** URL de una imagen ya subida (solo reel y video); `null` o ausente = sin portada elegida. */
  portadaUrl?: string | null
  /** ISO 8601 en UTC (o con zona). */
  programadaPara?: string | null
  opciones?: OpcionesTikTok | null
}

/** Cuerpo de `PATCH /api/programadas/{id}`: solo los campos que cambian. */
export interface CambiosProgramada {
  /** `guardar` (por defecto) también reprograma: se manda con otra `programadaPara`. */
  accion?: 'guardar' | 'programar' | 'publicar_ahora'
  tipo?: TipoPieza
  texto?: string | null
  medios?: Medio[]
  /** `null` quita la portada elegida. */
  portadaUrl?: string | null
  programadaPara?: string | null
  opciones?: OpcionesTikTok | null
}

export interface PedidoSubida {
  nombre: string
  contentType: string
  tamanio: number
}

/** Un id nuevo para un envío. Se conserva si el pedido falla por red y se renueva con «Id en uso». */
export function nuevoIdDePieza(): string {
  return crypto.randomUUID()
}

export const redesQuery = () =>
  queryOptions({
    queryKey: ['redes'],
    queryFn: () => apiFetch<RedConectada[]>('/api/redes'),
    staleTime: 5 * 60_000,
  })

export const opcionesTiktokQuery = (redId: string, tipo: 'video' | 'fotos') =>
  queryOptions({
    queryKey: ['redes', redId, 'opciones-tiktok', tipo],
    queryFn: () =>
      apiFetch<OpcionesTikTokRed>(`/api/redes/${encodeURIComponent(redId)}/opciones-tiktok`, {
        params: { tipo },
      }),
    staleTime: 5 * 60_000,
  })

export const programadasQuery = (mes: string) =>
  queryOptions({
    queryKey: ['programadas', 'mes', mes],
    queryFn: () => apiFetch<Programada[]>('/api/programadas', { params: { mes } }),
    staleTime: 30_000,
  })

/** Borradores sin fecha: `GET /api/programadas` sin `mes`. */
export const borradoresSinFechaQuery = () =>
  queryOptions({
    queryKey: ['programadas', 'sin-fecha'],
    queryFn: () => apiFetch<Programada[]>('/api/programadas'),
    staleTime: 30_000,
  })

export const programadaQuery = (id: string) =>
  queryOptions({
    queryKey: ['programada', id],
    queryFn: () => apiFetch<Programada>(`/api/programadas/${encodeURIComponent(id)}`),
    staleTime: 30_000,
  })

export const useRedes = (habilitado = true) => useQuery({ ...redesQuery(), enabled: habilitado })

/**
 * ¿Se muestra publicar y programar? Hace falta la bandera del front y que el backend no responda 404
 * en `GET /api/redes` (con su `PUBLICACION_HABILITADA` apagada). Cualquier otro error no la esconde:
 * lo resuelve cada pantalla.
 */
export function usePublicacionDisponible(): { disponible: boolean; cargando: boolean } {
  const bandera = publicacionHabilitada()
  const redes = useRedes(bandera)
  if (!bandera) return { disponible: false, cargando: false }
  if (redes.error instanceof ApiError && redes.error.status === 404)
    return { disponible: false, cargando: false }
  return { disponible: true, cargando: redes.isPending }
}

export const useOpcionesTiktok = (redId: string | undefined, tipo: 'video' | 'fotos') =>
  useQuery({ ...opcionesTiktokQuery(redId ?? '', tipo), enabled: Boolean(redId) })
export const useProgramadas = (mes: string, habilitado = true) =>
  useQuery({ ...programadasQuery(mes), enabled: habilitado })
export const useBorradoresSinFecha = (habilitado = true) =>
  useQuery({ ...borradoresSinFechaQuery(), enabled: habilitado })
export const useProgramada = (id: string | undefined) =>
  useQuery({ ...programadaQuery(id ?? ''), enabled: Boolean(id) })

export const crearProgramada = (cuerpo: NuevaProgramada) =>
  apiFetch<Programada>('/api/programadas', { method: 'POST', json: cuerpo })
export const editarProgramada = (id: string, cambios: CambiosProgramada) =>
  apiFetch<Programada>(`/api/programadas/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    json: cambios,
  })
export const borrarProgramada = (id: string) =>
  apiFetch<void>(`/api/programadas/${encodeURIComponent(id)}`, { method: 'DELETE' })
export const reintentarProgramada = (id: string) =>
  apiFetch<Programada>(`/api/programadas/${encodeURIComponent(id)}/reintentar`, { method: 'POST' })
export const pedirSubida = (pedido: PedidoSubida) =>
  apiFetch<SubidaMedio>('/api/medios', { method: 'POST', json: pedido })

/** Después de escribir, el calendario y las listas se vuelven a pedir. */
export function invalidarPublicacion(queryClient: QueryClient): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['calendario'] }),
    queryClient.invalidateQueries({ queryKey: ['programadas'] }),
    queryClient.invalidateQueries({ queryKey: ['programada'] }),
  ])
}

function useEscritura<V, R>(fn: (v: V) => Promise<R>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    // También después de un error: un 409 puede significar que la pieza ya cambió.
    onSettled: () => invalidarPublicacion(queryClient),
  })
}

export const useCrearProgramada = () => useEscritura(crearProgramada)
export const useEditarProgramada = () =>
  useEscritura(({ id, cambios }: { id: string; cambios: CambiosProgramada }) =>
    editarProgramada(id, cambios),
  )
export const useBorrarProgramada = () => useEscritura(borrarProgramada)
export const useReintentarProgramada = () => useEscritura(reintentarProgramada)
