import { cva } from 'class-variance-authority'

/** Clases de botón: también sirven para `<Link>` y `<a>` que deben verse como botón. */
export const botonClases = cva(
  [
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap select-none',
    'transition-[background-color,border-color,color,box-shadow,transform] duration-(--dur-fast) ease-brand',
    'active:scale-[0.97] active:duration-(--dur-press)',
    'disabled:pointer-events-none disabled:opacity-45',
  ],
  {
    variants: {
      variante: {
        primario: 'bg-accent font-bold text-on-accent hover:bg-accent-hover',
        secundario: 'border border-line bg-raised text-ink hover:border-line-strong',
        fantasma: 'text-muted hover:bg-raised hover:text-ink',
      },
      tamano: {
        md: 'min-h-11 px-4 text-sm',
        sm: 'min-h-9 px-3 text-[13px]',
        icono: 'size-11',
        'icono-sm': 'size-9',
      },
    },
    defaultVariants: { variante: 'secundario', tamano: 'md' },
  },
)
