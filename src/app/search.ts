/** Parámetros de URL del calendario. Contrato compartido entre calendario, detalle y chat. */
export interface CalendarioSearch {
  /** Mes visible, YYYY-MM (hora de Buenos Aires). */
  mes?: string
  /** Día seleccionado, YYYY-MM-DD. */
  dia?: string
  /** Id de la publicación o idea abierta en el panel de detalle. */
  item?: string
  /** Tipos ocultos por los filtros. */
  ocultar?: Array<'publicada' | 'idea'>
}

const MES = /^\d{4}-(0[1-9]|1[0-2])$/
const DIA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

export function validarCalendarioSearch(raw: Record<string, unknown>): CalendarioSearch {
  const out: CalendarioSearch = {}
  if (typeof raw.mes === 'string' && MES.test(raw.mes)) out.mes = raw.mes
  if (typeof raw.dia === 'string' && DIA.test(raw.dia)) out.dia = raw.dia
  if (typeof raw.item === 'string' && raw.item) out.item = raw.item
  if (Array.isArray(raw.ocultar)) {
    const v = raw.ocultar.filter(
      (x): x is 'publicada' | 'idea' => x === 'publicada' || x === 'idea',
    )
    if (v.length) out.ocultar = v
  }
  return out
}

/** Contexto con el que se abre el chat desde otra pantalla (p. ej. "Preguntale a Fidel"). */
export interface ChatSearch {
  item?: string
}

export function validarChatSearch(raw: Record<string, unknown>): ChatSearch {
  return typeof raw.item === 'string' && raw.item ? { item: raw.item } : {}
}
