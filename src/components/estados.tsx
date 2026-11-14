import { AlertCircle, Loader2, RotateCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { Boton } from './ui/Boton'

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
      className="flex animate-aparecer flex-wrap items-center gap-3 rounded-lg border border-line bg-raised p-4 text-sm"
    >
      <AlertCircle className="size-5 shrink-0 text-danger" aria-hidden="true" />
      <span className="min-w-0 flex-1 basis-48">{mensaje}</span>
      {onReintentar && (
        <Boton tamano="sm" onClick={onReintentar}>
          <RotateCw className="size-3.5" aria-hidden="true" />
          Reintentar
        </Boton>
      )}
    </div>
  )
}
