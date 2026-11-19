import { ChevronDown, PencilLine, RotateCw } from 'lucide-react'
import { useId, useState } from 'react'
import { Boton } from '@/components/ui/Boton'
import type { Programada } from '@/domain/types'
import { cn } from '@/lib/utils'
import { TarjetaProgramada } from './TarjetaProgramada'

interface Props {
  borradores: Programada[]
  /** No se pudo traer la lista (no frena al calendario, que ya cargó). */
  error?: boolean
  onReintentar?: () => void
  onAbrir: (id: string) => void
}

/**
 * Borradores sin fecha. No son de ningún día, así que no caben en la grilla: viven en una fila
 * plegada arriba de ella, siempre a la vista con su conteo, y se abren con un toque. Sin borradores
 * (o con el filtro «Programadas» apagado) no se dibuja nada.
 */
export function SinFecha({ borradores, error = false, onReintentar, onAbrir }: Props) {
  const [abierto, setAbierto] = useState(false)
  const idLista = useId()
  if (error)
    return (
      <p
        role="status"
        className="flex flex-wrap items-center gap-2 rounded-xl bg-inset/60 px-3 py-2 text-sm text-muted"
      >
        No pudimos cargar los borradores sin fecha.
        {onReintentar && (
          <Boton tamano="sm" onClick={onReintentar}>
            <RotateCw className="size-3.5" aria-hidden="true" />
            Reintentar
          </Boton>
        )}
      </p>
    )
  if (!borradores.length) return null
  return (
    <section
      aria-label="Borradores sin fecha"
      className="animate-aparecer rounded-xl border border-line-strong bg-inset"
    >
      <h3 className="m-0 text-sm">
        <button
          type="button"
          aria-expanded={abierto}
          aria-controls={idLista}
          onClick={() => setAbierto((v) => !v)}
          className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left font-bold transition-colors duration-(--dur-fast) hover:bg-raised/60"
        >
          <PencilLine className="size-4 shrink-0 text-muted" strokeWidth={2.5} aria-hidden="true" />
          Borradores sin fecha
          <span className="cifra font-mono text-xs font-medium text-muted">
            {borradores.length}
          </span>
          <ChevronDown
            className={cn(
              'ml-auto size-4 shrink-0 text-muted transition-transform duration-(--dur-fast) ease-brand',
              abierto && 'rotate-180',
            )}
            aria-hidden="true"
          />
        </button>
      </h3>
      {abierto && (
        <ul id={idLista} className="flex flex-col gap-2.5 px-3 pt-1 pb-3">
          {borradores.map((b) => (
            <li key={b.id}>
              <TarjetaProgramada pieza={b} conFecha={false} onClick={() => onAbrir(b.id)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
