import { ArrowUp, Square } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { MAX_CARACTERES } from './tipos'

interface Props {
  /** Fidel está respondiendo: se puede ir escribiendo, pero no enviar. */
  ocupado: boolean
  onEnviar: (texto: string) => boolean
  onDetener: () => void
}

export function Composer({ ocupado, onEnviar, onDetener }: Props) {
  const [texto, setTexto] = useState('')
  const area = useRef<HTMLTextAreaElement>(null)
  const idAyuda = useId()
  const puedeEnviar = !ocupado && texto.trim().length > 0

  // Crece con el contenido hasta ~6 líneas.
  useEffect(() => {
    const el = area.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
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
      className="flex items-end gap-2 rounded-xl border border-line bg-raised p-2 focus-within:border-line-strong"
    >
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
        className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-base leading-6 outline-none placeholder:text-muted"
      />
      <span id={idAyuda} className="sr-only">
        Enter envía, Shift más Enter hace un salto de línea. Máximo {MAX_CARACTERES} caracteres.
      </span>
      {quedan <= 100 && (
        <span
          className={`self-center font-mono text-xs ${quedan <= 20 ? 'text-danger' : 'text-muted'}`}
          aria-live="off"
        >
          {quedan}
        </span>
      )}
      {ocupado ? (
        <button
          type="button"
          onClick={onDetener}
          aria-label="Detener respuesta"
          className="inline-grid size-10 shrink-0 place-items-center rounded-lg border border-line-strong bg-inset hover:border-ink"
        >
          <Square className="size-4 fill-current" aria-hidden="true" />
        </button>
      ) : (
        <button
          type="submit"
          disabled={!puedeEnviar}
          aria-label="Enviar"
          className="inline-grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-on-accent transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowUp className="size-5" aria-hidden="true" />
        </button>
      )}
    </form>
  )
}
