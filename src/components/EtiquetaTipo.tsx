import { Check } from 'lucide-react'
import type { Item } from '@/domain/types'
import { cn } from '@/lib/utils'
import { AvatarFidel } from './ui/AvatarFidel'

/** Publicada (neutra) o Idea de Fidel (acento, con su avatar). */
export function EtiquetaTipo({ tipo, className }: { tipo: Item['tipo']; className?: string }) {
  const publicada = tipo === 'publicada'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full py-1 pr-2.5 pl-1.5 text-xs font-bold whitespace-nowrap',
        publicada ? 'bg-inset text-muted' : 'bg-accent-soft text-accent-ink',
        className,
      )}
    >
      {publicada ? (
        <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
      ) : (
        <AvatarFidel tamano="xs" className="size-4" />
      )}
      {publicada ? 'Publicada' : 'Sugerida'}
    </span>
  )
}
