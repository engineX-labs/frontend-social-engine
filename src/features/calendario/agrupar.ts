import type { CalendarioMes, Item } from '@/domain/types'
import { aUtcDesdeBA, claveDia, diaLargo } from '@/lib/fecha'

export type Tipo = Item['tipo']

/** Items del mes por día (YYYY-MM-DD, hora de Buenos Aires), ordenados por hora. */
export function agruparPorDia(datos: CalendarioMes, ocultar: readonly Tipo[]): Map<string, Item[]> {
  const todos: Item[] = [
    ...(ocultar.includes('publicada') ? [] : datos.publicadas),
    ...(ocultar.includes('idea') ? [] : datos.ideas),
  ]
  const porDia = new Map<string, Item[]>()
  for (const it of todos.sort((a, b) => Date.parse(a.fecha) - Date.parse(b.fecha))) {
    const k = claveDia(it.fecha)
    const lista = porDia.get(k)
    if (lista) lista.push(it)
    else porDia.set(k, [it])
  }
  return porDia
}

/** "sin publicaciones", "2 publicadas", "1 publicada y 1 sugerida". */
export function resumenDia(items: readonly Item[]): string {
  const pub = items.filter((i) => i.tipo === 'publicada').length
  const ide = items.length - pub
  const partes = [
    pub ? `${pub} ${pub === 1 ? 'publicada' : 'publicadas'}` : '',
    ide ? `${ide} ${ide === 1 ? 'sugerida' : 'sugeridas'}` : '',
  ].filter(Boolean)
  return partes.length ? partes.join(' y ') : 'sin publicaciones'
}

/** Texto largo de un día (YYYY-MM-DD), p. ej. "sábado 14 de noviembre". */
export function nombreDia(dia: string): string {
  const [a, m, d] = dia.split('-').map(Number)
  return diaLargo(aUtcDesdeBA(a ?? 1970, m ?? 1, d ?? 1, 12))
}

export const mayuscula = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`
