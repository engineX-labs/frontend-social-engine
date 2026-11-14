import { Check, ChevronDown, Copy, RefreshCw, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Idea } from '@/domain/types'
import { Campo, Seccion } from './Cabecera'
import { cuando } from './formato'

export function DetalleIdea({ idea }: { idea: Idea }) {
  const [i, setI] = useState(0)
  const [copiado, setCopiado] = useState(false)
  const [falloCopia, setFalloCopia] = useState(false)
  const timer = useRef<number>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const total = idea.copyPropuestas.length
  const copy = idea.copyPropuestas[i] ?? ''

  async function copiar() {
    try {
      await navigator.clipboard.writeText(copy)
      setCopiado(true)
      setFalloCopia(false)
    } catch {
      setCopiado(false)
      setFalloCopia(true)
    }
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setCopiado(false)
      setFalloCopia(false)
    }, 2000)
  }

  const boton =
    'inline-flex items-center gap-2 rounded-md border border-line bg-raised px-3 py-2 text-sm font-semibold hover:border-line-strong'

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-line bg-raised p-4">
        <Campo etiqueta="Red">Instagram</Campo>
        <Campo etiqueta="Formato">{idea.formato}</Campo>
        <div className="col-span-2">
          <Campo etiqueta="Día y hora sugeridos">{cuando(idea.fecha)}</Campo>
        </div>
      </dl>

      <Seccion titulo="Idea de portada">
        <p className="text-[15px] leading-relaxed">{idea.ideaPortada}</p>
      </Seccion>

      <section className="space-y-3 rounded-lg border border-dashed border-accent bg-accent-soft p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-accent-ink">
            <Sparkles className="size-4" aria-hidden="true" />
            Copy propuesto
          </h3>
          <span className="font-mono text-xs text-muted">
            {i + 1} de {total}
          </span>
        </div>
        <p className="whitespace-pre-line text-[15px] leading-relaxed">{copy}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={copiar} className={boton}>
            {copiado ? (
              <Check className="size-4 text-success" aria-hidden="true" />
            ) : (
              <Copy className="size-4" aria-hidden="true" />
            )}
            Copiar copy
          </button>
          {total > 1 && (
            <button type="button" onClick={() => setI((x) => (x + 1) % total)} className={boton}>
              <RefreshCw className="size-4" aria-hidden="true" />
              Otra propuesta
            </button>
          )}
          <span role="status" className="text-sm text-muted">
            {copiado ? 'Copiado' : falloCopia ? 'No pudimos copiarlo, seleccionalo a mano.' : ''}
          </span>
        </div>
      </section>

      <details className="group rounded-lg border border-line bg-raised">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 text-sm font-bold [&::-webkit-details-marker]:hidden">
          Por qué esta propuesta
          <ChevronDown
            className="size-4 text-muted transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <ul className="list-disc space-y-2 px-4 pb-4 pl-8 text-sm leading-relaxed">
          {idea.porQue.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </details>
    </div>
  )
}
