/** Lo que el filtro del calendario puede ocultar. */
export type TipoFiltro = 'publicada' | 'idea' | 'programada'
const TIPOS_FILTRO: readonly TipoFiltro[] = ['publicada', 'idea', 'programada']

/** Parámetros de URL del calendario. Contrato compartido entre calendario, detalle y chat. */
export interface CalendarioSearch {
  /** Mes visible, YYYY-MM (hora de Buenos Aires). */
  mes?: string
  /** Día seleccionado, YYYY-MM-DD. */
  dia?: string
  /** Id de la publicación o idea abierta en el panel de detalle. */
  item?: string
  /** Tipos ocultos por los filtros. */
  ocultar?: TipoFiltro[]
  /** Publicación o idea sobre la que se le pregunta a Fidel (chip de contexto del chat). */
  sobre?: string
  /** Pedido de abrir la barra de Fidel; se consume y se quita de la URL. */
  fidel?: 'abierto'
  /** Panel «Nueva publicación» abierto. Con `dia`, la fecha arranca en ese día. */
  nueva?: true
}

const MES = /^\d{4}-(0[1-9]|1[0-2])$/
const DIA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

function esDiaReal(v: string): boolean {
  if (!DIA.test(v)) return false
  const [a, m, d] = v.split('-').map(Number) as [number, number, number]
  const f = new Date(Date.UTC(a, m - 1, d))
  return f.getUTCMonth() === m - 1 && f.getUTCDate() === d
}

export function validarCalendarioSearch(raw: Record<string, unknown>): CalendarioSearch {
  const out: CalendarioSearch = {}
  if (typeof raw.mes === 'string' && MES.test(raw.mes)) out.mes = raw.mes
  if (typeof raw.dia === 'string' && esDiaReal(raw.dia)) out.dia = raw.dia
  if (typeof raw.item === 'string' && raw.item) out.item = raw.item
  if (Array.isArray(raw.ocultar)) {
    const v = raw.ocultar.filter((x): x is TipoFiltro => TIPOS_FILTRO.includes(x as TipoFiltro))
    if (v.length) out.ocultar = v
  }
  if (typeof raw.sobre === 'string' && raw.sobre) out.sobre = raw.sobre
  if (raw.fidel === 'abierto') out.fidel = 'abierto'
  // El router convierte `?nueva=true` en el booleano, pero un enlace escrito a mano puede traer 1.
  if (raw.nueva === true || raw.nueva === 'true' || raw.nueva === 1 || raw.nueva === '1')
    out.nueva = true
  return out
}

/** `/chat?item=` (enlaces viejos): se redirige al calendario con Fidel abierto sobre ese ítem. */
export interface ChatSearch {
  item?: string
}

export function validarChatSearch(raw: Record<string, unknown>): ChatSearch {
  return typeof raw.item === 'string' && raw.item ? { item: raw.item } : {}
}
