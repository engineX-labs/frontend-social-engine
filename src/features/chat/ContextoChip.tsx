import { X } from 'lucide-react'
import { useItem } from '@/api/calendario'
import { Portada } from '@/components/Portada'
import { Boton } from '@/components/ui/Boton'
import { Esqueleto } from '@/components/ui/Esqueleto'
import { diaCorto } from '@/lib/fecha'

/** Publicación o idea sobre la que se está preguntando. Vive dentro del composer. */
export function ContextoChip({ itemId, onQuitar }: { itemId: string; onQuitar?: () => void }) {
  const { data, isError } = useItem(itemId)
  let texto = 'Cargando publicación…'
  if (isError) texto = 'Publicación no encontrada'
  else if (data)
    texto =
      data.tipo === 'publicada'
        ? `${data.formato} del ${diaCorto(data.fecha)}`
        : `Idea: ${data.formato} del ${diaCorto(data.fecha)}`
  return (
    <div className="mb-1 flex animate-aparecer items-center gap-2.5 border-b border-hairline pb-2 pl-1 [animation-duration:var(--dur-base)]">
      <span className="h-10 w-8 shrink-0 overflow-hidden rounded-sm">
        {data ? (
          <Portada
            url={data.tipo === 'publicada' ? data.portadaUrl : null}
            idea={data.tipo === 'idea'}
            mini
          />
        ) : isError ? (
          <Portada url={null} mini />
        ) : (
          <Esqueleto className="size-full rounded-none" />
        )}
      </span>
      <p className="min-w-0 flex-1 text-sm leading-5">
        <span className="block text-xs text-muted">Preguntando sobre</span>
        <span className="block truncate font-semibold" data-testid="contexto-texto">
          {texto}
        </span>
      </p>
      {onQuitar && (
        <Boton
          variante="fantasma"
          tamano="icono"
          onClick={onQuitar}
          aria-label="Quitar el contexto de la publicación"
          className="-my-1 rounded-full"
        >
          <X className="size-4" aria-hidden="true" />
        </Boton>
      )}
    </div>
  )
}
