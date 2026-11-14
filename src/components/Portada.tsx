import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AvatarFidel } from './ui/AvatarFidel'

/**
 * Portada 4:5; ocupa el contenedor. Sin imagen:
 * - `idea`: marcador de Fidel (todavía no existe la pieza, es una sugerencia);
 * - si no, un marcador neutro.
 */
export function Portada({
  url,
  className,
  mini = false,
  idea = false,
}: {
  url: string | null
  className?: string
  mini?: boolean
  idea?: boolean
}) {
  if (url)
    return (
      <img
        src={url}
        alt=""
        decoding="async"
        className={cn('size-full bg-inset object-cover', className)}
      />
    )
  if (idea)
    return (
      <span className={cn('grid size-full place-items-center bg-fidel-soft', className)}>
        <AvatarFidel tamano={mini ? 'xs' : 'md'} className={mini ? 'size-3.5' : undefined} />
      </span>
    )
  return (
    <span className={cn('grid size-full place-items-center bg-inset text-muted', className)}>
      {mini ? null : <ImageOff className="size-5" aria-label="Sin portada" />}
    </span>
  )
}
