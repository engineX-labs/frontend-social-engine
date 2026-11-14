import { EtiquetaTipo } from '@/components/EtiquetaTipo'
import { Portada } from '@/components/Portada'
import type { Item } from '@/domain/types'
import { hora } from '@/lib/fecha'
import { mayuscula, nombreDia } from './agrupar'

interface Props {
  dia: string
  hoy: string
  items: Item[]
  /** Cuántas hay ese día pero están ocultas por los filtros. */
  ocultas: number
  onItem: (item: Item) => void
}

/** Lista de tarjetas del día seleccionado. */
export function Agenda({ dia, hoy, items, ocultas, onItem }: Props) {
  return (
    <section aria-labelledby="agenda-titulo" className="mt-6">
      <h3 id="agenda-titulo" className="text-base font-extrabold">
        {mayuscula(nombreDia(dia))}
        {dia === hoy && <span className="font-semibold text-muted"> · hoy</span>}
      </h3>
      {items.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-line px-4 py-8 text-center">
          <p className="font-semibold">Nada para este día.</p>
          <p className="mt-1 text-sm text-muted">
            {ocultas > 0
              ? `Hay ${ocultas} oculta${ocultas === 1 ? '' : 's'} por los filtros.`
              : 'No hay publicaciones ni ideas de Fidel.'}
          </p>
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {items.map((it) => (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => onItem(it)}
                className="flex w-full gap-3 rounded-lg border border-line bg-raised p-3 text-left hover:border-line-strong"
              >
                <span className="aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-md">
                  <Portada url={it.tipo === 'publicada' ? it.portadaUrl : null} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <span className="font-mono font-medium">{hora(it.fecha)}</span>
                    <span className="font-semibold">{it.formato}</span>
                    <EtiquetaTipo tipo={it.tipo} className="ml-auto" />
                  </span>
                  <span className="line-clamp-2 text-sm text-muted">
                    {it.tipo === 'publicada' ? it.copy : it.ideaPortada}
                  </span>
                  {it.tipo === 'publicada' && (
                    <span className="text-xs text-muted">
                      <span className="font-mono">{it.alcance.toLocaleString('es-AR')}</span> de
                      alcance
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
