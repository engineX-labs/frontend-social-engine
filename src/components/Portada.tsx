import { cn } from '@/lib/utils'

/** Portada 4:5. Sin imagen muestra un marcador punteado. Ocupa el ancho del contenedor. */
export function Portada({
  url,
  className,
  mini = false,
}: {
  url: string | null
  className?: string
  mini?: boolean
}) {
  if (url) return <img src={url} alt="" className={cn('size-full object-cover', className)} />
  return (
    <span
      className={cn(
        'grid size-full place-items-center border border-dashed border-line p-1 text-center text-[10.5px] text-muted',
        className,
      )}
    >
      {mini ? null : 'Sin portada'}
    </span>
  )
}
