import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Portada } from '@/components/Portada'
import { Esqueleto } from '@/components/ui/Esqueleto'
import { claseRendimiento } from '@/domain/metrics'
import type { CalendarioMes } from '@/domain/types'
import { cn } from '@/lib/utils'
import { claveDia } from '@/lib/fecha'
import { nombreDia } from './agrupar'
import { num } from '@/lib/formato'
import { mesEnMinuscula } from './formato'
import { IndicadorRendimiento } from './Rendimiento'
import { useConteo } from './useConteo'

const FRANJA =
  'grid grid-cols-3 overflow-hidden rounded-lg border border-line bg-raised shadow-card @min-[720px]:grid-cols-[minmax(0,1.7fr)_repeat(3,minmax(0,1fr))]'
const PROTAGONISTA =
  'col-span-3 flex min-h-24 items-center gap-3 border-b border-line p-3 text-left @min-[720px]:col-span-1 @min-[720px]:gap-4 @min-[720px]:border-r @min-[720px]:border-b-0 @min-[720px]:p-4'

function Cifra({ valor, sufijo }: { valor: number; sufijo?: string }) {
  const n = useConteo(valor)
  // El lector de pantalla oye el valor final, no la cuenta.
  return (
    <>
      <span aria-hidden="true">
        {num(n)}
        {sufijo}
      </span>
      <span className="sr-only">
        {num(valor)}
        {sufijo}
      </span>
    </>
  )
}

function Dato({
  etiqueta,
  nota,
  children,
}: {
  etiqueta: string
  nota: string
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col-reverse justify-end gap-0.5 border-l border-line p-3 first:border-l-0 @min-[720px]:justify-center @min-[720px]:px-5 @min-[720px]:first:border-l">
      <dt className="text-[13px] leading-snug">
        <span className="font-semibold">{etiqueta}</span>
        <span className="block text-xs text-muted">{nota}</span>
      </dt>
      <dd className="cifra m-0 text-xl font-bold tracking-tight">{children}</dd>
    </div>
  )
}

/**
 * Franja de resumen sobre la grilla. Lo del mes (cantidad y mejor publicación) sale de las
 * publicaciones del mes; la mediana y el horario vienen de `resumen`, que es de todo el
 * historial, y se rotulan así.
 */
export function Resumen({ datos, onItem }: { datos: CalendarioMes; onItem: (id: string) => void }) {
  const r = datos.resumen
  if (!r?.cantidad) return null
  const mes = mesEnMinuscula(datos.mes)
  const mejor = datos.publicadas.reduce<(typeof datos.publicadas)[number] | null>(
    (m, p) => (m && m.alcance >= p.alcance ? m : p),
    null,
  )
  const razon = mejor && r.medianaAlcance ? mejor.alcance / r.medianaAlcance : 1
  const ideas = datos.ideas.length

  return (
    <section aria-label="Resumen" className={FRANJA}>
      {mejor ? (
        <button
          type="button"
          onClick={() => onItem(mejor.id)}
          aria-label={`Tu mejor publicación de ${mes}: ${mejor.formato} del ${nombreDia(claveDia(mejor.fecha))}, ${num(mejor.alcance)} de alcance. Ver detalle`}
          className={cn(
            PROTAGONISTA,
            'group transition-colors duration-(--dur-fast) ease-brand hover:bg-inset/60 active:bg-inset',
          )}
        >
          <span className="aspect-[4/5] w-12 shrink-0 overflow-hidden rounded-md @min-[720px]:w-14">
            <Portada url={mejor.portadaUrl} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span className="cifra text-3xl leading-none font-extrabold tracking-tight @min-[720px]:text-4xl">
                <Cifra valor={mejor.alcance} />
              </span>
              <span className="text-[13px] text-muted">de alcance</span>
            </span>
            <span className="truncate text-sm font-semibold">Tu mejor publicación del mes</span>
            <span className="flex min-w-0 items-center gap-2 text-xs text-muted">
              <IndicadorRendimiento
                conTexto
                rendimiento={{ razon, clase: claseRendimiento(razon) }}
              />
              <span className="truncate">
                {mejor.formato} del {nombreDia(claveDia(mejor.fecha))}
              </span>
            </span>
          </span>
          <ChevronRight
            className="size-4 shrink-0 text-muted transition-transform duration-(--dur-fast) ease-brand group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </button>
      ) : (
        <div className={PROTAGONISTA}>
          <p className="m-0 text-sm">
            <span className="font-semibold">Sin publicaciones en {mes}.</span>{' '}
            <span className="text-muted">Cuando publiques, acá vas a ver cuál rindió mejor.</span>
          </p>
        </div>
      )}
      <dl className="contents">
        <Dato
          etiqueta="Publicaciones"
          nota={ideas ? `en ${mes}, más ${ideas} ${ideas === 1 ? 'idea' : 'ideas'}` : `en ${mes}`}
        >
          <Cifra valor={datos.publicadas.length} />
        </Dato>
        <Dato etiqueta="Mediana de alcance" nota={`tus últimas ${r.cantidad} publicaciones`}>
          <Cifra valor={r.medianaAlcance} />
        </Dato>
        <Dato etiqueta="Mejor horario" nota="el de tu publicación más vista">
          <Cifra valor={r.mejorHora} sufijo=" h" />
        </Dato>
      </dl>
    </section>
  )
}

/** Misma silueta que la franja, para que no salte el layout al llegar los datos. */
export function ResumenEsqueleto() {
  return (
    <div className={FRANJA}>
      <div className={PROTAGONISTA}>
        <Esqueleto className="aspect-[4/5] w-12 @min-[720px]:w-14" />
        <span className="flex flex-1 flex-col gap-2">
          <Esqueleto className="h-8 w-28" />
          <Esqueleto className="h-3.5 w-44 max-w-full" />
        </span>
      </div>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex flex-col justify-center gap-2 border-l border-line p-3 first:border-l-0 @min-[720px]:px-5 @min-[720px]:first:border-l"
        >
          <Esqueleto className="h-6 w-12" />
          <Esqueleto className="h-3.5 w-20 max-w-full" />
        </div>
      ))}
    </div>
  )
}
