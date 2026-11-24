import { cn } from '@/lib/utils'

/** La ruedita de carga. Anuncia el estado con role="status"; sin movimiento si el usuario lo pidió. */
export function Ruedita({ etiqueta, className }: { etiqueta: string; className?: string }) {
  return (
    <span role="status" aria-label={etiqueta} className={cn('inline-flex', className)}>
      <span
        aria-hidden="true"
        className="size-9 animate-girar rounded-full border-[3px] border-line border-t-accent motion-reduce:animate-none motion-reduce:border-accent"
      />
    </span>
  )
}
