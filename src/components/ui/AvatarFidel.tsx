import { cn } from '@/lib/utils'

const TAMANOS = {
  xs: 'size-5',
  sm: 'size-7',
  md: 'size-9',
  lg: 'size-14',
} as const

/**
 * Cara de Fidel, el agente. El gradiente de marca se reserva para él:
 * donde aparece, lo que sigue lo dijo o lo sugirió Fidel.
 */
export function AvatarFidel({
  tamano = 'md',
  pensando = false,
  className,
}: {
  tamano?: keyof typeof TAMANOS
  /** Late mientras Fidel arma una respuesta. */
  pensando?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'fidel-gradiente grid shrink-0 place-items-center rounded-full text-white shadow-[inset_0_1px_0_#ffffff59,inset_0_-6px_10px_-6px_#00000059]',
        pensando && 'animate-latido motion-reduce:animate-none',
        TAMANOS[tamano],
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-[58%]" fill="currentColor">
        <path d="M12 2c.6 6 4 9.4 10 10-6 .6-9.4 4-10 10-.6-6-4-9.4-10-10 6-.6 9.4-4 10-10Z" />
      </svg>
    </span>
  )
}
