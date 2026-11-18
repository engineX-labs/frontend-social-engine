import { IconoRed } from '@/components/IconoRed'
import { ETIQUETA_TIPO, situacionDe } from '@/domain/publicacion'
import { hora } from '@/lib/fecha'
import { cn } from '@/lib/utils'
import { NOMBRE_RED } from '@/lib/redes'
import type { ProgramadaConFecha } from './agrupar'
import { ESTADO, textoDeEstado } from './estado'

/**
 * Pieza guardada desde la app, en la celda de un día. Se distingue de una publicada (portada, borde
 * suave) y de una idea (borde punteado de acento) por el relleno hundido, la falta de portada y una
 * línea con su estado (ícono con forma propia + texto). Sin portada, el texto tiene todo el ancho:
 * «Confirmando…» y «No se publicó» no se cortan; el ícono de la red va en la esquina, sobre la fila
 * de la hora (que es corta), así no le quita ancho a las otras dos.
 */
export function ChipProgramada({
  pieza,
  retraso,
  onClick,
}: {
  pieza: ProgramadaConFecha
  retraso: number
  onClick: () => void
}) {
  const situacion = situacionDe(pieza)
  const { texto, Icono, color, gira, borde } = ESTADO[situacion]
  const formato = ETIQUETA_TIPO[pieza.formato]
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${hora(pieza.fecha)} ${formato} en ${NOMBRE_RED[pieza.red]}, ${textoDeEstado(situacion)}`}
      style={{ animationDelay: `${retraso}ms` }}
      className={cn(
        'relative flex w-full min-w-0 animate-aparecer items-center gap-2 rounded-lg border bg-inset p-1 pr-1.5 text-left text-xs leading-tight [animation-duration:var(--dur-base)]',
        'transition-[border-color,background-color,transform] duration-(--dur-fast) ease-brand hover:bg-raised active:scale-[0.97]',
        borde,
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col pl-1">
        <span className="cifra font-mono text-[11px] font-medium text-muted">
          {hora(pieza.fecha)}
        </span>
        <span className="truncate font-semibold">{formato}</span>
        <span className="flex min-w-0 items-center gap-1 text-[11px] font-semibold">
          <Icono
            className={cn('size-3 shrink-0', color, gira && 'motion-safe:animate-spin')}
            strokeWidth={2.5}
            aria-hidden="true"
          />
          <span className="truncate">{texto}</span>
        </span>
      </span>
      <IconoRed red={pieza.red} className="absolute top-1.5 right-1.5 size-3.5 text-muted" />
    </button>
  )
}
