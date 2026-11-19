import { useYo } from '@/api/registro'
import { Boton } from '@/components/ui/Boton'

/** Con la opción A de Zernio, la cuenta de cada comercio la cargamos nosotros: hasta entonces se espera. */
export function EnPreparacion({ nombre }: { nombre: string }) {
  const yo = useYo()
  return (
    <section aria-labelledby="titulo-preparacion" className="flex flex-col gap-4">
      <h1 id="titulo-preparacion" className="m-0 text-2xl font-extrabold tracking-tight">
        Estamos preparando tu cuenta
      </h1>
      <p className="m-0 text-sm text-muted">
        Gracias, {nombre}. Estamos preparando tu cuenta, te avisamos por mail cuando puedas conectar
        tus redes.
      </p>
      <Boton className="self-start" disabled={yo.isFetching} onClick={() => void yo.refetch()}>
        {yo.isFetching ? 'Revisando…' : 'Revisar de nuevo'}
      </Boton>
    </section>
  )
}
