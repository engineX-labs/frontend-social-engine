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

/** Arma la URL respetando un prefijo en VITE_API_URL (p. ej. https://api.x.com/v1). */
export function urlApi(path: string): URL {
  const base = API_URL ? API_URL.replace(/\/+$/, '') : window.location.origin
  return new URL(base + path, window.location.origin)
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { params?: Record<string, string> },
): Promise<T> {
  const url = urlApi(path)
  for (const [k, v] of Object.entries(init?.params ?? {})) url.searchParams.set(k, v)
  const res = await fetch(url, init)
  if (!res.ok) {
    const cuerpo = (await res.json().catch(() => null)) as { detalle?: string } | null
    throw new ApiError(res.status, cuerpo?.detalle ?? `Error ${res.status}`)
  }
  return res.json() as Promise<T>
}
