import { ChevronLeft, ChevronRight } from 'lucide-react'
import { nombreMes, desplazarMes } from '@/lib/fecha'
import { cn } from '@/lib/utils'
import type { Tipo } from './agrupar'

const boton =
  'inline-grid min-h-10 min-w-10 place-items-center rounded-md border border-line bg-raised px-3 text-sm font-semibold hover:border-line-strong'

interface Props {
  mes: string
  ocultar: readonly Tipo[]
  cuentas: Record<Tipo, number> | null
  onMes: (mes: string) => void
  onHoy: () => void
  onFiltro: (tipo: Tipo) => void
}

const FILTROS: { tipo: Tipo; texto: string }[] = [
  { tipo: 'publicada', texto: 'Publicadas' },
  { tipo: 'idea', texto: 'Sugeridas' },
]

export function BarraMes({ mes, ocultar, cuentas, onMes, onHoy, onFiltro }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
      <h2 aria-live="polite" className="mr-auto text-2xl font-extrabold tracking-tight">
        {nombreMes(mes)}
      </h2>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={boton}
          aria-label={`Mes anterior, ${nombreMes(desplazarMes(mes, -1))}`}
          onClick={() => onMes(desplazarMes(mes, -1))}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <button type="button" className={boton} onClick={onHoy}>
          Hoy
        </button>
        <button
          type="button"
          className={boton}
          aria-label={`Mes siguiente, ${nombreMes(desplazarMes(mes, 1))}`}
          onClick={() => onMes(desplazarMes(mes, 1))}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div role="group" aria-label="Filtrar por tipo" className="flex w-full gap-2 sm:w-auto">
        {FILTROS.map(({ tipo, texto }) => {
          const visible = !ocultar.includes(tipo)
          return (
            <button
              key={tipo}
              type="button"
              aria-pressed={visible}
              onClick={() => onFiltro(tipo)}
              className={cn(
                'inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold sm:flex-none',
                visible
                  ? tipo === 'idea'
                    ? 'border-dashed border-accent bg-accent-soft text-accent-ink'
                    : 'border-line-strong bg-raised text-ink'
                  : 'border-line text-muted line-through decoration-1 hover:text-ink',
              )}
            >
              {texto}
              {cuentas && <span className="font-mono text-xs">{cuentas[tipo]}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
