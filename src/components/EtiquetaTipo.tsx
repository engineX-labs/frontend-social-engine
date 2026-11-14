import { Check, Sparkles } from 'lucide-react'
import type { Item } from '@/domain/types'
import { cn } from '@/lib/utils'

/** Publicada (sólida, neutra) o Sugerida por Fidel (punteada, acento). */
export function EtiquetaTipo({ tipo, className }: { tipo: Item['tipo']; className?: string }) {
  const publicada = tipo === 'publicada'
  const Icono = publicada ? Check : Sparkles
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-bold',
        publicada
          ? 'bg-inset text-muted'
          : 'border border-dashed border-accent bg-accent-soft text-accent-ink',
        className,
      )}
    >
      <Icono className="size-3" strokeWidth={3} aria-hidden="true" />
      {publicada ? 'Publicada' : 'Sugerida'}
    </span>
  )
}
