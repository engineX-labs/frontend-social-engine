import type { Red } from '@/domain/types'

/**
 * La vuelta del OAuth de Zernio. El backend manda a Zernio la URL de la app como `redirect_url` y
 * el contrato no deja pasarle datos propios, así que antes de salir se anota en `sessionStorage`
 * que hay una conexión en curso. Al volver, ese rastro (o un `error` en la URL) dice que hay que
 * llamar a `sincronizar` y mostrar el resultado.
 *
 * SIN VERIFICAR: qué parámetros agrega Zernio a la vuelta (hoy solo se reconoce `error`).
 */
const CLAVE = 'conexion-en-curso'
const PARAMETROS_DE_ERROR = ['error', 'error_description']

export interface Retorno {
  /** Lo que informó el proveedor si el usuario canceló o falló el permiso. */
  error: string | null
  /** Venía de reconectar una red existente (no de conectar una nueva). */
  reconectando: boolean
}

export function marcarConexionEnCurso(plataforma: Red, reconectando: boolean) {
  try {
    sessionStorage.setItem(CLAVE, JSON.stringify({ plataforma, reconectando }))
  } catch {
    // Sin sessionStorage la vuelta no se reconoce sola: se sigue viendo la pantalla de redes.
  }
}

/** No modifica nada: se puede llamar más de una vez (StrictMode). Ver `limpiarRetorno`. */
export function leerRetorno(): Retorno | null {
  let rastro: { reconectando?: boolean } | null = null
  try {
    const crudo = sessionStorage.getItem(CLAVE)
    rastro = crudo ? (JSON.parse(crudo) as { reconectando?: boolean }) : null
  } catch {
    rastro = null
  }
  const parametros = new URLSearchParams(window.location.search)
  const error = PARAMETROS_DE_ERROR.map((p) => parametros.get(p)).find(Boolean) ?? null
  if (!rastro && !error) return null
  return { error: error ? 'cancelada' : null, reconectando: Boolean(rastro?.reconectando) }
}

/** Borra el rastro y deja la URL limpia, para que recargar la página no repita el aviso. */
export function limpiarRetorno() {
  try {
    sessionStorage.removeItem(CLAVE)
  } catch {
    // nada que borrar
  }
  const url = new URL(window.location.href)
  if (!PARAMETROS_DE_ERROR.some((p) => url.searchParams.has(p))) return
  for (const p of PARAMETROS_DE_ERROR) url.searchParams.delete(p)
  window.history.replaceState(window.history.state, '', url)
}
