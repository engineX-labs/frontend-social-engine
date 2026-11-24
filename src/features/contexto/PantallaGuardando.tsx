import { Ruedita } from '@/components/ui/Ruedita'

/** Lo que se ve mientras se guardan las respuestas y llega el estado nuevo de la cuenta. */
export function PantallaGuardando() {
  return (
    <div className="grid justify-items-center gap-4 py-10 text-center">
      <Ruedita etiqueta="Guardando tus respuestas" />
      <p aria-hidden="true" className="m-0 font-semibold text-muted">
        Guardando tus respuestas…
      </p>
    </div>
  )
}
