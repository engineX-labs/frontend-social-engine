import { AlertCircle, Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'

export function EstadoCarga({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 p-6 text-sm text-muted">
      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      {texto}
    </div>
  )
}

export function EstadoError({
  mensaje = 'No pudimos cargar esto.',
  onReintentar,
}: {
  mensaje?: ReactNode
  onReintentar?: () => void
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-raised p-4 text-sm"
    >
      <AlertCircle className="size-4 text-danger" aria-hidden="true" />
      <span className="flex-1">{mensaje}</span>
      {onReintentar && (
        <button
          type="button"
          onClick={onReintentar}
          className="font-semibold text-accent-ink underline underline-offset-4"
        >
          Reintentar
        </button>
      )}
    </div>
  )
}
