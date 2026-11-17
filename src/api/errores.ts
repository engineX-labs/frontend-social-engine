import { ApiError } from './http'

/** 401 (sin sesión o vencida) y 403 (usuario sin comercio): reintentar no los arregla. */
export function esErrorDeAcceso(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403)
}

/** Mensaje para la pantalla; el de la API solo se usa para distinguir el caso, no se muestra crudo. */
export function mensajeDeApi(error: unknown, porDefecto: string): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Tu sesión venció o todavía no iniciaste sesión.'
    if (error.status === 403) return 'Tu usuario todavía no tiene un comercio asignado.'
  }
  return porDefecto
}
