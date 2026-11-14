import { claveMes, diaLargo, hora } from '@/lib/fecha'

const NUM = new Intl.NumberFormat('es-AR')
export const num = (n: number) => NUM.format(Math.round(n))

export interface Comparacion {
  razon: number
  texto: string
  clase: 'sube' | 'normal' | 'baja'
}

/** "2,3× tu mediana", "28% bajo tu mediana" o "en tu mediana". */
export function textoRazon(razon: number): string {
  if (razon >= 1.3) return `${razon.toFixed(1).replace(/\.0$/, '').replace('.', ',')}× tu mediana`
  if (razon < 0.7) return `${Math.round((1 - razon) * 100)}% bajo tu mediana`
  return 'en tu mediana'
}

/** Día y hora en Buenos Aires, p. ej. "martes 17 de noviembre · 19:00 h". */
export function cuando(fecha: string): string {
  return `${diaLargo(fecha)} · ${hora(fecha)} h`
}

export const mesDe = claveMes
