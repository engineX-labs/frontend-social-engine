import { Portada } from '@/components/Portada'
import { Esqueleto } from '@/components/ui/Esqueleto'
import type { ClaseRendimiento } from '@/domain/metrics'
import type { Item } from '@/domain/types'
import { diasDeGrilla, hora } from '@/lib/fecha'
import { cn } from '@/lib/utils'
import { nombreDia, resumenDia } from './agrupar'
import { IndicadorRendimiento } from './Rendimiento'

const SEMANA = [
  ['Lun', 'L'],
  ['Mar', 'M'],
  ['Mié', 'X'],
  ['Jue', 'J'],
  ['Vie', 'V'],
  ['Sáb', 'S'],
  ['Dom', 'D'],
] as const

/** Cuántos chips entran en una celda de escritorio antes del "+N más". */
const MAX_CHIPS = 2

/** Rendimiento de cada publicada contra la mediana, por id. */
export type Rendimientos = ReadonlyMap<string, { razon: number; clase: ClaseRendimiento }>

interface Props {
  mes: string
  hoy: string
  /** Día resaltado (YYYY-MM-DD) o null. */
  seleccionado: string | null
  porDia: Map<string, Item[]>
  rendimientos: Rendimientos
  escritorio: boolean
  onDia: (dia: string) => void
  /** "+N más": elige el día sin alternar (siempre abre su agenda). */
  onMas: (dia: string) => void
  onItem: (item: Item) => void
}

function Encabezado({ escritorio }: { escritorio: boolean }) {
  return (
    <div className="grid grid-cols-7 pb-2 text-center rotulo" aria-hidden>
      {SEMANA.map(([largo, corto]) => (
        <span key={corto}>{escritorio ? largo : corto}</span>
      ))}
    </div>
  )
}

export function Grilla({
  mes,
  hoy,
  seleccionado,
  porDia,
  rendimientos,
  escritorio,
  onDia,
  onMas,
  onItem,
}: Props) {
  return (
    <div>
      <Encabezado escritorio={escritorio} />
      <ul
        aria-label="Días del mes"
        className={cn(
          'grid grid-cols-7',
          escritorio
            ? 'overflow-hidden rounded-xl border-t border-l border-line bg-surface shadow-card'
            : 'gap-y-1',
        )}
      >
        {diasDeGrilla(mes).map((dia, indice) => {
          const delMes = dia.startsWith(mes)
          const items = porDia.get(dia) ?? []
          const esHoy = dia === hoy
          const nombre = `${nombreDia(dia)}${esHoy ? ', hoy' : ''}: ${resumenDia(items)}`
          const numero = Number(dia.slice(8))
          const marcado = dia === seleccionado
          if (!escritorio)
            return (
              <li key={dia} className="flex justify-center">
                {delMes ? (
                  <button
                    type="button"
                    aria-label={nombre}
                    aria-pressed={marcado}
                    onClick={() => onDia(dia)}
                    className={cn(
                      'flex min-h-14 w-full flex-col items-center gap-1.5 rounded-lg py-1.5 transition-[background-color,box-shadow,transform] duration-(--dur-fast) ease-brand active:scale-95',
                      marcado && 'bg-raised shadow-card ring-1 ring-line-strong',
                    )}
                  >
                    <NumeroDia numero={numero} esHoy={esHoy} />
                    <Puntos items={items} rendimientos={rendimientos} />
                  </button>
                ) : (
                  <span className="flex min-h-14 w-full flex-col items-center py-1.5" aria-hidden>
                    <NumeroDia numero={numero} fuera />
                  </span>
                )}
              </li>
            )
          return (
            <li
              key={dia}
              className={cn(
                'group/celda relative flex min-h-32 flex-col gap-1 border-r border-b border-line p-1.5 transition-colors duration-(--dur-fast) ease-brand',
                !delMes && 'bg-inset/40',
                delMes && !marcado && 'hover:bg-raised/60',
                marcado && 'bg-raised',
              )}
            >
              {marcado && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 ring-2 ring-accent/70 ring-inset"
                />
              )}
              {delMes ? (
                <>
                  <button
                    type="button"
                    aria-label={nombre}
                    aria-pressed={marcado}
                    onClick={() => onDia(dia)}
                    className="self-start rounded-full transition-colors duration-(--dur-fast) hover:bg-inset"
                  >
                    <NumeroDia numero={numero} esHoy={esHoy} />
                  </button>
                  {items.slice(0, MAX_CHIPS).map((it, i) => (
                    <Chip
                      key={it.id}
                      item={it}
                      rendimiento={rendimientos.get(it.id)}
                      retraso={Math.min(indice, 34) * 12 + i * 30}
                      onClick={() => onItem(it)}
                    />
                  ))}
                  {items.length > MAX_CHIPS && (
                    <button
                      type="button"
                      onClick={() => onMas(dia)}
                      aria-label={`Ver ${items.length - MAX_CHIPS} ${items.length - MAX_CHIPS === 1 ? 'publicación más' : 'publicaciones más'} del ${nombreDia(dia)}`}
                      className="self-start rounded-md px-1.5 py-0.5 text-xs font-bold text-muted transition-colors duration-(--dur-fast) hover:bg-inset hover:text-ink"
                    >
                      +{items.length - MAX_CHIPS} más
                    </button>
                  )}
                </>
              ) : (
                <span aria-hidden className="self-start">
                  <NumeroDia numero={numero} fuera />
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Misma silueta que la grilla mientras carga el mes. */
export function GrillaEsqueleto({ escritorio }: { escritorio: boolean }) {
  return (
    <div aria-hidden>
      <Encabezado escritorio={escritorio} />
      <div
        className={cn(
          'grid grid-cols-7',
          escritorio ? 'overflow-hidden rounded-xl border-t border-l border-line' : 'gap-y-1',
        )}
      >
        {Array.from({ length: 35 }, (_, i) =>
          escritorio ? (
            <div
              key={i}
              className="flex min-h-32 flex-col gap-1.5 border-r border-b border-line p-1.5"
            >
              <Esqueleto className="size-7 rounded-full" />
              {i % 3 === 1 && <Esqueleto className="h-9 w-full" />}
            </div>
          ) : (
            <div key={i} className="flex min-h-14 flex-col items-center gap-1.5 py-1.5">
              <Esqueleto className="size-7 rounded-full" />
            </div>
          ),
        )}
      </div>
    </div>
  )
}

function NumeroDia({ numero, esHoy, fuera }: { numero: number; esHoy?: boolean; fuera?: boolean }) {
  return (
    <span
      className={cn(
        'cifra grid size-7 place-items-center rounded-full text-sm font-semibold',
        esHoy && 'bg-accent font-extrabold text-on-accent',
        fuera && 'font-medium text-muted/55',
      )}
    >
      {numero}
    </span>
  )
}

const COLOR_PUNTO: Record<ClaseRendimiento, string> = {
  sube: 'bg-success',
  normal: 'bg-muted',
  baja: 'bg-danger',
}

/** Un punto por pieza: las publicadas con el color de su rendimiento, las ideas con el de Fidel. */
function Puntos({ items, rendimientos }: { items: Item[]; rendimientos: Rendimientos }) {
  return (
    <span className="flex h-2 items-center gap-1" aria-hidden="true">
      {items.slice(0, 3).map((it) => (
        <span
          key={it.id}
          className={cn(
            'size-1.5 rounded-full',
            it.tipo === 'publicada'
              ? COLOR_PUNTO[rendimientos.get(it.id)?.clase ?? 'normal']
              : 'fidel-gradiente',
          )}
        />
      ))}
    </span>
  )
}

function Chip({
  item,
  rendimiento,
  retraso,
  onClick,
}: {
  item: Item
  rendimiento?: { razon: number; clase: ClaseRendimiento }
  retraso: number
  onClick: () => void
}) {
  const publicada = item.tipo === 'publicada'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${hora(item.fecha)} ${item.formato}, ${publicada ? 'publicada' : 'sugerida'}`}
      style={{ animationDelay: `${retraso}ms` }}
      className={cn(
        'flex w-full min-w-0 animate-aparecer items-center gap-2 rounded-lg border p-1 pr-1.5 text-left text-xs leading-tight [animation-duration:var(--dur-base)]',
        'transition-[border-color,background-color,transform] duration-(--dur-fast) ease-brand active:scale-[0.97]',
        publicada
          ? 'border-line bg-raised hover:border-line-strong'
          : 'border-dashed border-accent/70 bg-accent-soft/60 hover:border-accent',
      )}
    >
      <span className="aspect-[4/5] w-7 shrink-0 overflow-hidden rounded-[5px]">
        <Portada url={publicada ? item.portadaUrl : null} idea={!publicada} mini />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="cifra font-mono text-[11px] font-medium text-muted">
          {hora(item.fecha)}
        </span>
        <span className={cn('truncate font-semibold', !publicada && 'text-accent-ink')}>
          {item.formato}
        </span>
      </span>
      {publicada && rendimiento && <IndicadorRendimiento rendimiento={rendimiento} />}
    </button>
  )
}
