import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { altaConKeyHabilitada } from '@/app/altaConKey'
import { ApiError } from '@/api/http'
import { useCargarCuenta, useYo } from '@/api/registro'
import { Boton } from '@/components/ui/Boton'

const esquema = z.object({
  apiKey: z.string().trim().min(8, 'Pegá la key completa.').max(200, 'La key es demasiado larga.'),
})
type Valores = z.infer<typeof esquema>

/** El mensaje de cada caso de la key; el 400 y el 409 del backend ya vienen en castellano. */
function mensajeDeLaKey(error: unknown): string {
  if (error instanceof ApiError && (error.status === 400 || error.status === 409))
    return error.message
  if (error instanceof ApiError && error.status === 404)
    return 'Esta opción no está disponible por ahora.'
  return 'No pudimos revisar la key. Probá de nuevo en un rato.'
}

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
      {altaConKeyHabilitada() && <CargarKey />}
    </section>
  )
}

/** Alta de prueba (decisión 0007): pegar la key de Zernio propia para no esperar la carga a mano. */
function CargarKey() {
  const cargar = useCargarCuenta()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Valores>({ resolver: zodResolver(esquema), defaultValues: { apiKey: '' } })

  return (
    <form
      noValidate
      aria-labelledby="titulo-key"
      onSubmit={handleSubmit(({ apiKey }) =>
        cargar.mutate(apiKey, { onSettled: () => reset({ apiKey: '' }) }),
      )}
      className="mt-2 flex flex-col gap-3 border-t border-line pt-5"
    >
      <h2 id="titulo-key" className="m-0 text-base font-bold">
        ¿Ya tenés tu cuenta de Zernio?
      </h2>
      <p className="m-0 text-sm text-muted">
        Para probar el alta podés pegar la key de tu cuenta de Zernio y seguir sin esperar. La
        guardamos cifrada y no se vuelve a mostrar.
      </p>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="key-zernio" className="text-sm font-semibold">
          Key de Zernio
        </label>
        <input
          id="key-zernio"
          type="password"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={errors.apiKey ? true : undefined}
          aria-describedby={errors.apiKey ? 'error-key' : undefined}
          className="min-h-11 rounded-md border border-line bg-inset px-3 text-sm text-ink"
          {...register('apiKey')}
        />
        {errors.apiKey && (
          <p id="error-key" role="alert" className="m-0 text-sm text-danger">
            {errors.apiKey.message}
          </p>
        )}
      </div>
      {cargar.isError && (
        <p role="alert" className="m-0 text-sm text-danger">
          {mensajeDeLaKey(cargar.error)}
        </p>
      )}
      <Boton type="submit" variante="primario" disabled={cargar.isPending} className="self-start">
        {cargar.isPending ? 'Revisando la key…' : 'Conectar mi cuenta de Zernio'}
      </Boton>
    </form>
  )
}
