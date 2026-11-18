import { ChevronRight } from 'lucide-react'
import { IconoRed } from '@/components/IconoRed'
import { PortadaPieza } from '@/components/PortadaPieza'
import { ETIQUETA_TIPO, situacionDe } from '@/domain/publicacion'
import type { Programada } from '@/domain/types'
import { hora } from '@/lib/fecha'
import { NOMBRE_RED } from '@/lib/redes'
import { cn } from '@/lib/utils'
import { EtiquetaEstado } from './EtiquetaEstado'
import { notaDeEstado, textoDeEstado } from './estado'

/** Tarjeta de la agenda de una pieza guardada desde la app (borrador, programada, fallida…). */
export function TarjetaProgramada({
  pieza,
  conFecha,
  onClick,
}: {
  pieza: Programada
  /** En la lista «Sin fecha» no hay hora que mostrar. */
  conFecha: boolean
  onClick: () => void
}) {
  const situacion = situacionDe(pieza)
  const nota = notaDeEstado(pieza.error, situacion)
  const formato = ETIQUETA_TIPO[pieza.formato]
  const falla = situacion === 'fallida' || situacion === 'no-se-publico'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${conFecha && pieza.fecha ? `${hora(pieza.fecha)} ` : ''}${formato} en ${NOMBRE_RED[pieza.red]}, ${textoDeEstado(situacion)}`}
      className={cn(
        'group flex w-full items-center gap-3.5 rounded-xl border bg-inset p-2.5 text-left shadow-card transition-[border-color,transform] duration-(--dur-fast) ease-brand hover:border-line-strong active:scale-[0.98]',
        falla ? 'border-danger' : 'border-line-strong',
      )}
    >
      <span className="relative block aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-lg bg-raised text-muted">
        <PortadaPieza pieza={pieza} />
        <IconoRed
          red={pieza.red}
          className="absolute right-1 bottom-1 size-4 rounded-full bg-raised p-0.5"
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          {conFecha && pieza.fecha && (
            <span className="cifra font-mono font-medium text-muted">{hora(pieza.fecha)}</span>
          )}
          <span className="font-bold">{formato}</span>
          <span className="text-muted">{NOMBRE_RED[pieza.red]}</span>
          <EtiquetaEstado situacion={situacion} className="ml-auto bg-raised" />
        </span>
        <span className="line-clamp-2 text-sm leading-snug text-muted">
          {pieza.texto || 'Sin texto'}
        </span>
        {nota && <span className="text-xs leading-snug font-semibold">{nota}</span>}
      </span>
      <ChevronRight
        className="size-4 shrink-0 text-muted transition-transform duration-(--dur-fast) ease-brand group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </button>
  )
}
