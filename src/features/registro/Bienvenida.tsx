import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useCrearComercio } from '@/api/registro'
import { Boton } from '@/components/ui/Boton'
import { NOMBRE_COMERCIO_MAX } from '@/domain/registro'

const esquema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'Escribí el nombre de tu comercio.')
    .max(NOMBRE_COMERCIO_MAX, `Hasta ${NOMBRE_COMERCIO_MAX} caracteres.`),
})
type Valores = z.infer<typeof esquema>

/** Primera pantalla de un usuario sin comercio: pide solo el nombre y crea el comercio. */
export function Bienvenida() {
  const crear = useCrearComercio()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Valores>({ resolver: zodResolver(esquema), defaultValues: { nombre: '' } })

  return (
    <section aria-labelledby="titulo-bienvenida" className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <h1 id="titulo-bienvenida" className="m-0 text-2xl font-extrabold tracking-tight">
          Te damos la bienvenida
        </h1>
        <p className="m-0 text-sm text-muted">
          Para empezar, contanos cómo se llama tu comercio. Después conectás tus redes.
        </p>
      </header>
      <form
        noValidate
        onSubmit={handleSubmit(({ nombre }) => crear.mutate(nombre))}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="nombre-comercio" className="text-sm font-semibold">
            Nombre del comercio
          </label>
          <input
            id="nombre-comercio"
            type="text"
            autoComplete="organization"
            aria-invalid={errors.nombre ? true : undefined}
            aria-describedby={errors.nombre ? 'error-nombre' : undefined}
            className="min-h-11 rounded-md border border-line bg-inset px-3 text-sm text-ink"
            {...register('nombre')}
          />
          {errors.nombre && (
            <p id="error-nombre" role="alert" className="m-0 text-sm text-danger">
              {errors.nombre.message}
            </p>
          )}
        </div>
        {crear.isError && (
          <p role="alert" className="m-0 text-sm text-danger">
            No pudimos crear tu comercio. Probá de nuevo.
          </p>
        )}
        <Boton type="submit" variante="primario" disabled={crear.isPending} className="self-start">
          {crear.isPending ? 'Creando…' : 'Continuar'}
        </Boton>
      </form>
    </section>
  )
}
