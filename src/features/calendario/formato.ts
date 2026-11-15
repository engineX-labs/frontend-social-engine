import type { ClaseRendimiento } from '@/domain/metrics'
import { nombreMes } from '@/lib/fecha'

/** "noviembre" a partir de "2026-11". */
export function mesEnMinuscula(mes: string): string {
  return (nombreMes(mes).split(' ')[0] ?? '').toLowerCase()
}

export interface Rendimiento {
  razon: number
  clase: ClaseRendimiento
}
