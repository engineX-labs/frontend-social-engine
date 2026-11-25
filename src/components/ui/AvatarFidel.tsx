import { cn } from '@/lib/utils'

const TAMANOS = {
  xs: 'size-5',
  sm: 'size-7',
  md: 'size-9',
  lg: 'size-14',
} as const

/**
 * Logo de Fidel, el agente. Dos versiones (oscura y clara): la que se ve la
 * decide el tema (`data-theme`, o el sistema si no hay uno elegido), ver
 * `.fidel-logo` en `index.css`. Donde aparece, lo que sigue lo dijo o lo sugirió Fidel.
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
        'fidel-logo grid shrink-0 place-items-center',
        pensando && 'animate-latido motion-reduce:animate-none',
        TAMANOS[tamano],
        className,
      )}
    >
      <img src="/fidel/fidel-avatar-dark.svg" alt="" className="fidel-logo-oscuro size-full" />
      <img src="/fidel/fidel-avatar-light.svg" alt="" className="fidel-logo-claro size-full" />
    </span>
  )
}
