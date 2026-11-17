import { obtenerToken } from './auth'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
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

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { params?: Record<string, string> },
): Promise<T> {
  const { params, headers, ...resto } = init ?? {}
  const url = urlApi(path)
  for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v)
  const res = await fetch(url, { ...resto, headers: await cabecerasConAuth(headers) })
  if (!res.ok) {
    const cuerpo = (await res.json().catch(() => null)) as { detalle?: string } | null
    throw new ApiError(res.status, cuerpo?.detalle ?? `Error ${res.status}`)
  }
  return res.json() as Promise<T>
}

/** Un 401, 403 o 404 no se arregla repitiendo el pedido: solo se reintentan los fallos de red o 5xx. */
export function reintentarConsulta(intentos: number, error: unknown): boolean {
  if (error instanceof ApiError && [401, 403, 404].includes(error.status)) return false
  return intentos < 1
}
