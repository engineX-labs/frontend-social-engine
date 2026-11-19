import { avisarNoAutorizado, obtenerToken } from './auth'

export class ApiError extends Error {
  status: number
  /** Los problemas de un 422 de reglas (`{ detalle, problemas }`), en castellano. */
  problemas: string[]
  /** Código estable del error si el backend lo manda (hoy los 409 solo traen `detalle`). */
  codigo: string | null
  constructor(
    status: number,
    message: string,
    extra?: { problemas?: string[]; codigo?: string | null },
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.problemas = extra?.problemas ?? []
    this.codigo = extra?.codigo ?? null
  }
}

/** Sin VITE_API_URL el front usa los datos de ejemplo (MSW). */
export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
export const USAR_MOCKS = !API_URL

/**
 * Qué parte de la API simula MSW:
 * - `todo`: sin `VITE_API_URL` (demo de Vercel y tests).
 * - `chat`: con `VITE_API_URL` y `VITE_MOCK_CHAT=true`; el calendario va al backend real y solo el
 *   chat sigue simulado, porque `POST /api/chat` todavía no existe (S4).
 * - `ninguno`: todo va al backend.
 */
export type ModoMocks = 'todo' | 'chat' | 'ninguno'
export const MODO_MOCKS: ModoMocks = USAR_MOCKS
  ? 'todo'
  : import.meta.env.VITE_MOCK_CHAT === 'true'
    ? 'chat'
    : 'ninguno'

/** Arma la URL respetando un prefijo en VITE_API_URL (p. ej. https://api.x.com/v1). */
export function urlApi(path: string): URL {
  const base = API_URL ? API_URL.replace(/\/+$/, '') : window.location.origin
  return new URL(base + path, window.location.origin)
}

/** Cabeceras del pedido más `Authorization: Bearer` cuando hay token. */
export async function cabecerasConAuth(base?: HeadersInit): Promise<Headers> {
  const cabeceras = new Headers(base)
  const token = await obtenerToken()
  if (token) cabeceras.set('Authorization', `Bearer ${token}`)
  return cabeceras
}

/** El error de una respuesta que no fue ok. Un 401 además avisa para volver al ingreso. */
export async function errorDeRespuesta(res: Response): Promise<ApiError> {
  const cuerpo = (await res.json().catch(() => null)) as {
    detalle?: unknown
    problemas?: unknown
    codigo?: unknown
  } | null
  if (res.status === 401) avisarNoAutorizado()
  return new ApiError(
    res.status,
    typeof cuerpo?.detalle === 'string' ? cuerpo.detalle : `Error ${res.status}`,
    {
      problemas: Array.isArray(cuerpo?.problemas)
        ? cuerpo.problemas.filter((p): p is string => typeof p === 'string')
        : [],
      codigo: typeof cuerpo?.codigo === 'string' ? cuerpo.codigo : null,
    },
  )
}

export async function apiFetch<T>(
  path: string,
  init?: Omit<RequestInit, 'body'> & {
    params?: Record<string, string>
    /** Cuerpo JSON: se serializa y se manda con `Content-Type: application/json`. */
    json?: unknown
  },
): Promise<T> {
  const { params, json, headers, ...resto } = init ?? {}
  const url = urlApi(path)
  for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v)
  const cabeceras = await cabecerasConAuth(headers)
  let body: string | undefined
  if (json !== undefined) {
    cabeceras.set('Content-Type', 'application/json')
    body = JSON.stringify(json)
  }
  const res = await fetch(url, { ...resto, body, headers: cabeceras })
  if (!res.ok) throw await errorDeRespuesta(res)
  // 204 (por ejemplo, DELETE): no hay cuerpo que leer.
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

/** Un 401, 403 o 404 no se arregla repitiendo el pedido: solo se reintentan los fallos de red o 5xx. */
export function reintentarConsulta(intentos: number, error: unknown): boolean {
  if (error instanceof ApiError && [401, 403, 404].includes(error.status)) return false
  return intentos < 1
}
