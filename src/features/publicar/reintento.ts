import { tipoDeConflicto } from '@/api/errores'

/** Lo que se espera antes del reintento automático cuando otro pedido tiene tomada la pieza. */
export const ESPERA_PROCESANDO_MS = 400

export const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Corre una escritura y, si el backend contesta «se está procesando» (otro pedido o la conciliación
 * diaria tiene tomada la pieza, y no se hizo nada), espera un momento y la repite una sola vez.
 */
export async function conReintentoSiProcesando<T>(escribir: () => Promise<T>): Promise<T> {
  try {
    return await escribir()
  } catch (e) {
    if (tipoDeConflicto(e) !== 'procesando') throw e
    await esperar(ESPERA_PROCESANDO_MS)
    return escribir()
  }
}
