import { ETIQUETA_TIPO, situacionDe, type SituacionProgramada } from '@/domain/publicacion'
import type { CalendarioMes, Item, Programada } from '@/domain/types'
import { aUtcDesdeBA, claveDia, diaLargo } from '@/lib/fecha'

/** Una pieza guardada desde la app que ya tiene día en el calendario. */
export type ProgramadaConFecha = Programada & { fecha: string }
/** Lo que se dibuja en el calendario: publicadas, ideas de Fidel y piezas guardadas desde la app. */
export type ItemCalendario = Item | ProgramadaConFecha
export type Tipo = ItemCalendario['tipo']

const conFecha = (p: Programada): p is ProgramadaConFecha => p.fecha !== null

/** Las piezas que van al calendario: con día y sin las canceladas. */
export const programadasDelCalendario = (datos: CalendarioMes): ProgramadaConFecha[] =>
  (datos.programadas ?? []).filter(conFecha).filter((p) => p.estado !== 'cancelada')

/** «Reel», «Carrusel», «Fotos»: el formato de cualquier item, como se lee en pantalla. */
export const formatoDe = (it: ItemCalendario): string =>
  it.tipo === 'programada' ? ETIQUETA_TIPO[it.formato] : it.formato

/**
 * Items del mes por día (YYYY-MM-DD, hora de Buenos Aires), ordenados por hora. Las `programadas`
 * (si el llamador las dejó en `datos`) no traen a las canceladas ni a los borradores sin fecha, pero
 * por las dudas se descartan acá.
 */
export function agruparPorDia(
  datos: CalendarioMes,
  ocultar: readonly Tipo[],
): Map<string, ItemCalendario[]> {
  const todos: ItemCalendario[] = [
    ...(ocultar.includes('publicada') ? [] : datos.publicadas),
    ...(ocultar.includes('idea') ? [] : datos.ideas),
    ...(ocultar.includes('programada') ? [] : programadasDelCalendario(datos)),
  ]
  const porDia = new Map<string, ItemCalendario[]>()
  for (const it of todos.sort((a, b) => Date.parse(a.fecha) - Date.parse(b.fecha))) {
    const k = claveDia(it.fecha)
    const lista = porDia.get(k)
    if (lista) lista.push(it)
    else porDia.set(k, [it])
  }
  return porDia
}

/** Singular y plural de cada situación, para decir el día en voz alta. */
const CUENTA: Record<SituacionProgramada, [string, string]> = {
  borrador: ['borrador', 'borradores'],
  programada: ['programada', 'programadas'],
  publicando: ['publicándose', 'publicándose'],
  confirmando: ['confirmándose', 'confirmándose'],
  fallida: ['fallida', 'fallidas'],
  'no-se-publico': ['sin publicar', 'sin publicar'],
  publicada: ['publicada', 'publicadas'],
  cancelada: ['cancelada', 'canceladas'],
}
const ORDEN_CUENTA: SituacionProgramada[] = [
  'programada',
  'borrador',
  'publicando',
  'confirmando',
  'fallida',
  'no-se-publico',
]

/**
 * "sin publicaciones", "2 publicadas", "1 publicada y 1 sugerida", "1 publicada, 1 programada y
 * 1 fallida". Una pieza guardada que ya salió cuenta como publicada.
 */
export function resumenDia(items: readonly ItemCalendario[]): string {
  const situaciones = items.filter((i) => i.tipo === 'programada').map(situacionDe)
  const pub =
    items.filter((i) => i.tipo === 'publicada').length +
    situaciones.filter((s) => s === 'publicada').length
  const ide = items.filter((i) => i.tipo === 'idea').length
  const partes = [
    pub ? `${pub} ${pub === 1 ? 'publicada' : 'publicadas'}` : '',
    ...ORDEN_CUENTA.map((s) => [s, situaciones.filter((x) => x === s).length] as const)
      .filter(([, n]) => n)
      .map(([s, n]) => `${n} ${CUENTA[s][n === 1 ? 0 : 1]}`),
    ide ? `${ide} ${ide === 1 ? 'sugerida' : 'sugeridas'}` : '',
  ].filter(Boolean)
  if (!partes.length) return 'sin publicaciones'
  return partes.length === 1
    ? partes[0]!
    : `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`
}

/** Texto largo de un día (YYYY-MM-DD), p. ej. "sábado 14 de noviembre". */
export function nombreDia(dia: string): string {
  const [a, m, d] = dia.split('-').map(Number)
  return diaLargo(aUtcDesdeBA(a ?? 1970, m ?? 1, d ?? 1, 12))
}

export const mayuscula = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`
