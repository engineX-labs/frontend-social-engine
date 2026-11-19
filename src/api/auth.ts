/**
 * Único punto donde el front obtiene el token con el que habla con la API.
 *
 * Lo provee Clerk: `Acceso` registra acá el `getToken()` de la sesión mientras hay alguien
 * adentro. El token de Clerk dura 60 segundos y el SDK lo renueva solo, así que nunca se guarda:
 * cada pedido se lo vuelve a pedir. Sin sesión no hay proveedor y no se manda nada.
 */
type ProveedorDeToken = () => Promise<string | null>

let proveedor: ProveedorDeToken | null = null

export function registrarProveedorDeToken(nuevo: ProveedorDeToken | null): void {
  proveedor = nuevo
}

export async function obtenerToken(): Promise<string | null> {
  if (!proveedor) return null
  try {
    return await proveedor()
  } catch {
    return null
  }
}

/** Quien se entera de que la API rechazó la sesión (401), p. ej. para volver al ingreso. */
const oyentes = new Set<() => void>()

export function alNoAutorizado(oyente: () => void): () => void {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}

export function avisarNoAutorizado(): void {
  for (const oyente of [...oyentes]) oyente()
}
