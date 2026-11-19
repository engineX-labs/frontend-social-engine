import type { ValoresRespuestas } from '@/domain/contexto'

/**
 * Borrador del cuestionario: vive en `sessionStorage` (por pestaña), no en un PUT parcial. Así recargar
 * a mitad no pierde lo escrito, no se guardan respuestas a medias en el servidor ni se cambia el
 * `estado` del contexto hasta que el usuario termina. Se descarta si cambia la versión del catálogo y
 * se borra al guardar. Todo con try/catch: sin storage, el cuestionario funciona igual (sin borrador).
 */
const CLAVE = 'contexto:borrador'

export interface Borrador {
  version: number
  paso: number
  valores: ValoresRespuestas
}

export function leerBorrador(version: number): Borrador | null {
  try {
    const crudo = sessionStorage.getItem(CLAVE)
    if (!crudo) return null
    const b = JSON.parse(crudo) as Partial<Borrador> | null
    if (!b || b.version !== version || typeof b.paso !== 'number' || typeof b.valores !== 'object')
      return null
    return b as Borrador
  } catch {
    return null
  }
}

export function guardarBorrador(b: Borrador) {
  try {
    sessionStorage.setItem(CLAVE, JSON.stringify(b))
  } catch {
    // sin storage disponible: no hay borrador
  }
}

/** También conviene llamarla al cerrar sesión, para que el próximo usuario de la pestaña no lo vea. */
export function borrarBorrador() {
  try {
    sessionStorage.removeItem(CLAVE)
  } catch {
    // nada que borrar
  }
}
