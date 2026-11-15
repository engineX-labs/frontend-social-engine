import { Link } from '@tanstack/react-router'
import { AvatarFidel } from '@/components/ui/AvatarFidel'
import { Boton } from '@/components/ui/Boton'
import { botonClases } from '@/components/ui/boton-clases'
import type { Formato, Idea } from '@/domain/types'
import { claveDia, hora } from '@/lib/fecha'
import { nombreDia } from './agrupar'

const CON_ARTICULO: Record<Formato, string> = {
  Reel: 'un reel',
  Carrusel: 'un carrusel',
  Foto: 'una foto',
}

/** Recomendación de Fidel: cuántas ideas sugirió para el mes y cuál es la primera. */
export function TarjetaFidel({ ideas, onVer }: { ideas: Idea[]; onVer: (id: string) => void }) {
  if (!ideas.length) return null
  const primera = [...ideas].sort((a, b) => Date.parse(a.fecha) - Date.parse(b.fecha))[0]!
  return (
    <aside
      aria-label="Sugerencia de Fidel"
      className="flex animate-aparecer flex-wrap items-center gap-x-4 gap-y-3 rounded-lg bg-fidel-soft p-3 min-[820px]:pl-4"
    >
      <div className="flex min-w-0 flex-1 basis-72 items-center gap-3">
        <AvatarFidel tamano="md" />
        <p className="m-0 min-w-0 text-sm leading-snug">
          <strong className="font-bold">
            Fidel te sugiere {ideas.length} {ideas.length === 1 ? 'idea' : 'ideas'} para este mes.
          </strong>{' '}
          <span className="text-muted">
            La primera: {CON_ARTICULO[primera.formato]} el {nombreDia(claveDia(primera.fecha))} a
            las {hora(primera.fecha)}.
          </span>
        </p>
      </div>
      <div className="flex gap-2 max-[819px]:w-full">
        <Boton variante="primario" className="max-[819px]:flex-1" onClick={() => onVer(primera.id)}>
          Ver idea
        </Boton>
        <Link to="/chat" className={botonClases({ className: 'max-[819px]:flex-1' })}>
          Hablar con Fidel
        </Link>
      </div>
    </aside>
  )
}
