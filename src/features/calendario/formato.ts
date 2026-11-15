import type { ClaseRendimiento } from '@/domain/metrics'
import { nombreMes } from '@/lib/fecha'

/** Miles con punto, sin depender del locale del navegador: 3980 → "3.980". */
export function fmtNum(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** Razón contra la mediana con un decimal y coma: 3.48 → "3,5". */
export function fmtRazon(x: number): string {
  return x.toFixed(1).replace(/\.0$/, '').replace('.', ',')
}

/** "noviembre" a partir de "2026-11". */
export function mesEnMinuscula(mes: string): string {
  return (nombreMes(mes).split(' ')[0] ?? '').toLowerCase()
}

export interface Rendimiento {
  razon: number
  clase: ClaseRendimiento
}

/** "3,5× tu mediana" o "en tu mediana": la razón solo cuando se aparta de lo normal. */
export function detalleRendimiento(r: Rendimiento): string {
  return r.clase === 'normal' ? 'en tu mediana' : `${fmtRazon(r.razon)}× tu mediana`
}
