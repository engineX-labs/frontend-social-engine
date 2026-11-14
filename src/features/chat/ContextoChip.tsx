import { X } from 'lucide-react'
import { useItem } from '@/api/calendario'
import { diaCorto } from '@/lib/fecha'

/** Publicación o idea sobre la que se está preguntando. */
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
    <div className="inline-flex max-w-full items-center gap-1 rounded-full border border-line bg-inset py-1 pl-3 text-xs">
      <span className="text-muted">Preguntando sobre</span>
      <span className="truncate font-semibold" data-testid="contexto-texto">
        {texto}
      </span>
      {onQuitar && (
        <button
          type="button"
          onClick={onQuitar}
          aria-label="Quitar el contexto de la publicación"
          className="inline-grid size-7 place-items-center rounded-full text-muted hover:text-ink"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
