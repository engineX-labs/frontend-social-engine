import { cn } from '@/lib/utils'

/** Bloque de carga con brillo. Decorativo: el contenedor anuncia el estado con role="status". */
export function Esqueleto({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'block animate-brillo rounded-md bg-[linear-gradient(100deg,var(--surface-raised)_30%,var(--line)_50%,var(--surface-raised)_70%)] bg-[length:200%_100%] motion-reduce:animate-none',
        className,
      )}
    />
  )
}
