import { Check, ChevronDown, Copy, RefreshCw } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Portada } from '@/components/Portada'
import { Boton } from '@/components/ui/Boton'
import type { Idea } from '@/domain/types'
import { Campo, Seccion, VozFidel } from './Cabecera'
import { cuando } from './formato'

const SALIDA_EXPO = [0.22, 1, 0.36, 1] as const

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
      toast.success('Copy copiado. Pegalo en Instagram.')
    } catch {
      setCopiado(false)
      setFalloCopia(true)
      toast.error('No pudimos copiarlo. Seleccioná el texto y copialo a mano.')
    }
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setCopiado(false)
      setFalloCopia(false)
    }, 2000)
  }

  return (
    <div className="space-y-7">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 border-b border-hairline pb-5">
        <Campo etiqueta="Red">Instagram</Campo>
        <Campo etiqueta="Formato">{idea.formato}</Campo>
        <div className="col-span-2">
          <Campo etiqueta="Día y hora sugeridos">
            <span className="cifra inline-block first-letter:uppercase">{cuando(idea.fecha)}</span>
          </Campo>
        </div>
      </dl>

      <Seccion titulo="Idea de portada">
        <div className="flex gap-4">
          <div className="aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-lg ring-1 ring-hairline">
            <Portada url={null} idea mini />
          </div>
          <p className="text-[15px] leading-relaxed">{idea.ideaPortada}</p>
        </div>
      </Seccion>

      <VozFidel
        titulo="Copy propuesto"
        accion={
          total > 0 && (
            <span className="cifra font-mono text-xs text-muted" aria-live="polite">
              {i + 1} de {total}
            </span>
          )
        }
      >
        {total === 0 ? (
          <p className="text-sm text-muted">Fidel todavía no tiene un copy para esta idea.</p>
        ) : (
          <blockquote className="relative rounded-xl bg-surface/70 p-4 ring-1 ring-hairline">
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.32, ease: SALIDA_EXPO }}
              className="whitespace-pre-line text-[15px] leading-relaxed"
            >
              {copy}
            </motion.p>
          </blockquote>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Boton tamano="sm" onClick={copiar} disabled={total === 0} aria-label="Copiar copy">
            <span className="relative grid size-4 place-items-center" aria-hidden="true">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  key={copiado ? 'ok' : 'copiar'}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.16 }}
                  className="grid place-items-center"
                >
                  {copiado ? (
                    <Check className="size-4 text-success" strokeWidth={2.5} />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </motion.span>
              </AnimatePresence>
            </span>
            Copiar
          </Boton>
          {total > 1 && (
            <Boton
              tamano="sm"
              variante="fantasma"
              onClick={() => setI((x) => (x + 1) % total)}
              aria-label="Otra propuesta"
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Otra propuesta
            </Boton>
          )}
          <span role="status" className="sr-only">
            {copiado ? 'Copiado' : falloCopia ? 'No pudimos copiarlo, seleccionalo a mano.' : ''}
          </span>
        </div>
      </VozFidel>

      <details className="group rounded-xl ring-1 ring-line">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-4 text-sm font-bold transition-colors duration-(--dur-fast) hover:bg-raised [&::-webkit-details-marker]:hidden">
          Por qué esta propuesta
          <ChevronDown
            className="size-4 text-muted transition-transform duration-(--dur-base) ease-brand group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <ul className="space-y-2.5 px-4 pt-1 pb-4 text-sm leading-relaxed">
          {idea.porQue.map((p, idx) => (
            <li key={`${idx}-${p}`} className="flex gap-2.5">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
              {p}
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}
