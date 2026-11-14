import { partesBA } from '@/lib/fecha'
import type { Formato, Publicada, ResumenMetricas } from './types'

export const FRANJA_NOCHE = { desde: 18, hasta: 22 } as const

export function mediana(valores: number[]): number {
  if (!valores.length) return 0
  const s = [...valores].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? (s[mid] as number) : ((s[mid - 1] as number) + (s[mid] as number)) / 2
}

export function esNoche(hora: number): boolean {
  return hora >= FRANJA_NOCHE.desde && hora < FRANJA_NOCHE.hasta
}

export type ClaseRendimiento = 'sube' | 'normal' | 'baja'

export function claseRendimiento(razon: number): ClaseRendimiento {
  if (razon >= 1.3) return 'sube'
  if (razon < 0.7) return 'baja'
  return 'normal'
}

/** Resumen de métricas sobre publicaciones ya publicadas. La mediana evita que un pico distorsione. */
export function calcularResumen(pubs: Publicada[]): ResumenMetricas {
  const ranking = [...pubs].sort((a, b) => b.alcance - a.alcance)
  const mejor = ranking[0]
  const porFormato: Partial<Record<Formato, number>> = {}
  for (const f of ['Reel', 'Carrusel', 'Foto'] as const) {
    const l = pubs.filter((p) => p.formato === f).map((p) => p.alcance)
    if (l.length) porFormato[f] = mediana(l)
  }
  const noche = pubs.filter((p) => esNoche(partesBA(p.fecha).hora)).map((p) => p.alcance)
  const resto = pubs.filter((p) => !esNoche(partesBA(p.fecha).hora)).map((p) => p.alcance)
  return {
    cantidad: pubs.length,
    medianaAlcance: mediana(pubs.map((p) => p.alcance)),
    medianaPorFormato: porFormato,
    mejorHora: mejor ? partesBA(mejor.fecha).hora : 19,
    medianaNoche: noche.length ? mediana(noche) : null,
    medianaResto: resto.length ? mediana(resto) : null,
    mejorAlcance: mejor?.alcance ?? 0,
  }
}

export interface PublicadaConRendimiento extends Publicada {
  razon: number
  clase: ClaseRendimiento
  puesto: number
}

/** Agrega razón contra la mediana, clase y puesto en el ranking. */
export function conRendimiento(
  pubs: Publicada[],
  resumen: ResumenMetricas,
): PublicadaConRendimiento[] {
  const orden = [...pubs].sort((a, b) => b.alcance - a.alcance)
  return pubs.map((p) => {
    const razon = resumen.medianaAlcance ? p.alcance / resumen.medianaAlcance : 1
    return { ...p, razon, clase: claseRendimiento(razon), puesto: orden.indexOf(p) + 1 }
  })
}
