import { Sparkles } from 'lucide-react'
import { Portada } from '@/components/Portada'
import type { PublicadaConRendimiento } from '@/domain/metrics'
import type { Publicada, ResumenMetricas } from '@/domain/types'
import { diaCorto, hora } from '@/lib/fecha'
import { cn } from '@/lib/utils'
import { Campo, Seccion } from './Cabecera'
import { num, textoRazon } from './formato'

const TONO = {
  sube: 'bg-success/15 text-success',
  normal: 'bg-inset text-muted',
  baja: 'bg-danger/15 text-danger',
} as const

function Barra({
  etiqueta,
  valor,
  max,
  referencia,
}: {
  etiqueta: string
  valor: number
  max: number
  referencia?: boolean
}) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3 text-sm">
      <span className="text-muted">{etiqueta}</span>
      <div className="h-2 overflow-hidden rounded-full bg-inset" aria-hidden="true">
        <div
          className={cn('h-full rounded-full', referencia ? 'bg-line-strong' : 'bg-accent')}
          style={{ width: `${max ? Math.max(2, (valor / max) * 100) : 0}%` }}
        />
      </div>
      <b className="tabular-nums">{num(valor)}</b>
    </div>
  )
}

export function DetallePublicada({
  pub,
  rendimiento,
  resumen,
}: {
  pub: Publicada
  rendimiento: PublicadaConRendimiento | null
  resumen: ResumenMetricas | null
}) {
  const max = Math.max(pub.alcance, resumen?.medianaAlcance ?? 0, resumen?.mejorAlcance ?? 0)
  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <div className="aspect-[4/5] w-28 shrink-0 overflow-hidden rounded-md bg-inset">
          <Portada url={pub.portadaUrl} />
        </div>
        <dl className="grid flex-1 content-start gap-3">
          <Campo etiqueta="Red">Instagram</Campo>
          <Campo etiqueta="Formato">{pub.formato}</Campo>
          <Campo etiqueta="Publicada">
            {diaCorto(pub.fecha)} · {hora(pub.fecha)} h
          </Campo>
        </dl>
      </div>

      <Seccion titulo="Copy">
        <p className="whitespace-pre-line text-[15px] leading-relaxed">{pub.copy}</p>
      </Seccion>

      <Seccion titulo="Resultado">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border border-line bg-raised p-3">
            <b className="block text-2xl font-extrabold tabular-nums">{num(pub.alcance)}</b>
            <small className="text-muted">Alcance</small>
          </div>
          <div className="rounded-md border border-line bg-raised p-3">
            <b className="block text-2xl font-extrabold tabular-nums">{num(pub.interacciones)}</b>
            <small className="text-muted">Interacciones</small>
          </div>
        </div>
        {rendimiento && resumen && (
          <div className="space-y-3 pt-1">
            <p className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-bold',
                  TONO[rendimiento.clase],
                )}
              >
                {textoRazon(rendimiento.razon)}
              </span>
              <span className="text-sm text-muted">
                Puesto {rendimiento.puesto} de {resumen.cantidad} del mes
              </span>
            </p>
            <div className="space-y-2">
              <Barra etiqueta="Esta" valor={pub.alcance} max={max} />
              <Barra etiqueta="Tu mediana" valor={resumen.medianaAlcance} max={max} referencia />
            </div>
          </div>
        )}
      </Seccion>

      <section className="rounded-lg border border-line bg-raised p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <Sparkles className="size-4 text-accent-ink" aria-hidden="true" />
          Análisis de Fidel
        </h3>
        <p className="mt-2 text-sm leading-relaxed">{pub.analisis}</p>
      </section>
    </div>
  )
}
