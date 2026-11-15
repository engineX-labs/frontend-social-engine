export const ENLACE = /\[([^\]\n]+)\]\((\/[^)\s]*)\)/g
/** Enlace Markdown a medio llegar al final del texto: se oculta hasta que se completa. */
const ENLACE_INCOMPLETO = /\[[^\]\n]*(\]\([^)\s]*)?$/

const MES = /^\d{4}-(0[1-9]|1[0-2])$/

/** Publicación o idea del calendario a la que apunta un enlace de Fidel. */
export interface Cita {
  item: string
  mes?: string
}

export function destinoCalendario(destino: string): Cita | null {
  const url = new URL(destino, 'http://x')
  const item = url.searchParams.get('item')
  const mes = url.searchParams.get('mes')
  if (url.pathname !== '/' || !item) return null
  return { item, ...(mes && MES.test(mes) ? { mes } : {}) }
}

/** Lo que ya se puede mostrar: mientras llega el stream no se asoma un enlace a medias. */
export const textoVisible = (texto: string, enCurso?: boolean) =>
  enCurso ? texto.replace(ENLACE_INCOMPLETO, '') : texto

/** Publicaciones e ideas que cita una respuesta, sin repetir y en orden de aparición. */
export function citasDe(texto: string, enCurso?: boolean): Cita[] {
  const vistas = new Map<string, Cita>()
  for (const m of textoVisible(texto, enCurso).matchAll(ENLACE)) {
    const cita = destinoCalendario(m[2]!)
    if (cita && !vistas.has(cita.item)) vistas.set(cita.item, cita)
  }
  return [...vistas.values()]
}
