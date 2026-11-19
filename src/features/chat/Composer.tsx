import { ArrowUp, Square } from 'lucide-react'
import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Boton } from '@/components/ui/Boton'
import { cn } from '@/lib/utils'
import { MAX_CARACTERES } from './tipos'

interface Props {
  /** Fidel está respondiendo: se puede ir escribiendo, pero no enviar. */
  ocupado: boolean
  onEnviar: (texto: string) => boolean
  onDetener: () => void
  /** Chip de la publicación sobre la que se pregunta; va arriba del campo. */
  contexto?: ReactNode
}

/** Una línea (44px) hasta unas seis. */
const ALTO_MIN = 44
const ALTO_MAX = 164

const ICONO = 'absolute transition-[opacity,transform] duration-(--dur-fast) ease-brand'

export function Composer({ ocupado, onEnviar, onDetener, contexto }: Props) {
  const [texto, setTexto] = useState('')
  const area = useRef<HTMLTextAreaElement>(null)
  const idAyuda = useId()
  const puedeEnviar = !ocupado && texto.trim().length > 0

  // Crece con el contenido. Para que el cambio de alto sea una transición y no un salto,
  // se mide con `auto` y se vuelve al alto anterior antes de fijar el nuevo.
  useLayoutEffect(() => {
    const el = area.current
    if (!el) return
    const previo = el.style.height
    el.style.transition = 'none'
    el.style.height = 'auto'
    const contenido = el.scrollHeight
    const nuevo = `${Math.max(ALTO_MIN, Math.min(contenido, ALTO_MAX))}px`
    if (previo && previo !== nuevo) {
      el.style.height = previo
      void el.offsetHeight
    }
    el.style.transition = ''
    el.style.height = nuevo
    el.style.overflowY = contenido > ALTO_MAX ? 'auto' : 'hidden'
  }, [texto])

  function enviar() {
    if (!puedeEnviar) return
    if (onEnviar(texto)) setTexto('')
  }

  function alTeclear(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return
    e.preventDefault()
    enviar()
  }

  const quedan = MAX_CARACTERES - texto.length
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        enviar()
      }}
      className="rounded-xl border border-glass-line bg-glass p-2 shadow-pop backdrop-blur-xl backdrop-saturate-150 transition-[border-color] duration-(--dur-fast) ease-brand focus-within:border-line-strong"
    >
      {contexto}
      <div className="flex items-end gap-2">
        <label htmlFor={`${idAyuda}-area`} className="sr-only">
          Escribile a Fidel
        </label>
        <textarea
          id={`${idAyuda}-area`}
          ref={area}
          rows={1}
          value={texto}
          maxLength={MAX_CARACTERES}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={alTeclear}
          placeholder="Escribile a Fidel…"
          aria-describedby={idAyuda}
          enterKeyHint="send"
          className="min-h-11 flex-1 resize-none overscroll-contain bg-transparent px-2 py-2.5 text-base leading-6 outline-none transition-[height] duration-(--dur-fast) ease-brand placeholder:text-muted"
        />
        <span id={idAyuda} className="sr-only">
          Enter envía, Shift más Enter hace un salto de línea. Máximo {MAX_CARACTERES} caracteres.
        </span>
        <div className="flex shrink-0 flex-col items-center gap-1.5">
          {quedan <= 100 && (
            <span
              className={cn(
                'cifra animate-aparecer font-mono text-xs [animation-duration:var(--dur-base)]',
                quedan <= 20 ? 'text-danger' : 'text-muted',
              )}
              aria-live="off"
            >
              {quedan}
            </span>
          )}
          {/* Un solo botón que cambia de oficio: enviar en reposo, detener mientras Fidel responde. */}
          <Boton
            variante="primario"
            tamano="icono"
            disabled={!ocupado && !puedeEnviar}
            onClick={ocupado ? onDetener : enviar}
            aria-label={ocupado ? 'Detener respuesta' : 'Enviar'}
            className={cn('relative rounded-lg', ocupado && 'bg-ink text-surface hover:bg-ink/85')}
          >
            <ArrowUp
              className={cn(ICONO, 'size-5', ocupado && 'scale-50 opacity-0')}
              aria-hidden="true"
            />
            <Square
              className={cn(ICONO, 'size-3.5 fill-current', !ocupado && 'scale-50 opacity-0')}
              aria-hidden="true"
            />
          </Boton>
        </div>
      </div>
    </form>
  )
}
