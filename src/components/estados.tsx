import { AlertCircle, RotateCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { Boton } from './ui/Boton'

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
