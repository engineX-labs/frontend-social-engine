import { ChevronRight } from 'lucide-react'
import { EtiquetaTipo } from '@/components/EtiquetaTipo'
import { Portada } from '@/components/Portada'
import type { Item } from '@/domain/types'
import { hora } from '@/lib/fecha'
import { mayuscula, nombreDia } from './agrupar'
import { num } from '@/lib/formato'
import type { Rendimientos } from './Grilla'
import { IndicadorRendimiento } from './Rendimiento'

interface Props {
  dia: string
  hoy: string
  items: Item[]
  rendimientos: Rendimientos
  /** Cuántas hay ese día pero están ocultas por los filtros. */
  ocultas: number
  onItem: (item: Item) => void
}

/** Lista de tarjetas del día seleccionado. */
export function Agenda({ dia, hoy, items, rendimientos, ocultas, onItem }: Props) {
  return (
    <section aria-labelledby="agenda-titulo" className="mt-4">
      <h3 id="agenda-titulo" className="text-lg font-extrabold tracking-tight">
        {mayuscula(nombreDia(dia))}
        {dia === hoy && <span className="font-semibold text-muted"> · hoy</span>}
      </h3>
      {items.length === 0 ? (
        <div
          key={dia}
          className="mt-3 animate-aparecer rounded-xl bg-inset/60 px-4 py-8 text-center"
        >
          <p className="font-semibold">Nada para este día.</p>
          <p className="mt-1 text-sm text-muted">
            {ocultas > 0
              ? `Hay ${ocultas} oculta${ocultas === 1 ? '' : 's'} por los filtros.`
              : 'No hay publicaciones ni ideas de Fidel.'}
          </p>
        </div>
      ) : (
        <ul key={dia} className="mt-3 flex flex-col gap-2.5">
          {items.map((it, i) => {
            const rendimiento = it.tipo === 'publicada' ? rendimientos.get(it.id) : undefined
            return (
              <li
                key={it.id}
                className="animate-aparecer [animation-duration:var(--dur-base)]"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <button
                  type="button"
                  onClick={() => onItem(it)}
                  className="group flex w-full items-center gap-3.5 rounded-xl border border-line bg-raised p-2.5 text-left shadow-card transition-[border-color,transform] duration-(--dur-fast) ease-brand hover:border-line-strong active:scale-[0.98]"
                >
                  <span className="aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-lg">
                    <Portada
                      url={it.tipo === 'publicada' ? it.portadaUrl : null}
                      idea={it.tipo === 'idea'}
                    />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      <span className="cifra font-mono font-medium text-muted">
                        {hora(it.fecha)}
                      </span>
                      <span className="font-bold">{it.formato}</span>
                      <EtiquetaTipo tipo={it.tipo} className="ml-auto" />
                    </span>
                    <span className="line-clamp-2 text-sm leading-snug text-muted">
                      {it.tipo === 'publicada' ? it.copy : it.ideaPortada}
                    </span>
                    {it.tipo === 'publicada' && (
                      <span className="flex items-center gap-2 text-xs">
                        <span>
                          <b className="cifra font-bold">{num(it.alcance)}</b>{' '}
                          <span className="text-muted">de alcance</span>
                        </span>
                        {rendimiento && <IndicadorRendimiento rendimiento={rendimiento} conTexto />}
                      </span>
                    )}
                  </span>
                  <ChevronRight
                    className="size-4 shrink-0 text-muted transition-transform duration-(--dur-fast) ease-brand group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
