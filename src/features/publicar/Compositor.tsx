import { zodResolver } from '@hookform/resolvers/zod'
import { Send, CalendarClock, Save } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { mensajeDePublicar, tipoDeConflicto } from '@/api/errores'
import { ApiError } from '@/api/http'
import {
  nuevoIdDePieza,
  useCrearProgramada,
  useEditarProgramada,
  useRedes,
} from '@/api/publicacion'
import { ConfirmarDialogo } from '@/components/ConfirmarDialogo'
import { Boton } from '@/components/ui/Boton'
import { admitePortada, ETIQUETA_TIPO, limiteDeTexto, TIPOS_POR_RED } from '@/domain/publicacion'
import type { Medio, Programada, TipoPieza } from '@/domain/types'
import { claveDia } from '@/lib/fecha'
import { NOMBRE_RED } from '@/lib/redes'
import { cn } from '@/lib/utils'
import {
  armarCambios,
  armarCuerpo,
  esquemaValores,
  valoresDePieza,
  type AccionDeEdicion,
  type AccionDeEnvio,
  type AccionGuardada,
  type ValoresPieza,
} from './envio'
import { OpcionesTikTokForm } from './OpcionesTikTokForm'
import { opcionesTikTokIniciales } from './opcionesTiktok'
import { conReintentoSiProcesando } from './reintento'
import { SelectorRed } from './SelectorRed'
import { seguirPieza } from './avisos'
import { SubidaMedios } from './SubidaMedios'

const CAMPO =
  'min-h-11 w-full rounded-md border border-line bg-raised px-3 py-2 text-base outline-none transition-[border-color] duration-(--dur-fast) ease-brand placeholder:text-muted focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) disabled:opacity-60 aria-[invalid=true]:border-danger'

interface Props {
  /** Día (YYYY-MM-DD) con el que arranca la fecha, p. ej. el elegido en el calendario. */
  diaInicial?: string
  /** Edita esta pieza (un borrador o una programada) en lugar de crear una nueva. */
  pieza?: Programada
  /** Crea una pieza nueva con los datos de esta (red, tipo, texto y archivos), sin fecha. */
  copiaDe?: Programada
  /** Se llama con la pieza ya guardada. */
  onGuardada: (pieza: Programada, accion: AccionGuardada) => void
  /** `true` cuando el formulario tiene cambios sin guardar (para pedir confirmación al cerrar). */
  onSucio?: (sucio: boolean) => void
}

function valoresIniciales(diaInicial: string | undefined, hoy: string): ValoresPieza {
  return {
    redId: '',
    tipo: '',
    texto: '',
    fecha: diaInicial && diaInicial >= hoy ? diaInicial : '',
    hora: '',
    medios: [],
    portada: '',
    opciones: {},
  }
}

/**
 * Crea una pieza —la guarda como borrador, la programa o la publica ahora— o, con `pieza`, edita un
 * borrador o una programada (reprogramar es cambiar la fecha y guardar).
 */
export function Compositor({ diaInicial, pieza, copiaDe, onGuardada, onSucio }: Props) {
  const id = useId()
  // El día de hoy se fija al abrir el formulario: no cambia mientras se escribe.
  const [hoy] = useState(() => claveDia(new Date()))
  const redes = useRedes()
  const crear = useCrearProgramada()
  const editar = useEditarProgramada()
  const edicion = pieza !== undefined
  // Los valores de partida se fijan al abrir: contra ellos se calcula lo que cambió.
  const [inicial] = useState<ValoresPieza>(() =>
    pieza
      ? valoresDePieza(pieza)
      : copiaDe
        ? { ...valoresDePieza(copiaDe), fecha: '', hora: '' }
        : valoresIniciales(diaInicial, hoy),
  )
  const {
    register,
    control,
    setValue,
    getValues,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ValoresPieza>({
    resolver: zodResolver(esquemaValores),
    defaultValues: inicial,
  })
  const [subiendoMedios, setSubiendoMedios] = useState(false)
  const [subiendoPortada, setSubiendoPortada] = useState(false)
  const subiendo = subiendoMedios || subiendoPortada
  const [problemas, setProblemas] = useState<string[]>([])
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const [porConfirmar, setPorConfirmar] = useState<{ ejecutar: () => void } | null>(null)
  const avisoRef = useRef<HTMLDivElement>(null)
  /** Un id por envío del formulario: un reintento o un doble clic repite el mismo y nunca duplica. */
  const idEnvio = useRef(nuevoIdDePieza())
  const enviando = useRef(false)

  const redId = useWatch({ control, name: 'redId' })
  const tipo = useWatch({ control, name: 'tipo' })
  const medios = useWatch({ control, name: 'medios' })
  const portada = useWatch({ control, name: 'portada' })
  const mediosDePortada = useMemo<Medio[]>(
    () => (portada ? [{ url: portada, tipo: 'imagen' }] : []),
    [portada],
  )
  const opciones = useWatch({ control, name: 'opciones' })
  const texto = useWatch({ control, name: 'texto' })
  const red = redes.data?.find((r) => r.id === redId)
  const tiposDeLaRed = red ? TIPOS_POR_RED[red.red] : []
  const pendiente = crear.isPending || editar.isPending
  const bloqueado = pendiente || subiendo
  // Una pieza que ya no es borrador ni programada (cambió mientras se editaba) no se puede guardar.
  const editable = !pieza || pieza.estado === 'borrador' || pieza.estado === 'programada'

  useEffect(() => onSucio?.(isDirty), [isDirty, onSucio])
  // Una sola red conectada: no hay nada que elegir.
  useEffect(() => {
    if (redes.data?.length === 1 && !getValues('redId')) setValue('redId', redes.data[0]!.id)
  }, [redes.data, getValues, setValue])

  const mostrarAviso = () =>
    requestAnimationFrame(() => {
      avisoRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      avisoRef.current?.focus()
    })

  const elegirRed = (nuevaId: string) => {
    const nueva = redes.data?.find((r) => r.id === nuevaId)
    setValue('redId', nuevaId, { shouldDirty: true })
    // Un tipo que la red nueva no tiene se quita; no se adivina otro.
    if (nueva && tipo && !TIPOS_POR_RED[nueva.red].includes(tipo)) {
      setValue('tipo', '', { shouldDirty: true })
      setValue('portada', '', { shouldDirty: true })
      setValue('opciones', {}, { shouldDirty: true })
    }
  }

  const elegirTipo = (nuevo: TipoPieza) => {
    setValue('tipo', nuevo, { shouldDirty: true })
    if (!admitePortada(nuevo)) setValue('portada', '', { shouldDirty: true })
    // Las opciones de TikTok dependen de si es video o fotos: se vuelven a pedir.
    setValue(
      'opciones',
      nuevo === 'video' || nuevo === 'fotos' ? opcionesTikTokIniciales(nuevo) : {},
      {
        shouldDirty: true,
      },
    )
  }

  async function mandar(cuerpo: NonNullable<ReturnType<typeof armarCuerpo>['cuerpo']>) {
    if (enviando.current) return
    enviando.current = true
    setErrorEnvio(null)
    try {
      // Si otro comercio ya usa ese id (casi imposible con un uuid), se genera otro y se repite una vez.
      for (let intento = 0; intento < 2; intento++) {
        try {
          const pieza = await crear.mutateAsync({ ...cuerpo, id: idEnvio.current })
          idEnvio.current = nuevoIdDePieza()
          seguirPieza(pieza, cuerpo.accion)
          onGuardada(pieza, cuerpo.accion)
          return
        } catch (e) {
          if (intento === 0 && tipoDeConflicto(e) === 'id_en_uso') {
            idEnvio.current = nuevoIdDePieza()
            continue
          }
          throw e
        }
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 422)
        setProblemas(e.problemas.length ? e.problemas : [e.message])
      else
        setErrorEnvio(
          mensajeDePublicar(
            e,
            'No pudimos guardar la publicación. Probá de nuevo: no se va a duplicar.',
          ),
        )
      mostrarAviso()
    } finally {
      enviando.current = false
    }
  }

  async function mandarEdicion(
    cambios: NonNullable<ReturnType<typeof armarCambios>['cambios']>,
    accion: AccionDeEdicion,
  ) {
    if (enviando.current || !pieza) return
    enviando.current = true
    setErrorEnvio(null)
    try {
      const nueva = await conReintentoSiProcesando(() =>
        editar.mutateAsync({ id: pieza.id, cambios }),
      )
      seguirPieza(nueva, accion)
      onGuardada(nueva, accion)
    } catch (e) {
      if (e instanceof ApiError && e.status === 422)
        setProblemas(e.problemas.length ? e.problemas : [e.message])
      else if (tipoDeConflicto(e) === 'estado')
        // La pieza cambió mientras se editaba. Las mutaciones ya la volvieron a pedir; lo escrito se queda.
        setErrorEnvio(
          `${(e as ApiError).message}. Volvimos a leer la publicación; lo que escribiste sigue acá.`,
        )
      else
        setErrorEnvio(
          mensajeDePublicar(e, 'No pudimos guardar los cambios. Probá de nuevo en unos segundos.'),
        )
      mostrarAviso()
    } finally {
      enviando.current = false
    }
  }

  const enviarEdicion = (accion: AccionDeEdicion) =>
    handleSubmit(
      (valores) => {
        if (!pieza) return
        const r = armarCambios(valores, inicial, pieza, red?.red, accion, Date.now())
        setProblemas(r.problemas)
        setErrorEnvio(null)
        if (!r.cambios) return mostrarAviso()
        if (r.sinCambios) {
          setErrorEnvio('No cambiaste nada.')
          return mostrarAviso()
        }
        const cambios = r.cambios
        if (accion === 'publicar_ahora')
          return setPorConfirmar({ ejecutar: () => void mandarEdicion(cambios, accion) })
        void mandarEdicion(cambios, accion)
      },
      () => setProblemas([]),
    )()

  const enviar = (accion: AccionDeEnvio) =>
    handleSubmit(
      (valores) => {
        const { cuerpo, problemas: faltan } = armarCuerpo(valores, red?.red, accion, Date.now())
        setProblemas(faltan)
        setErrorEnvio(null)
        if (!cuerpo) return mostrarAviso()
        if (accion === 'publicar_ahora')
          return setPorConfirmar({ ejecutar: () => void mandar(cuerpo) })
        void mandar(cuerpo)
      },
      // Formato mal escrito en fecha u hora: el mensaje ya está en el campo.
      () => setProblemas([]),
    )()

  const limite = tipo ? limiteDeTexto(tipo) : 2200
  const queda = limite - texto.length

  return (
    <form
      aria-label={edicion ? 'Editar publicación' : 'Nueva publicación'}
      onSubmit={(e) => e.preventDefault()}
      noValidate
      className="grid gap-6"
    >
      {copiaDe && !pieza && (
        <p className="m-0 rounded-lg border border-line bg-raised p-3 text-sm text-muted">
          Partimos de una publicación anterior: revisá todo antes de enviar. Elegí la fecha de nuevo
          {copiaDe.red === 'tiktok' && ' y las opciones de TikTok'}.
        </p>
      )}
      <SelectorRed
        valor={redId || undefined}
        onChange={elegirRed}
        disabled={bloqueado || edicion}
      />

      {red && (
        <div role="radiogroup" aria-labelledby={`${id}-tipo`} className="grid gap-2">
          <span id={`${id}-tipo`} className="text-sm font-bold">
            ¿Qué vas a publicar?
          </span>
          <div className="flex flex-wrap gap-2">
            {tiposDeLaRed.map((t) => (
              <label
                key={t}
                className={cn(
                  'inline-flex min-h-11 cursor-pointer items-center rounded-md border px-4 text-sm font-semibold transition-colors duration-(--dur-fast) ease-brand has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--focus-ring)',
                  tipo === t
                    ? 'border-accent bg-accent-soft'
                    : 'border-line bg-raised hover:border-line-strong',
                  bloqueado && 'cursor-not-allowed opacity-60',
                )}
              >
                <input
                  type="radio"
                  name={`${id}-tipo`}
                  value={t}
                  checked={tipo === t}
                  disabled={bloqueado}
                  onChange={() => elegirTipo(t)}
                  className="sr-only"
                />
                {ETIQUETA_TIPO[t]}
              </label>
            ))}
          </div>
        </div>
      )}

      {red && tipo && (
        <>
          <div className="grid gap-2">
            <span className="text-sm font-bold">Archivos</span>
            <SubidaMedios
              tipo={tipo}
              valor={medios}
              onChange={(m) => setValue('medios', m, { shouldDirty: true })}
              onOcupado={setSubiendoMedios}
              disabled={pendiente}
            />
          </div>

          {admitePortada(tipo) ? (
            <div className="grid gap-2">
              <span className="text-sm font-bold">Portada (opcional)</span>
              <p className="m-0 text-[13px] text-muted">
                Una imagen para el calendario y para la red. Si no elegís una, la red usa un
                fotograma del video.
              </p>
              <SubidaMedios
                tipo="foto"
                etiqueta="Elegir portada"
                valor={mediosDePortada}
                onChange={(m) => setValue('portada', m[0]?.url ?? '', { shouldDirty: true })}
                onOcupado={setSubiendoPortada}
                disabled={pendiente}
              />
            </div>
          ) : (
            <p className="m-0 text-[13px] text-muted">
              La portada es la primera imagen: ordená los archivos para elegirla.
            </p>
          )}

          {edicion && red.red === 'tiktok' && (tipo === 'video' || tipo === 'fotos') && (
            <p className="m-0 text-xs text-muted">
              Las opciones de TikTok que ya guardaste se conservan. Tocá las de abajo solo si querés
              cambiarlas.
            </p>
          )}
          {red.red === 'tiktok' && (tipo === 'video' || tipo === 'fotos') && (
            <OpcionesTikTokForm
              tipo={tipo}
              redId={red.id}
              valor={opciones}
              onChange={(v) => setValue('opciones', v, { shouldDirty: true })}
            />
          )}

          {tipo === 'historia' ? (
            <p className="m-0 rounded-lg border border-line bg-raised p-3 text-sm text-muted">
              Las historias no llevan texto.
            </p>
          ) : (
            <div className="grid gap-2">
              <label htmlFor={`${id}-texto`} className="text-sm font-bold">
                {tipo === 'fotos' ? 'Descripción' : 'Texto'}
              </label>
              <textarea
                id={`${id}-texto`}
                rows={5}
                disabled={pendiente}
                aria-describedby={`${id}-cuenta`}
                aria-invalid={queda < 0}
                className={cn(CAMPO, 'resize-y leading-6')}
                placeholder="Escribí el texto que acompaña la publicación"
                {...register('texto')}
              />
              <span
                id={`${id}-cuenta`}
                className={cn(
                  'cifra justify-self-end font-mono text-xs',
                  queda < 0 ? 'text-danger' : 'text-muted',
                )}
              >
                {queda < 0 ? `${-queda} de más (máximo ${limite})` : `${texto.length} de ${limite}`}
              </span>
            </div>
          )}

          <fieldset className="grid gap-2 border-0 p-0">
            <legend className="mb-2 text-sm font-bold">Cuándo</legend>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label htmlFor={`${id}-fecha`} className="text-xs font-semibold text-muted">
                  Fecha
                </label>
                <input
                  id={`${id}-fecha`}
                  type="date"
                  min={hoy}
                  disabled={pendiente}
                  aria-invalid={Boolean(errors.fecha)}
                  aria-describedby={errors.fecha ? `${id}-error-fecha` : undefined}
                  className={CAMPO}
                  {...register('fecha')}
                />
                {errors.fecha && (
                  <span id={`${id}-error-fecha`} className="text-xs text-danger">
                    {errors.fecha.message}
                  </span>
                )}
              </div>
              <div className="grid gap-1.5">
                <label htmlFor={`${id}-hora`} className="text-xs font-semibold text-muted">
                  Hora
                </label>
                <input
                  id={`${id}-hora`}
                  type="time"
                  disabled={pendiente}
                  aria-invalid={Boolean(errors.hora)}
                  aria-describedby={errors.hora ? `${id}-error-hora` : undefined}
                  className={CAMPO}
                  {...register('hora')}
                />
                {errors.hora && (
                  <span id={`${id}-error-hora`} className="text-xs text-danger">
                    {errors.hora.message}
                  </span>
                )}
              </div>
            </div>
            <p className="m-0 text-xs text-muted">
              Hora de Buenos Aires. Para programar tiene que ser dentro de 5 minutos o más, y hasta
              180 días. «Publicar ahora» ignora la fecha.
            </p>
          </fieldset>
        </>
      )}

      <div
        ref={avisoRef}
        tabIndex={-1}
        aria-live="polite"
        className="grid gap-2 outline-none empty:hidden"
      >
        {problemas.length > 0 && (
          <div role="alert" className="rounded-lg border border-danger/50 bg-raised p-3 text-sm">
            <p className="m-0 font-bold">Revisá esto antes de seguir:</p>
            <ul className="m-0 mt-1.5 list-disc pl-5">
              {problemas.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        )}
        {errorEnvio && (
          <p role="alert" className="m-0 rounded-lg border border-danger/50 bg-raised p-3 text-sm">
            {errorEnvio}
          </p>
        )}
      </div>

      <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-col gap-2 border-t border-hairline bg-surface px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] min-[430px]:flex-row min-[430px]:flex-wrap">
        {!edicion ? (
          <>
            <Boton
              variante="primario"
              disabled={bloqueado}
              onClick={() => void enviar('programar')}
              className="min-[430px]:flex-1"
            >
              <CalendarClock className="size-4" aria-hidden="true" />
              {pendiente ? 'Guardando…' : 'Programar'}
            </Boton>
            <Boton disabled={bloqueado} onClick={() => void enviar('borrador')}>
              <Save className="size-4" aria-hidden="true" />
              Guardar borrador
            </Boton>
            <Boton disabled={bloqueado} onClick={() => void enviar('publicar_ahora')}>
              <Send className="size-4" aria-hidden="true" />
              Publicar ahora
            </Boton>
          </>
        ) : !editable ? (
          <p className="m-0 w-full text-sm text-muted" role="status">
            Esta publicación ya no se puede editar: está «{pieza.estado}». Lo que escribiste queda
            acá.
          </p>
        ) : (
          <>
            <Boton
              variante="primario"
              disabled={bloqueado}
              onClick={() => void enviarEdicion('guardar')}
              className="min-[430px]:flex-1"
            >
              <Save className="size-4" aria-hidden="true" />
              {pendiente ? 'Guardando…' : 'Guardar cambios'}
            </Boton>
            {pieza.estado === 'borrador' && (
              <>
                <Boton disabled={bloqueado} onClick={() => void enviarEdicion('programar')}>
                  <CalendarClock className="size-4" aria-hidden="true" />
                  Programar
                </Boton>
                <Boton disabled={bloqueado} onClick={() => void enviarEdicion('publicar_ahora')}>
                  <Send className="size-4" aria-hidden="true" />
                  Publicar ahora
                </Boton>
              </>
            )}
          </>
        )}
        {subiendo && (
          <p className="m-0 w-full text-xs text-muted" role="status">
            Esperá a que terminen de subirse los archivos: los videos pesados pueden tardar unos
            minutos.
          </p>
        )}
      </div>

      {porConfirmar && red && (
        <ConfirmarDialogo
          titulo="¿Publicar ahora?"
          confirmar="Publicar ahora"
          deshabilitado={pendiente}
          onCancelar={() => setPorConfirmar(null)}
          onConfirmar={() => {
            const { ejecutar } = porConfirmar
            setPorConfirmar(null)
            ejecutar()
          }}
        >
          Se publica en {NOMBRE_RED[red.red]} (@{red.username}) en este momento y no se puede
          deshacer.
          {red.red === 'tiktok' && tipo === 'video' && ' El video de TikTok queda público.'}
        </ConfirmarDialogo>
      )}
    </form>
  )
}
