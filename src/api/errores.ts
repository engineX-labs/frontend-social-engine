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

export type TipoDeConflicto = 'reconectar' | 'procesando' | 'id_en_uso' | 'estado'

/**
 * Distingue los 409 de publicar. El backend todavía no manda un `codigo` (se pidió en «Frontend ·
 * Publicar 0»): hasta entonces se reconoce por el texto de `detalle`, y el `codigo` manda si llega.
 */
export function tipoDeConflicto(error: unknown): TipoDeConflicto | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null
  if (
    error.codigo === 'reconectar' ||
    error.codigo === 'procesando' ||
    error.codigo === 'id_en_uso' ||
    error.codigo === 'estado'
  )
    return error.codigo
  if (/reconect|volvé a conectarla/i.test(error.message)) return 'reconectar'
  if (/se está procesando/i.test(error.message)) return 'procesando'
  if (/^id en uso$/i.test(error.message.trim())) return 'id_en_uso'
  return 'estado'
}

/** Mensaje de un error de publicar, listo para mostrar. Los problemas de un 422 se piden aparte. */
export function mensajeDePublicar(error: unknown, porDefecto: string): string {
  if (!(error instanceof ApiError)) return porDefecto
  if (error.status === 422) return error.problemas[0] ?? error.message
  if (error.status === 409) {
    switch (tipoDeConflicto(error)) {
      case 'reconectar':
        return 'Hay que reconectar la red con permiso para publicar.'
      case 'procesando':
        return 'Se está procesando. Probá de nuevo en unos segundos.'
      case 'id_en_uso':
        return 'No se pudo guardar. Probá de nuevo.'
      default:
        return error.message
    }
  }
  if (error.status === 503) return 'No se pudo publicar ahora. Probá de nuevo en un rato.'
  return mensajeDeApi(error, porDefecto)
}
