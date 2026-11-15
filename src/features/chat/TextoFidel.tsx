import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { destinoCalendario, ENLACE, textoVisible } from './citas'
import { useFidelOpcional } from './contexto'

/**
 * Cursor de escritura. Ocupa cero de ancho: nunca empuja una palabra a la línea siguiente,
 * así que al terminar el stream desaparece sin mover nada.
 */
function Cursor() {
  return (
    <span aria-hidden="true" className="relative inline-block h-[1.1em] w-0 align-text-bottom">
      <span className="absolute inset-y-0 left-0.5 w-0.5 animate-cursor rounded-full bg-accent motion-reduce:animate-none" />
    </span>
  )
}

/**
 * Texto de Fidel. Solo entiende enlaces `[texto](/?item=<id>&mes=<YYYY-MM>)` hacia el calendario;
 * todo lo demás se muestra como texto plano (sin HTML).
 */
export function TextoFidel({ texto, enCurso }: { texto: string; enCurso?: boolean }) {
  const fidel = useFidelOpcional()
  const visible = textoVisible(texto, enCurso)
  const partes: ReactNode[] = []
  let desde = 0
  for (const m of visible.matchAll(ENLACE)) {
    if (m.index > desde) partes.push(visible.slice(desde, m.index))
    const cita = destinoCalendario(m[2]!)
    partes.push(
      cita ? (
        <Link
          key={m.index}
          to="/"
          search={(prev) => ({ ...prev, ...cita })}
          onClick={fidel?.alCitar}
          className="rounded-sm font-semibold text-accent-ink underline decoration-accent-ink/40 underline-offset-4 transition-colors duration-(--dur-fast) hover:decoration-accent-ink"
        >
          {m[1]}
        </Link>
      ) : (
        m[1]
      ),
    )
    desde = m.index + m[0].length
  }
  if (desde < visible.length) partes.push(visible.slice(desde))
  return (
    <p className="leading-7 break-words whitespace-pre-wrap">
      {partes}
      {enCurso && <Cursor />}
    </p>
  )
}
