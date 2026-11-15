import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { useItem } from '@/api/calendario'
import { Portada } from '@/components/Portada'
import { Esqueleto } from '@/components/ui/Esqueleto'
import { claveMes, diaCorto, hora } from '@/lib/fecha'
import type { Cita } from './citas'

const miles = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')

/** Mismo alto en carga y con datos: la respuesta no salta cuando llega la publicación. */
const CAJA = 'flex h-[4.5rem] w-full max-w-sm items-center gap-3 rounded-lg border p-2 pr-3'

/**
 * Publicación o idea que Fidel citó en su respuesta: miniatura, formato, fecha y la cifra
 * principal. Lleva al calendario con ese `item` abierto. Si no se puede cargar no se muestra:
 * el enlace del texto sigue estando.
 */
export function TarjetaPublicacion({ cita }: { cita: Cita }) {
  const { data, isError } = useItem(cita.item)
  if (isError) return null
  if (!data)
    return (
      <div role="status" aria-label="Cargando publicación" className={`${CAJA} border-hairline`}>
        <Esqueleto className="h-14 w-11 shrink-0 rounded-sm" />
        <span className="flex-1 space-y-2">
          <Esqueleto className="h-3.5 w-2/3" />
          <Esqueleto className="h-3.5 w-2/5" />
        </span>
      </div>
    )

  const publicada = data.tipo === 'publicada'
  const cuando = `${diaCorto(data.fecha)}, ${hora(data.fecha)}`
  return (
    <Link
      to="/"
      search={{ item: data.id, mes: claveMes(data.fecha) }}
      aria-label={
        publicada
          ? `${data.formato} del ${diaCorto(data.fecha)}, ${miles(data.alcance)} de alcance. Abrir en el calendario`
          : `Idea de ${data.formato.toLowerCase()} para el ${diaCorto(data.fecha)}. Abrir en el calendario`
      }
      className={`${CAJA} group animate-aparecer border-line bg-raised shadow-card transition-[border-color,transform] duration-(--dur-fast) ease-brand [animation-duration:var(--dur-base)] hover:border-line-strong active:scale-[0.98] active:duration-(--dur-press)`}
    >
      <span className="h-14 w-11 shrink-0 overflow-hidden rounded-sm">
        <Portada url={publicada ? data.portadaUrl : null} idea={!publicada} mini />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2 text-sm">
          <span className="font-bold">{data.formato}</span>
          <span className="cifra truncate font-mono text-xs text-muted">{cuando}</span>
        </span>
        {publicada ? (
          <span className="mt-0.5 flex items-baseline gap-1.5">
            <span className="cifra font-mono text-lg leading-6 font-medium">
              {miles(data.alcance)}
            </span>
            <span className="text-xs text-muted">de alcance</span>
          </span>
        ) : (
          <span className="mt-0.5 block truncate text-sm leading-6 text-accent-ink">
            Idea de Fidel
          </span>
        )}
      </span>
      <ChevronRight
        className="size-4 shrink-0 text-muted transition-transform duration-(--dur-fast) ease-brand group-hover:translate-x-0.5 group-hover:text-ink"
        aria-hidden="true"
      />
    </Link>
  )
}
