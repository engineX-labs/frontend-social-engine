import { situacionDe } from '@/domain/publicacion'
import type { Programada } from '@/domain/types'

/**
 * Cuándo se vuelve a pedir el calendario. El backend no avisa al navegador: el estado final de una
 * pieza llega a la base por el webhook de Zernio o por la conciliación diaria, y el front lo lee. Por
 * eso se refresca, pero solo mientras haya algo por resolverse. Los tests acortan estos tiempos.
 */
export const refresco = {
  /** Cada cuánto se refresca mientras haya piezas pendientes. */
  intervaloMs: 30_000,
  /** Una programada entra en «pendiente» cuando falta menos que esto para su hora (o ya pasó). */
  ventanaMs: 10 * 60_000,
}

type Pieza = Pick<Programada, 'estado' | 'error' | 'fecha'>

/**
 * ¿Hay algo que se va a resolver pronto? Publicándose, «Confirmando…» (no es un fallo: se resuelve
 * solo) o programada para dentro de poco, o ya vencida y todavía sin noticias de Zernio.
 */
export function estaPendiente(p: Pieza, ahora: number, ventanaMs = refresco.ventanaMs): boolean {
  const s = situacionDe(p)
  if (s === 'publicando' || s === 'confirmando') return true
  return s === 'programada' && p.fecha !== null && Date.parse(p.fecha) <= ahora + ventanaMs
}

export const hayPendientes = (piezas: readonly Pieza[], ahora: number, ventanaMs?: number) =>
  piezas.some((p) => estaPendiente(p, ahora, ventanaMs))

/**
 * Cuándo (ms desde epoch) la primera programada que todavía no está cerca pasa a estar pendiente, para
 * volver a evaluar sin que nadie toque nada. `null` si no hay ninguna.
 */
export function proximoDespertar(
  piezas: readonly Pieza[],
  ahora: number,
  ventanaMs = refresco.ventanaMs,
): number | null {
  let menor: number | null = null
  for (const p of piezas) {
    if (situacionDe(p) !== 'programada' || p.fecha === null) continue
    const cuando = Date.parse(p.fecha) - ventanaMs
    if (Number.isNaN(cuando) || cuando <= ahora) continue
    if (menor === null || cuando < menor) menor = cuando
  }
  return menor
}
