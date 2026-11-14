import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

const ENLACE = /\[([^\]\n]+)\]\((\/[^)\s]*)\)/g
/** Enlace Markdown a medio llegar al final del texto: se oculta hasta que se completa. */
const ENLACE_INCOMPLETO = /\[[^\]\n]*(\]\([^)\s]*)?$/

const MES = /^\d{4}-(0[1-9]|1[0-2])$/

function enlace(texto: string, destino: string, clave: number): ReactNode {
  const url = new URL(destino, 'http://x')
  const item = url.searchParams.get('item')
  const mes = url.searchParams.get('mes')
  if (url.pathname !== '/' || !item) return texto
  return (
    <Link
      key={clave}
      to="/"
      search={{ item, ...(mes && MES.test(mes) ? { mes } : {}) }}
      className="font-semibold text-accent-ink underline underline-offset-4"
    >
      {texto}
    </Link>
  )
}

/**
 * Texto de Fidel. Solo entiende enlaces `[texto](/?item=<id>&mes=<YYYY-MM>)` hacia el calendario;
 * todo lo demás se muestra como texto plano (sin HTML).
 */
export function TextoFidel({ texto, enCurso }: { texto: string; enCurso?: boolean }) {
  const visible = enCurso ? texto.replace(ENLACE_INCOMPLETO, '') : texto
  const partes: ReactNode[] = []
  let desde = 0
  for (const m of visible.matchAll(ENLACE)) {
    if (m.index > desde) partes.push(visible.slice(desde, m.index))
    partes.push(enlace(m[1]!, m[2]!, m.index))
    desde = m.index + m[0].length
  }
  if (desde < visible.length) partes.push(visible.slice(desde))
  return <p className="whitespace-pre-wrap break-words">{partes}</p>
}
