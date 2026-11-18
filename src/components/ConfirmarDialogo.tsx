import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Boton } from '@/components/ui/Boton'
import { atraparTab } from '@/lib/foco'

interface Props {
  titulo: string
  children: ReactNode
  confirmar: string
  cancelar?: string
  /** Una acción irreversible (publicar) o que descarta cambios se marca como tal. */
  onConfirmar: () => void
  onCancelar: () => void
  deshabilitado?: boolean
}

/**
 * Diálogo de confirmación encima de un panel. El foco entra en «Cancelar» (el camino seguro), no sale
 * mientras está abierto, Escape cancela y devuelve el foco a quien lo tenía.
 */
export function ConfirmarDialogo({
  titulo,
  children,
  confirmar,
  cancelar = 'Cancelar',
  onConfirmar,
  onCancelar,
  deshabilitado = false,
}: Props) {
  const id = useId()
  const cajaRef = useRef<HTMLDivElement>(null)
  const cancelarRef = useRef<HTMLButtonElement>(null)
  const cancelarEstable = useRef(onCancelar)
  useEffect(() => {
    cancelarEstable.current = onCancelar
  })

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    cancelarRef.current?.focus()
    // En captura y cortando la propagación: el panel de abajo no tiene que cerrarse con el mismo
    // Escape ni llevarse el foco con Tab.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        cancelarEstable.current()
      } else if (e.key === 'Tab') {
        e.stopPropagation()
        atraparTab(e, cajaRef.current)
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      if (opener?.isConnected) opener.focus()
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
      <div aria-hidden="true" onClick={onCancelar} className="absolute inset-0 bg-scrim" />
      <div
        ref={cajaRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-titulo`}
        aria-describedby={`${id}-texto`}
        className="relative w-full max-w-sm animate-aparecer rounded-2xl border border-line bg-surface p-5 shadow-pop"
      >
        <h2 id={`${id}-titulo`} className="text-lg font-extrabold tracking-tight">
          {titulo}
        </h2>
        <div id={`${id}-texto`} className="mt-2 text-sm text-muted">
          {children}
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Boton ref={cancelarRef} onClick={onCancelar} disabled={deshabilitado}>
            {cancelar}
          </Boton>
          <Boton variante="primario" onClick={onConfirmar} disabled={deshabilitado}>
            {confirmar}
          </Boton>
        </div>
      </div>
    </div>
  )
}
