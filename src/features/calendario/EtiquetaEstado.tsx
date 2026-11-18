import type { SituacionProgramada } from '@/domain/publicacion'
import { cn } from '@/lib/utils'
import { ESTADO } from './estado'

/** Estado de una pieza: ícono (forma propia) + texto. El color nunca lo comunica solo. */
export function EtiquetaEstado({
  situacion,
  className,
}: {
  situacion: SituacionProgramada
  className?: string
}) {
  const { texto, Icono, color, gira } = ESTADO[situacion]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-inset px-2 py-0.5 text-xs font-bold whitespace-nowrap text-ink',
        className,
      )}
    >
      <Icono
        className={cn('size-3.5 shrink-0', color, gira && 'motion-safe:animate-spin')}
        strokeWidth={2.5}
        aria-hidden="true"
      />
      {texto}
    </span>
  )
}
