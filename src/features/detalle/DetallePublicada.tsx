import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { motion } from 'motion/react'
import { Portada } from '@/components/Portada'
import type { PublicadaConRendimiento } from '@/domain/metrics'
import type { Publicada, ResumenMetricas } from '@/domain/types'
import { diaCorto, hora } from '@/lib/fecha'
import { cn } from '@/lib/utils'
import { Campo, Seccion, VozFidel } from './Cabecera'
import { num, textoRazon } from '@/lib/formato'

const TONO = {
  sube: { clase: 'bg-success/15 text-success', Icono: ArrowUpRight },
  normal: { clase: 'bg-inset text-muted', Icono: Minus },
  baja: { clase: 'bg-danger/15 text-danger', Icono: ArrowDownRight },
} as const

const LLENADO = { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 } as const

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
  const ancho = max ? Math.max(0.02, valor / max) : 0
  return (
    <div className="grid grid-cols-[5.5rem_1fr_3.5rem] items-center gap-3 text-sm">
      <span className={referencia ? 'text-muted' : 'font-semibold'}>{etiqueta}</span>
      <div className="h-2.5 overflow-hidden rounded-full bg-inset" aria-hidden="true">
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: ancho }}
          transition={LLENADO}
          className={cn(
            'h-full w-full origin-left rounded-full',
            referencia ? 'bg-line-strong' : 'bg-accent',
          )}
        />
      </div>
      <b className="cifra text-right">{num(valor)}</b>
    </div>
  )
}

export function DetallePublicada({
  pub,
  rendimiento,
  resumen,
  totalMes,
}: {
  pub: Publicada
  rendimiento: PublicadaConRendimiento | null
  resumen: ResumenMetricas | null
  /** Publicadas del mes, base del puesto. */
  totalMes: number
}) {
  const max = Math.max(pub.alcance, resumen?.medianaAlcance ?? 0)
  const tono = rendimiento ? TONO[rendimiento.clase] : null
  return (
    <div className="space-y-7">
      <div className="flex gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="aspect-[4/5] w-32 shrink-0 overflow-hidden rounded-xl bg-inset shadow-pop ring-1 ring-hairline min-[420px]:w-36"
        >
          <Portada url={pub.portadaUrl} />
        </motion.div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
          <span className="rotulo">Alcance</span>
          <b className="cifra text-[2.5rem] font-extrabold leading-none tracking-[-0.03em]">
            {num(pub.alcance)}
          </b>
          {rendimiento && tono && resumen ? (
            <div className="mt-1 space-y-1.5">
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full py-1 pr-2.5 pl-1.5 text-xs font-bold',
                  tono.clase,
                )}
              >
                <tono.Icono className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
                {textoRazon(rendimiento.razon)}
              </span>
              <p className="text-[13px] text-muted">
                Puesto {rendimiento.puesto} de {totalMes} del mes
              </p>
            </div>
          ) : (
            <span className="mt-1 block h-6" aria-hidden="true" />
          )}
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-3 border-y border-hairline py-4">
        <Campo etiqueta="Interacciones">
          <span className="cifra">{num(pub.interacciones)}</span>
        </Campo>
        <Campo etiqueta="Formato">{pub.formato}</Campo>
        <Campo etiqueta="Publicada">
          <span className="cifra">
            {diaCorto(pub.fecha)} · {hora(pub.fecha)} h
          </span>
        </Campo>
      </dl>

      {resumen && (
        <Seccion titulo="Contra tu mediana de alcance">
          <div className="space-y-2.5">
            <Barra etiqueta="Esta" valor={pub.alcance} max={max} />
            <Barra etiqueta="Tu mediana" valor={resumen.medianaAlcance} max={max} referencia />
          </div>
        </Seccion>
      )}

      {/* El backend manda "" hasta que exista el análisis con LLM (S3): no se pinta un párrafo vacío. */}
      {pub.analisis.trim() && (
        <VozFidel titulo="Análisis de Fidel">
          <p className="text-[15px] leading-relaxed">{pub.analisis}</p>
        </VozFidel>
      )}

      <Seccion titulo="Copy">
        <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink/90">{pub.copy}</p>
      </Seccion>
    </div>
  )
}
