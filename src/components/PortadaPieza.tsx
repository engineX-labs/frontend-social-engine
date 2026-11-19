import { Film, ImageOff } from 'lucide-react'
import { portadaDePieza } from '@/domain/publicacion'
import type { Programada } from '@/domain/types'
import { cn } from '@/lib/utils'

/**
 * Portada 4:5 de una pieza guardada desde la app: la elegida o la primera imagen. Un video sin portada
 * muestra un fotograma (el navegador lo pide con `preload="metadata"`); sin nada que mostrar, un ícono
 * por tipo, para que el calendario no quede con huecos vacíos.
 */
export function PortadaPieza({
  pieza,
  className,
}: {
  pieza: Pick<Programada, 'portadaUrl' | 'medios'>
  className?: string
}) {
  const url = portadaDePieza(pieza)
  const video = pieza.medios.find((m) => m.tipo === 'video')
  const base = 'size-full bg-inset object-cover'
  if (url) return <img src={url} alt="" decoding="async" className={cn(base, className)} />
  if (video)
    return (
      <video
        src={`${video.url}#t=0.1`}
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
        tabIndex={-1}
        className={cn(base, 'pointer-events-none', className)}
      />
    )
  return (
    <span className={cn('grid size-full place-items-center bg-inset text-muted', className)}>
      {pieza.medios.length ? (
        <Film className="size-4" aria-hidden="true" />
      ) : (
        <ImageOff className="size-4" aria-hidden="true" />
      )}
    </span>
  )
}
