import { Check, Sparkles } from 'lucide-react'
import { Portada } from '@/components/Portada'
import type { Item } from '@/domain/types'
import { diasDeGrilla, hora } from '@/lib/fecha'
import { cn } from '@/lib/utils'
import { nombreDia, resumenDia } from './agrupar'

const SEMANA = [
  ['Lun', 'L', 'lunes'],
  ['Mar', 'M', 'martes'],
  ['Mié', 'X', 'miércoles'],
  ['Jue', 'J', 'jueves'],
  ['Vie', 'V', 'viernes'],
  ['Sáb', 'S', 'sábado'],
  ['Dom', 'D', 'domingo'],
] as const

/** Cuántos chips entran en una celda de escritorio antes del "+N más". */
const MAX_CHIPS = 2

interface Props {
  mes: string
  hoy: string
  /** Día resaltado (YYYY-MM-DD) o null. */
  seleccionado: string | null
  porDia: Map<string, Item[]>
  escritorio: boolean
  onDia: (dia: string) => void
  onItem: (item: Item) => void
}

export function Grilla({ mes, hoy, seleccionado, porDia, escritorio, onDia, onItem }: Props) {
  return (
    <div>
      <div className="grid grid-cols-7 pb-1 text-center text-xs font-bold text-muted" aria-hidden>
        {SEMANA.map(([largo, corto]) => (
          <span key={corto}>{escritorio ? largo : corto}</span>
        ))}
      </div>
      <ul
        aria-label="Días del mes"
        className={cn(
          'grid grid-cols-7',
          escritorio && 'overflow-hidden rounded-lg border-t border-l border-line',
        )}
      >
        {diasDeGrilla(mes).map((dia) => {
          const delMes = dia.startsWith(mes)
          const items = porDia.get(dia) ?? []
          const esHoy = dia === hoy
          const nombre = `${nombreDia(dia)}${esHoy ? ', hoy' : ''}: ${resumenDia(items)}`
          const numero = Number(dia.slice(8))
          const marcado = dia === seleccionado
          if (!escritorio)
            return (
              <li key={dia} className="flex justify-center">
                {delMes && (
                  <button
                    type="button"
                    aria-label={nombre}
                    aria-pressed={marcado}
                    onClick={() => onDia(dia)}
                    className={cn(
                      'flex min-h-14 w-full flex-col items-center gap-1 rounded-md py-1.5',
                      marcado && 'bg-raised ring-1 ring-line-strong',
                    )}
                  >
                    <NumeroDia numero={numero} esHoy={esHoy} />
                    <Puntos items={items} />
                  </button>
                )}
              </li>
            )
          return (
            <li
              key={dia}
              className={cn(
                'flex min-h-28 flex-col gap-1 border-r border-b border-line p-1.5',
                !delMes && 'bg-inset/50',
              )}
            >
              {delMes && (
                <>
                  <button
                    type="button"
                    aria-label={nombre}
                    aria-pressed={marcado}
                    onClick={() => onDia(dia)}
                    className="self-start rounded-full hover:bg-inset aria-pressed:ring-1 aria-pressed:ring-line-strong"
                  >
                    <NumeroDia numero={numero} esHoy={esHoy} />
                  </button>
                  {items.slice(0, MAX_CHIPS).map((it) => (
                    <Chip key={it.id} item={it} onClick={() => onItem(it)} />
                  ))}
                  {items.length > MAX_CHIPS && (
                    <button
                      type="button"
                      onClick={() => onDia(dia)}
                      aria-label={`Ver ${items.length - MAX_CHIPS} ${items.length - MAX_CHIPS === 1 ? 'publicación más' : 'publicaciones más'} del ${nombreDia(dia)}`}
                      className="self-start rounded-sm px-1 text-xs font-bold text-muted hover:text-ink"
                    >
                      +{items.length - MAX_CHIPS} más
                    </button>
                  )}
                </>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function NumeroDia({ numero, esHoy }: { numero: number; esHoy: boolean }) {
  return (
    <span
      className={cn(
        'grid size-7 place-items-center rounded-full text-sm font-semibold',
        esHoy && 'bg-accent font-extrabold text-on-accent',
      )}
    >
      {numero}
    </span>
  )
}

/** Un punto por publicación: lleno = publicada, anillo de acento = sugerida. */
function Puntos({ items }: { items: Item[] }) {
  return (
    <span className="flex h-2 items-center gap-1" aria-hidden="true">
      {items.slice(0, 3).map((it) => (
        <span
          key={it.id}
          className={cn(
            'size-2 rounded-full',
            it.tipo === 'publicada' ? 'bg-muted' : 'border border-accent-ink bg-accent-soft',
          )}
        />
      ))}
    </span>
  )
}

function Chip({ item, onClick }: { item: Item; onClick: () => void }) {
  const publicada = item.tipo === 'publicada'
  const Icono = publicada ? Check : Sparkles
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${hora(item.fecha)} ${item.formato}, ${publicada ? 'publicada' : 'sugerida'}`}
      className={cn(
        'flex w-full min-w-0 items-center gap-1.5 rounded-md border p-1 text-left text-[11px] leading-tight',
        publicada
          ? 'border-line bg-inset hover:border-line-strong'
          : 'border-dashed border-accent bg-accent-soft text-accent-ink hover:border-accent-ink',
      )}
    >
      <span className="aspect-[4/5] w-5 shrink-0 overflow-hidden rounded-[3px]">
        <Portada url={publicada ? item.portadaUrl : null} mini />
      </span>
      <span className="min-w-0 flex-1 truncate">
        <span className="font-mono font-medium">{hora(item.fecha)}</span> {item.formato}
      </span>
      <Icono className="size-3 shrink-0" strokeWidth={3} aria-hidden="true" />
    </button>
  )
}
