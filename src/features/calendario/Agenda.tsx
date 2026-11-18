import { ChevronRight, Plus } from 'lucide-react'
import { EtiquetaTipo } from '@/components/EtiquetaTipo'
import { Boton } from '@/components/ui/Boton'
import { IconoRed } from '@/components/IconoRed'
import { Portada } from '@/components/Portada'
import { hora } from '@/lib/fecha'
import { mayuscula, nombreDia, type ItemCalendario } from './agrupar'
import { num } from '@/lib/formato'
import { NOMBRE_RED } from '@/lib/redes'
import type { Rendimientos } from './Grilla'
import { IndicadorRendimiento } from './Rendimiento'
import { TarjetaProgramada } from './TarjetaProgramada'

interface Props {
  dia: string
  hoy: string
  items: ItemCalendario[]
  rendimientos: Rendimientos
  /** Cuántas hay ese día pero están ocultas por los filtros. */
  ocultas: number
  /** Con publicar y programar prendido, todo lleva su red y el vacío nombra las piezas programadas. */
  conRed?: boolean
  onItem: (item: ItemCalendario) => void
  /** Abre «Nueva publicación» con este día. Solo con publicar prendido y desde hoy en adelante. */
  onProgramar?: () => void
}

/** Lista de tarjetas del día seleccionado. */
export function Agenda({
  dia,
  hoy,
  items,
  rendimientos,
  ocultas,
  conRed = false,
  onItem,
  onProgramar,
}: Props) {
  return (
    <section aria-labelledby="agenda-titulo" className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h3 id="agenda-titulo" className="text-lg font-extrabold tracking-tight">
          {mayuscula(nombreDia(dia))}
          {dia === hoy && <span className="font-semibold text-muted"> · hoy</span>}
        </h3>
        {onProgramar && dia >= hoy && (
          <Boton tamano="sm" onClick={onProgramar}>
            <Plus className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
            Programar acá
          </Boton>
        )}
      </div>
      {items.length === 0 ? (
        <div
          key={dia}
          className="mt-3 animate-aparecer rounded-xl bg-inset/60 px-4 py-8 text-center"
        >
          <p className="font-semibold">Nada para este día.</p>
          <p className="mt-1 text-sm text-muted">
            {ocultas > 0
              ? `Hay ${ocultas} oculta${ocultas === 1 ? '' : 's'} por los filtros.`
              : conRed
                ? 'No hay publicaciones, piezas programadas ni ideas de Fidel.'
                : 'No hay publicaciones ni ideas de Fidel.'}
          </p>
        </div>
      ) : (
        <ul key={dia} className="mt-3 flex flex-col gap-2.5">
          {items.map((it, i) => {
            if (it.tipo === 'programada')
              return (
                <li
                  key={it.id}
                  className="animate-aparecer [animation-duration:var(--dur-base)]"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <TarjetaProgramada pieza={it} conFecha onClick={() => onItem(it)} />
                </li>
              )
            const rendimiento = it.tipo === 'publicada' ? rendimientos.get(it.id) : undefined
            // Con publicar prendido (o si la publicación ya es de TikTok) se dice y se ve la red.
            const red =
              it.tipo === 'publicada' && (conRed || it.red !== 'instagram') ? it.red : null
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
                      {red && (
                        <span className="inline-flex items-center gap-1 text-muted">
                          <IconoRed red={red} className="size-3.5" />
                          {NOMBRE_RED[red]}
                        </span>
                      )}
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
