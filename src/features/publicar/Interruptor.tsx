import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Interruptor accesible (`role="switch"`): toda la fila es el objetivo táctil (≥44px). */
export function Interruptor({
  etiqueta,
  ayuda,
  activado,
  onChange,
  disabled,
}: {
  etiqueta: ReactNode
  ayuda?: ReactNode
  activado: boolean
  onChange: (activado: boolean) => void
  disabled?: boolean
}) {
  const id = useId()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activado}
      aria-labelledby={`${id}-etiqueta`}
      aria-describedby={ayuda ? `${id}-ayuda` : undefined}
      disabled={disabled}
      onClick={() => onChange(!activado)}
      className="flex min-h-11 w-full items-center gap-3 rounded-md border border-line bg-raised px-3 py-2 text-left transition-colors duration-(--dur-fast) ease-brand hover:border-line-strong disabled:opacity-60 disabled:hover:border-line"
    >
      <span className="min-w-0 flex-1">
        <span id={`${id}-etiqueta`} className="block text-sm font-semibold">
          {etiqueta}
        </span>
        {ayuda && (
          <span id={`${id}-ayuda`} className="mt-0.5 block text-xs text-muted">
            {ayuda}
          </span>
        )}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'relative h-6 w-10 shrink-0 rounded-full border transition-colors duration-(--dur-fast) ease-brand',
          activado ? 'border-accent bg-accent' : 'border-line-strong bg-inset',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 size-4 rounded-full transition-transform duration-(--dur-fast) ease-brand motion-reduce:transition-none',
            activado ? 'translate-x-4 bg-on-accent' : 'bg-muted',
          )}
        />
      </span>
    </button>
  )
}
