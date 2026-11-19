import { zodResolver } from '@hookform/resolvers/zod'
import { RotateCw } from 'lucide-react'
import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { mensajeDeApi } from '@/api/errores'
import { ApiError } from '@/api/http'
import { useConfirmarPerfil, useGenerarPerfil, usePerfilMarca } from '@/api/contexto'
import { ConfirmarDialogo } from '@/components/ConfirmarDialogo'
import { EstadoError } from '@/components/estados'
import { Boton } from '@/components/ui/Boton'
import { Esqueleto } from '@/components/ui/Esqueleto'
import {
  etiquetaFormato,
  type PerfilCalculado,
  type PerfilInterpretado,
  type PerfilMarca as Perfil,
} from '@/domain/perfilMarca'
import { diaLargo, hora } from '@/lib/fecha'
import { cn } from '@/lib/utils'
import { CAMPO } from './estilos'

const MAX_TEMAS = 10
const MAX_TEMA = 60
const MAX_TEXTO = 300

const esquema = z.object({
  temas: z
    .string()
    .transform((t) => listaDeTemas(t))
    .pipe(
      z
        .array(z.string().max(MAX_TEMA, `Cada tema, hasta ${MAX_TEMA} caracteres`))
        .min(1, 'Escribí al menos un tema')
        .max(MAX_TEMAS, `Hasta ${MAX_TEMAS} temas`),
    ),
  tono: z
    .string()
    .trim()
    .min(1, 'Contanos el tono')
    .max(MAX_TEXTO, `Máximo ${MAX_TEXTO} caracteres`),
  estiloVisual: z
    .string()
    .trim()
    .min(1, 'Contanos el estilo visual')
    .max(MAX_TEXTO, `Máximo ${MAX_TEXTO} caracteres`),
  publico: z
    .string()
    .trim()
    .min(1, 'Contanos a quién le hablás')
    .max(MAX_TEXTO, `Máximo ${MAX_TEXTO} caracteres`),
})
type EntradaForm = z.input<typeof esquema>
type SalidaForm = z.output<typeof esquema>

/** «café, recetas, café» → ['café', 'recetas']: sin vacíos ni repetidos. */
function listaDeTemas(texto: string): string[] {
  const vistos = new Set<string>()
  for (const t of texto.split(/[,\n]/)) {
    const limpio = t.trim()
    if (limpio) vistos.add(limpio)
  }
  return [...vistos]
}

const aForm = (p: PerfilInterpretado): EntradaForm => ({
  temas: p.temas.join(', '),
  tono: p.tono,
  estiloVisual: p.estiloVisual,
  publico: p.publico,
})

/**
 * El perfil de marca: «Esto es lo que vimos en tus publicaciones». Lo calculado (cifras, del código)
 * y lo interpretado (texto, del modelo) van separados; solo lo interpretado se corrige. Mientras se
 * genera se consulta cada pocos segundos (el intervalo se corta solo al terminar o al desmontarse).
 */
export function PerfilMarca({ intervaloMs }: { intervaloMs?: number }) {
  const perfil = usePerfilMarca(intervaloMs)
  const generar = useGenerarPerfil()
  const idTitulo = useId()

  const errorDeGenerar = generar.isError
    ? generar.error instanceof ApiError && generar.error.status === 429
      ? generar.error.message
      : mensajeDeApi(generar.error, 'No pudimos empezar a armar el perfil. Probá de nuevo.')
    : null

  return (
    <section aria-labelledby={idTitulo} className="grid gap-4">
      <h2 id={idTitulo} className="m-0 text-xl font-bold">
        Esto es lo que vimos en tus publicaciones
      </h2>

      {perfil.isPending && (
        <div role="status" aria-label="Cargando tu perfil" className="grid gap-3">
          <Esqueleto className="h-24" />
          <Esqueleto className="h-40" />
        </div>
      )}

      {perfil.isError && (
        <EstadoError
          mensaje={mensajeDeApi(perfil.error, 'No pudimos cargar tu perfil.')}
          onReintentar={
            perfil.error instanceof ApiError && [401, 403].includes(perfil.error.status)
              ? undefined
              : () => void perfil.refetch()
          }
        />
      )}

      {perfil.data && (
        <Contenido
          perfil={perfil.data}
          generando={generar.isPending}
          onGenerar={() => generar.mutate()}
        />
      )}

      {errorDeGenerar && <EstadoError mensaje={errorDeGenerar} />}
    </section>
  )
}

function Contenido({
  perfil,
  generando,
  onGenerar,
}: {
  perfil: Perfil
  generando: boolean
  onGenerar: () => void
}) {
  switch (perfil.estado) {
    case 'ninguno':
      return (
        <Aviso>
          <p className="m-0">
            Todavía no armamos el perfil de tu marca. Lo hacemos a partir de tus publicaciones y
            después lo corregís vos.
          </p>
          <Boton variante="primario" disabled={generando} onClick={onGenerar}>
            Armar mi perfil
          </Boton>
        </Aviso>
      )
    case 'generando':
      return (
        <div role="status" aria-live="polite" className="grid gap-3">
          <Aviso>
            <p className="m-0 font-semibold">Estamos armando tu perfil…</p>
            <p className="m-0 text-muted">Puede tardar un minuto. Podés seguir usando la app.</p>
          </Aviso>
          <Esqueleto className="h-40" />
        </div>
      )
    case 'sin_datos':
      return (
        <Aviso>
          <p role="status" className="m-0">
            Todavía no tenemos suficientes publicaciones para armar tu perfil. Lo armamos cuando
            tengas más publicaciones.
          </p>
          <Boton disabled={generando} onClick={onGenerar}>
            <RotateCw className="size-3.5" aria-hidden="true" />
            Probar de nuevo
          </Boton>
        </Aviso>
      )
    case 'error':
      return (
        <div role="alert" className="grid gap-3">
          <Aviso>
            <p className="m-0 font-semibold">No pudimos armar tu perfil.</p>
            <p className="m-0 text-muted">Probá de nuevo en un rato.</p>
            <Boton variante="primario" disabled={generando} onClick={onGenerar}>
              <RotateCw className="size-3.5" aria-hidden="true" />
              Volver a generar
            </Boton>
          </Aviso>
        </div>
      )
    case 'listo':
      return <PerfilListo perfil={perfil} generando={generando} onGenerar={onGenerar} />
  }
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-raised p-4 text-sm">
      {children}
    </div>
  )
}

function PerfilListo({
  perfil,
  generando,
  onGenerar,
}: {
  perfil: Perfil
  generando: boolean
  onGenerar: () => void
}) {
  const base = perfil.confirmado ?? perfil.interpretado
  // Una versión nueva (otro `generadoEn` o confirmada) arranca el formulario de cero.
  const clave = `${perfil.generadoEn ?? ''}|${JSON.stringify(perfil.confirmado)}`
  return (
    <div className="grid gap-4">
      {perfil.generadoEn && (
        <p className="m-0 text-sm text-muted">
          Generado el {diaLargo(perfil.generadoEn)} a las {hora(perfil.generadoEn)} (hora de Buenos
          Aires).
        </p>
      )}
      {perfil.calculado && <Calculado datos={perfil.calculado} />}
      {base ? (
        <Interpretado
          key={clave}
          inicial={base}
          confirmado={perfil.confirmado !== null}
          generando={generando}
          onGenerar={onGenerar}
        />
      ) : null}
    </div>
  )
}

const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
const decimal = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 1 })

function Calculado({ datos }: { datos: PerfilCalculado }) {
  const id = useId()
  return (
    <article
      aria-labelledby={id}
      className="grid gap-4 rounded-lg border border-line bg-raised p-4 sm:p-5"
    >
      <div>
        <h3 id={id} className="m-0 text-base font-bold">
          Lo que contamos
        </h3>
        <p className="m-0 text-sm text-muted">
          Son cifras calculadas sobre {datos.publicacionesUsadas} publicaciones. No se editan.
        </p>
      </div>

      <ul aria-label="Formatos" className="m-0 grid list-none gap-2 p-0">
        {datos.formatos.map((f) => (
          <li key={f.formato} className="grid gap-1">
            <div className="flex justify-between gap-3 text-sm">
              <span className="font-semibold">{etiquetaFormato(f.formato)}</span>
              <span className="cifra font-mono text-muted">
                {f.cantidad} · {f.porcentaje}%
              </span>
            </div>
            <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${f.porcentaje}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      <dl className="m-0 grid gap-3 text-sm sm:grid-cols-2">
        <Dato titulo="Frecuencia">{decimal(datos.porSemana)} publicaciones por semana</Dato>
        {datos.mejorFormato && (
          <Dato titulo="Formato que mejor rindió">{etiquetaFormato(datos.mejorFormato)}</Dato>
        )}
        {datos.diasHabituales.length > 0 && (
          <Dato titulo="Días habituales">{datos.diasHabituales.map(mayuscula).join(', ')}</Dato>
        )}
        {datos.horasHabituales.length > 0 && (
          <Dato titulo="Horarios habituales">
            {datos.horasHabituales.map((h) => `${h} h`).join(', ')}
          </Dato>
        )}
        {datos.hashtagsTop.length > 0 && (
          <Dato titulo="Hashtags más usados">
            <span className="flex flex-wrap gap-1.5">
              {datos.hashtagsTop.map((h) => (
                <span key={h} className="rounded-full bg-inset px-2.5 py-0.5 text-[13px]">
                  {h}
                </span>
              ))}
            </span>
          </Dato>
        )}
      </dl>
    </article>
  )
}

function Dato({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs font-semibold text-muted">{titulo}</dt>
      <dd className="m-0">{children}</dd>
    </div>
  )
}

function Interpretado({
  inicial,
  confirmado,
  generando,
  onGenerar,
}: {
  inicial: PerfilInterpretado
  confirmado: boolean
  generando: boolean
  onGenerar: () => void
}) {
  const id = useId()
  const confirmar = useConfirmarPerfil()
  const [pidiendoRegenerar, setPidiendoRegenerar] = useState(false)
  const form = useForm<EntradaForm, unknown, SalidaForm>({
    defaultValues: aForm(inicial),
    resolver: zodResolver(esquema),
  })
  const { errors, isDirty } = form.formState

  const enviar = form.handleSubmit((datos) => confirmar.mutate(datos))

  const errorDeConfirmar = confirmar.isError
    ? confirmar.error instanceof ApiError && confirmar.error.status === 422
      ? confirmar.error.message
      : mensajeDeApi(confirmar.error, 'No pudimos guardar tu perfil. Probá de nuevo.')
    : null

  const campo = (nombre: keyof EntradaForm, etiqueta: string, ayuda?: string, filas?: number) => {
    const idCampo = `${id}-${nombre}`
    const error = errors[nombre]?.message
    return (
      <div className="grid gap-1.5">
        <label htmlFor={idCampo} className="text-sm font-bold">
          {etiqueta}
        </label>
        <textarea
          id={idCampo}
          rows={filas ?? 2}
          aria-invalid={Boolean(error)}
          aria-describedby={[ayuda ? `${idCampo}-ayuda` : null, error ? `${idCampo}-error` : null]
            .filter(Boolean)
            .join(' ')}
          className={cn(CAMPO, 'resize-y leading-6')}
          {...form.register(nombre)}
        />
        {ayuda && (
          <span id={`${idCampo}-ayuda`} className="text-xs text-muted">
            {ayuda}
          </span>
        )}
        {error && (
          <p id={`${idCampo}-error`} role="alert" className="m-0 text-sm font-semibold text-danger">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <form
      noValidate
      onSubmit={(e) => void enviar(e)}
      aria-labelledby={`${id}-titulo`}
      className="grid gap-4 rounded-lg border border-line bg-raised p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id={`${id}-titulo`} className="m-0 text-base font-bold">
            Lo que interpretamos
          </h3>
          <p className="m-0 text-sm text-muted">
            Lo escribió un modelo leyendo tus publicaciones: corregí lo que no sea así.
          </p>
        </div>
        {confirmado && !isDirty && (
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent-ink">
            Confirmado
          </span>
        )}
      </div>

      {campo('temas', 'Temas', 'Separalos con comas.')}
      {campo('tono', 'Tono')}
      {campo('estiloVisual', 'Estilo visual')}
      {campo('publico', 'A quién le hablás')}

      {errorDeConfirmar && <EstadoError mensaje={errorDeConfirmar} />}
      <p role="status" className="m-0 min-h-5 text-sm font-semibold text-success">
        {confirmar.isSuccess && !isDirty ? 'Guardamos tu perfil.' : ''}
      </p>

      <div className="flex flex-wrap justify-end gap-2">
        <Boton
          variante="secundario"
          disabled={generando}
          onClick={() => (isDirty ? setPidiendoRegenerar(true) : onGenerar())}
        >
          <RotateCw className="size-3.5" aria-hidden="true" />
          Volver a generar
        </Boton>
        <Boton
          type="submit"
          variante="primario"
          disabled={confirmar.isPending || (confirmado && !isDirty)}
        >
          {confirmar.isPending ? 'Guardando…' : 'Confirmar'}
        </Boton>
      </div>

      {pidiendoRegenerar && (
        <ConfirmarDialogo
          titulo="¿Volver a generar?"
          confirmar="Volver a generar"
          onCancelar={() => setPidiendoRegenerar(false)}
          onConfirmar={() => {
            setPidiendoRegenerar(false)
            onGenerar()
          }}
        >
          Tenés cambios sin confirmar: se pierden al generar un perfil nuevo.
        </ConfirmarDialogo>
      )}
    </form>
  )
}
