import { useId } from 'react'
import { esErrorDeAcceso, mensajeDeApi } from '@/api/errores'
import { useRedes } from '@/api/publicacion'
import { IconoRed } from '@/components/IconoRed'
import { EstadoError } from '@/components/estados'
import { Esqueleto } from '@/components/ui/Esqueleto'
import { NOMBRE_RED } from '@/lib/redes'
import { cn } from '@/lib/utils'

/**
 * Elige la red donde se publica. Una red con la conexión con problemas se puede elegir igual: el
 * permiso real de publicar lo dice el backend (409 «reconectar») al enviar.
 */
export function SelectorRed({
  valor,
  onChange,
  disabled,
}: {
  valor: string | undefined
  onChange: (redId: string) => void
  disabled?: boolean
}) {
  const redes = useRedes()
  const nombre = useId()
  const titulo = `${nombre}-titulo`

  if (redes.isPending)
    return (
      <div role="status" aria-label="Cargando redes" className="grid gap-2">
        <Esqueleto className="h-11" />
        <Esqueleto className="h-11" />
      </div>
    )

  if (redes.isError)
    return (
      <EstadoError
        mensaje={mensajeDeApi(redes.error, 'No pudimos cargar tus redes.')}
        onReintentar={esErrorDeAcceso(redes.error) ? undefined : () => void redes.refetch()}
      />
    )

  if (!redes.data.length)
    return (
      <p className="m-0 rounded-lg border border-line bg-raised p-4 text-sm text-muted">
        Todavía no hay redes conectadas.
      </p>
    )

  return (
    <div role="radiogroup" aria-labelledby={titulo} className="grid gap-2">
      <span id={titulo} className="text-sm font-bold">
        Red
      </span>
      {redes.data.map((red) => {
        const conProblemas = red.salud !== null && red.salud !== 'healthy'
        const ayuda = `${nombre}-${red.id}-ayuda`
        return (
          <label
            key={red.id}
            className={cn(
              'flex min-h-11 cursor-pointer items-center gap-3 rounded-md border bg-raised px-3 py-2 transition-colors duration-(--dur-fast) ease-brand',
              'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--focus-ring)',
              valor === red.id
                ? 'border-accent bg-accent-soft'
                : 'border-line hover:border-line-strong',
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            <input
              type="radio"
              name={nombre}
              value={red.id}
              checked={valor === red.id}
              disabled={disabled}
              onChange={() => onChange(red.id)}
              aria-describedby={conProblemas ? ayuda : undefined}
              className="size-5 shrink-0 accent-(--accent)"
            />
            <IconoRed red={red.red} className="size-5 shrink-0 text-muted" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">
                {NOMBRE_RED[red.red]}{' '}
                <span className="font-normal text-muted">@{red.username}</span>
              </span>
              {conProblemas && (
                <span id={ayuda} className="mt-0.5 block text-xs text-danger">
                  La conexión tiene problemas. Si falta el permiso para publicar, te lo vamos a
                  avisar.
                </span>
              )}
            </span>
          </label>
        )
      })}
    </div>
  )
}
