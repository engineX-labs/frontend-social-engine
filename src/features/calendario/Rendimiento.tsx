import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { textoRazon } from '@/lib/formato'
import type { Rendimiento } from './formato'

const INFO = {
  sube: { Icono: TrendingUp, color: 'text-success' },
  normal: { Icono: Minus, color: 'text-muted' },
  baja: { Icono: TrendingDown, color: 'text-danger' },
} as const

/** Rendimiento contra la mediana: ícono con forma propia por clase, además del color. */
export function IndicadorRendimiento({
  rendimiento,
  conTexto = false,
  className,
}: {
  rendimiento: Rendimiento
  conTexto?: boolean
  className?: string
}) {
  const { Icono, color } = INFO[rendimiento.clase]
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 text-xs font-semibold',
        color,
        className,
      )}
    >
      <Icono className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
      {conTexto && <span className="cifra">{textoRazon(rendimiento.razon)}</span>}
    </span>
  )
}
