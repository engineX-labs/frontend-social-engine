import { claveMes, diaLargo, hora } from '@/lib/fecha'

/** Día y hora en Buenos Aires, p. ej. "martes 17 de noviembre · 19:00 h". */
export function cuando(fecha: string): string {
  return `${diaLargo(fecha)} · ${hora(fecha)} h`
}

export const mesDe = claveMes
