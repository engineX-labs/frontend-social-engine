import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import {
  CalendarClock,
  CirclePlus,
  ExternalLink,
  Film,
  Pencil,
  RotateCw,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useCallback, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { esErrorDeAcceso, mensajeDePublicar } from '@/api/errores'
import { ApiError } from '@/api/http'
import {
  programadaQuery,
  useBorrarProgramada,
  useEditarProgramada,
  useRedes,
  useReintentarProgramada,
  type CambiosProgramada,
} from '@/api/publicacion'
import { ConfirmarDialogo } from '@/components/ConfirmarDialogo'
import { EstadoError } from '@/components/estados'
import { IconoRed } from '@/components/IconoRed'
import { PanelLateral } from '@/components/PanelLateral'
import { Boton } from '@/components/ui/Boton'
import {
  admitePortada,
  ETIQUETA_TIPO,
  situacionDe,
  type SituacionProgramada,
} from '@/domain/publicacion'
import type { Programada } from '@/domain/types'
import { EtiquetaEstado } from '@/features/calendario/EtiquetaEstado'
import { notaDeEstado } from '@/features/calendario/estado'
import { Compositor } from '@/features/publicar/Compositor'
import {
  armarCambios,
  utcAFechaHora,
  valoresDePieza,
  type AccionGuardada,
} from '@/features/publicar/envio'
import { conReintentoSiProcesando } from '@/features/publicar/reintento'
import { claveDia, diaLargo, hora } from '@/lib/fecha'
import { NOMBRE_RED } from '@/lib/redes'
import { cn } from '@/lib/utils'
import { Campo, Seccion } from './Cabecera'
import { cuando } from './formato'

const ruta = getRouteApi('/')

type Confirmacion = 'borrar' | 'cancelar' | 'publicar'

const CAMPO =
  'min-h-11 w-full rounded-md border border-line bg-raised px-3 py-2 text-base outline-none transition-[border-color] duration-(--dur-fast) ease-brand focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) disabled:opacity-60'

function mensajeDeExito(pieza: Programada, accion: AccionGuardada | 'reprogramar'): string {
  if (accion === 'publicar_ahora')
    return 'Se está publicando. Zernio la está procesando; los videos pesados pueden tardar unos minutos. Te avisamos cuando termine.'
  if ((accion === 'programar' || accion === 'reprogramar') && pieza.fecha)
    return `Programada para el ${diaLargo(pieza.fecha)} a las ${hora(pieza.fecha)}.`
  return 'Guardamos los cambios.'
}

/**
 * Detalle de una pieza guardada desde la app (borrador, programada, fallida…) con sus acciones, que
 * dependen del estado. Se abre con `?item=<id>`; `inicial` es lo que ya se sabía de ella, para no
 * mostrar un vacío mientras se vuelve a leer.
 */
export function PanelProgramada({ id, inicial }: { id: string; inicial: Programada }) {
  const navigate = ruta.useNavigate()
  const queryClient = useQueryClient()
  const consulta = useQuery({ ...programadaQuery(id), placeholderData: inicial })
  const pieza = consulta.data ?? inicial
  const noExiste = consulta.error instanceof ApiError && consulta.error.status === 404
  const redes = useRedes()
  const red = redes.data?.find((r) => r.id === pieza.redId)
  const situacion = situacionDe(pieza)

  const [editando, setEditando] = useState(false)
  const [reprogramando, setReprogramando] = useState(false)
  const [confirmar, setConfirmar] = useState<Confirmacion | null>(null)
  const [descartar, setDescartar] = useState(false)
  const [problemas, setProblemas] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const sucio = useRef(false)
  const alCambiarSucio = useCallback((s: boolean) => {
    sucio.current = s
  }, [])

  const borrar = useBorrarProgramada()
  const editar = useEditarProgramada()
  const reintentar = useReintentarProgramada()
  const ocupado = borrar.isPending || editar.isPending || reintentar.isPending

  const cerrar = () =>
    void navigate({ search: (prev) => ({ ...prev, item: undefined }), resetScroll: false })
  // Con cambios sin guardar no se cierra de un golpe.
  const pedirCierre = () => (editando && sucio.current ? setDescartar(true) : cerrar())

  const guardarEnCache = (nueva: Programada) =>
    queryClient.setQueryData(programadaQuery(id).queryKey, nueva)

  /** Corre una escritura mostrando sus errores en el panel (los 422 como lista, el resto como aviso). */
  async function correr<T>(escribir: () => Promise<T>, alExito: (r: T) => void) {
    setError(null)
    setProblemas([])
    try {
      alExito(await conReintentoSiProcesando(escribir))
    } catch (e) {
      if (e instanceof ApiError && e.status === 422)
        setProblemas(e.problemas.length ? e.problemas : [e.message])
      else setError(mensajeDePublicar(e, 'No pudimos hacerlo. Probá de nuevo en unos segundos.'))
    }
  }

  const cambiarEstado = (accion: 'programar' | 'publicar_ahora') => {
    const valores = valoresDePieza(pieza)
    const r = armarCambios(valores, valores, pieza, pieza.red, accion, Date.now())
    if (!r.cambios) {
      setError(null)
      setProblemas([...r.problemas, 'Editá la publicación para completarlo.'])
      return
    }
    const cambios = r.cambios
    void correr(
      () => editar.mutateAsync({ id: pieza.id, cambios }),
      (nueva) => {
        guardarEnCache(nueva)
        toast(mensajeDeExito(nueva, accion))
      },
    )
  }

  const quitar = () => {
    const borrador = pieza.estado === 'borrador'
    setConfirmar(null)
    void correr(
      () => borrar.mutateAsync(pieza.id),
      () => {
        toast(borrador ? 'Borramos el borrador.' : 'Cancelamos la publicación programada.')
        cerrar()
      },
    )
  }

  const reintentarPieza = () =>
    void correr(
      () => reintentar.mutateAsync(pieza.id),
      (nueva) => {
        guardarEnCache(nueva)
        toast('Reintentando la publicación.')
      },
    )

  const crearDeNuevo = () =>
    void navigate({
      search: (prev) => ({ ...prev, item: undefined, nueva: true, copiar: pieza.id }),
      resetScroll: false,
    })

  const titulo = editando
    ? 'Editar publicación'
    : `${ETIQUETA_TIPO[pieza.formato]} · ${pieza.fecha ? diaLargo(pieza.fecha) : 'sin fecha'}`

  const acciones = !editando && (
    <Acciones
      situacion={situacion}
      deshabilitado={ocupado}
      alEditar={() => setEditando(true)}
      alProgramar={() => cambiarEstado('programar')}
      alPublicar={() => setConfirmar('publicar')}
      alBorrar={() => setConfirmar('borrar')}
      alReprogramar={() => setReprogramando(true)}
      alCancelar={() => setConfirmar('cancelar')}
      alReintentar={reintentarPieza}
      alCrearDeNuevo={crearDeNuevo}
    />
  )

  return (
    <>
      <PanelLateral
        idTitulo="detalle-titulo"
        titulo={titulo}
        encima={
          <span className="flex flex-wrap items-center gap-2">
            <EtiquetaEstado situacion={situacion} />
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
              <IconoRed red={pieza.red} className="size-3.5" />
              {NOMBRE_RED[pieza.red]}
            </span>
          </span>
        }
        etiquetaCerrar="Cerrar detalle"
        onCerrar={pedirCierre}
        pie={acciones || undefined}
      >
        {noExiste ? (
          <EstadoError mensaje="Esta publicación ya no existe. Puede que la hayan borrado." />
        ) : editando ? (
          <Compositor
            pieza={pieza}
            onGuardada={(nueva, accion) => {
              guardarEnCache(nueva)
              toast(mensajeDeExito(nueva, accion))
              setEditando(false)
            }}
            onSucio={alCambiarSucio}
          />
        ) : (
          <div className="grid gap-6">
            {(problemas.length > 0 || error) && (
              <div
                role="alert"
                className="rounded-lg border border-danger/50 bg-raised p-3 text-sm"
              >
                {problemas.length > 0 && (
                  <>
                    <p className="m-0 font-bold">Revisá esto antes de seguir:</p>
                    <ul className="m-0 mt-1.5 list-disc pl-5">
                      {problemas.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </>
                )}
                {error && <p className="m-0">{error}</p>}
              </div>
            )}
            {consulta.isError && !noExiste && !esErrorDeAcceso(consulta.error) && (
              <p className="m-0 text-xs text-muted">
                No pudimos actualizar el estado. Lo que ves puede estar desactualizado.
              </p>
            )}
            <DetalleProgramada
              pieza={pieza}
              situacion={situacion}
              username={red?.username}
              reprogramando={reprogramando}
              deshabilitado={ocupado}
              onCancelarReprogramar={() => setReprogramando(false)}
              onReprogramar={(fecha, horaTexto) => {
                const inicial = valoresDePieza(pieza)
                const r = armarCambios(
                  { ...inicial, fecha, hora: horaTexto },
                  inicial,
                  pieza,
                  pieza.red,
                  'guardar',
                  Date.now(),
                )
                if (!r.cambios || r.sinCambios) {
                  setError(null)
                  setProblemas(r.problemas.length ? r.problemas : ['Elegí una fecha distinta.'])
                  return
                }
                const cambios: CambiosProgramada = r.cambios
                void correr(
                  () => editar.mutateAsync({ id: pieza.id, cambios }),
                  (nueva) => {
                    guardarEnCache(nueva)
                    toast(mensajeDeExito(nueva, 'reprogramar'))
                    setReprogramando(false)
                  },
                )
              }}
            />
          </div>
        )}
      </PanelLateral>

      {confirmar === 'borrar' && (
        <ConfirmarDialogo
          titulo="¿Borrar el borrador?"
          confirmar="Borrar"
          cancelar="Volver"
          onCancelar={() => setConfirmar(null)}
          onConfirmar={quitar}
        >
          Se borra y no se puede recuperar.
        </ConfirmarDialogo>
      )}
      {confirmar === 'cancelar' && (
        <ConfirmarDialogo
          titulo="¿Cancelar la publicación programada?"
          confirmar="Cancelar publicación"
          cancelar="Volver"
          onCancelar={() => setConfirmar(null)}
          onConfirmar={quitar}
        >
          {pieza.fecha
            ? `Deja de estar programada para el ${cuando(pieza.fecha)} y no se publica.`
            : 'Deja de estar programada y no se publica.'}{' '}
          Si después querés publicarla, tenés que crearla de nuevo.
        </ConfirmarDialogo>
      )}
      {confirmar === 'publicar' && (
        <ConfirmarDialogo
          titulo="¿Publicar ahora?"
          confirmar="Publicar ahora"
          cancelar="Volver"
          onCancelar={() => setConfirmar(null)}
          onConfirmar={() => {
            setConfirmar(null)
            cambiarEstado('publicar_ahora')
          }}
        >
          Se publica en {NOMBRE_RED[pieza.red]}
          {red ? ` (@${red.username})` : ''} en este momento y no se puede deshacer.
          {pieza.red === 'tiktok' &&
            pieza.formato === 'video' &&
            ' El video de TikTok queda público.'}
        </ConfirmarDialogo>
      )}
      {descartar && (
        <ConfirmarDialogo
          titulo="¿Descartar los cambios?"
          confirmar="Descartar"
          cancelar="Seguir editando"
          onCancelar={() => setDescartar(false)}
          onConfirmar={cerrar}
        >
          Lo que cambiaste se pierde.
        </ConfirmarDialogo>
      )}
    </>
  )
}

function Acciones({
  situacion,
  deshabilitado,
  alEditar,
  alProgramar,
  alPublicar,
  alBorrar,
  alReprogramar,
  alCancelar,
  alReintentar,
  alCrearDeNuevo,
}: {
  situacion: SituacionProgramada
  deshabilitado: boolean
  alEditar: () => void
  alProgramar: () => void
  alPublicar: () => void
  alBorrar: () => void
  alReprogramar: () => void
  alCancelar: () => void
  alReintentar: () => void
  alCrearDeNuevo: () => void
}): ReactNode {
  const base = 'min-[430px]:flex-1'
  const fila = (...hijos: ReactNode[]) => (
    <div className="flex flex-col gap-2 min-[430px]:flex-row min-[430px]:flex-wrap">{hijos}</div>
  )
  switch (situacion) {
    case 'borrador':
      return fila(
        <Boton
          key="e"
          variante="primario"
          className={base}
          disabled={deshabilitado}
          onClick={alEditar}
        >
          <Pencil className="size-4" aria-hidden="true" />
          Editar
        </Boton>,
        <Boton key="p" disabled={deshabilitado} onClick={alProgramar}>
          <CalendarClock className="size-4" aria-hidden="true" />
          Programar
        </Boton>,
        <Boton key="a" disabled={deshabilitado} onClick={alPublicar}>
          <Send className="size-4" aria-hidden="true" />
          Publicar ahora
        </Boton>,
        <Boton key="b" variante="fantasma" disabled={deshabilitado} onClick={alBorrar}>
          <Trash2 className="size-4" aria-hidden="true" />
          Borrar borrador
        </Boton>,
      )
    case 'programada':
      return fila(
        <Boton
          key="e"
          variante="primario"
          className={base}
          disabled={deshabilitado}
          onClick={alEditar}
        >
          <Pencil className="size-4" aria-hidden="true" />
          Editar
        </Boton>,
        <Boton key="r" disabled={deshabilitado} onClick={alReprogramar}>
          <CalendarClock className="size-4" aria-hidden="true" />
          Reprogramar
        </Boton>,
        <Boton key="c" variante="fantasma" disabled={deshabilitado} onClick={alCancelar}>
          <XCircle className="size-4" aria-hidden="true" />
          Cancelar publicación
        </Boton>,
      )
    case 'fallida':
      return fila(
        <Boton
          key="r"
          variante="primario"
          className={base}
          disabled={deshabilitado}
          onClick={alReintentar}
        >
          <RotateCw className="size-4" aria-hidden="true" />
          Reintentar
        </Boton>,
      )
    case 'no-se-publico':
      return fila(
        <Boton
          key="n"
          variante="primario"
          className={base}
          disabled={deshabilitado}
          onClick={alCrearDeNuevo}
        >
          <CirclePlus className="size-4" aria-hidden="true" />
          Crear de nuevo
        </Boton>,
      )
    // Publicando, «Confirmando…», publicada y cancelada no admiten acciones: la API respondería 409.
    default:
      return null
  }
}

function DetalleProgramada({
  pieza,
  situacion,
  username,
  reprogramando,
  deshabilitado,
  onReprogramar,
  onCancelarReprogramar,
}: {
  pieza: Programada
  situacion: SituacionProgramada
  username: string | undefined
  reprogramando: boolean
  deshabilitado: boolean
  onReprogramar: (fecha: string, hora: string) => void
  onCancelarReprogramar: () => void
}) {
  const nota = notaDeEstado(pieza.error, situacion)
  const falla = situacion === 'fallida' || situacion === 'no-se-publico'
  return (
    <>
      {nota && (
        <p
          className={cn(
            'm-0 rounded-lg border bg-raised p-3 text-sm font-semibold',
            falla ? 'border-danger' : 'border-line',
          )}
        >
          {nota}
        </p>
      )}
      {situacion === 'publicando' && (
        <p className="m-0 rounded-lg border border-line bg-raised p-3 text-sm font-semibold">
          Se está publicando. Se actualiza solo.
        </p>
      )}

      <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-4">
        <Campo etiqueta="Red">
          {NOMBRE_RED[pieza.red]}
          {username && <span className="font-normal text-muted"> @{username}</span>}
        </Campo>
        <Campo etiqueta="Formato">{ETIQUETA_TIPO[pieza.formato]}</Campo>
        <div className="col-span-2 min-w-0">
          <dt className="rotulo">Cuándo</dt>
          <dd className="mt-1 text-sm font-semibold">
            {pieza.fecha ? cuando(pieza.fecha) : 'Sin fecha todavía'}
          </dd>
        </div>
      </dl>

      {reprogramando && pieza.estado === 'programada' && (
        <Reprogramar
          fechaActual={pieza.fecha}
          deshabilitado={deshabilitado}
          onGuardar={onReprogramar}
          onCancelar={onCancelarReprogramar}
        />
      )}

      <Seccion titulo="Texto">
        <p className="m-0 text-sm leading-relaxed whitespace-pre-wrap">
          {pieza.texto || <span className="text-muted">Sin texto</span>}
        </p>
      </Seccion>

      {admitePortada(pieza.formato) && (
        <Seccion titulo="Portada">
          {pieza.portadaUrl ? (
            <div className="aspect-[4/5] w-24 overflow-hidden rounded-lg bg-inset">
              <img
                src={pieza.portadaUrl}
                alt="Portada elegida"
                loading="lazy"
                className="size-full object-cover"
              />
            </div>
          ) : (
            <p className="m-0 text-sm text-muted">
              Sin portada elegida: la red usa un fotograma del video.
            </p>
          )}
        </Seccion>
      )}

      <Seccion titulo={pieza.medios.length === 1 ? 'Archivo' : 'Archivos'}>
        {pieza.medios.length === 0 ? (
          <p className="m-0 text-sm text-muted">Todavía no subiste archivos.</p>
        ) : (
          <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0">
            {pieza.medios.map((m, i) => (
              <li
                key={`${m.url}-${i}`}
                className="relative grid aspect-[4/5] place-items-center overflow-hidden rounded-lg bg-inset"
              >
                <Film className="size-6 text-muted" aria-hidden="true" />
                {m.tipo === 'imagen' ? (
                  <img
                    src={m.url}
                    alt={`Imagen ${i + 1} de ${pieza.medios.length}`}
                    loading="lazy"
                    className="absolute inset-0 size-full object-cover"
                  />
                ) : (
                  <video
                    src={m.url}
                    preload="metadata"
                    muted
                    aria-label={`Video ${i + 1} de ${pieza.medios.length}`}
                    className="absolute inset-0 size-full object-cover"
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </Seccion>

      {(pieza.urlPublicada || pieza.itemId) && (
        <div className="flex flex-col gap-2">
          {pieza.urlPublicada && (
            <a
              href={pieza.urlPublicada}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-accent-ink underline-offset-4 hover:underline"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              Ver en {NOMBRE_RED[pieza.red]}
              <span className="sr-only"> (se abre en otra pestaña)</span>
            </a>
          )}
          {pieza.itemId && <VerMetricas itemId={pieza.itemId} fecha={pieza.fecha} />}
        </div>
      )}
    </>
  )
}

/** Enlace al detalle de la publicación con sus métricas (el que ya existe para las publicadas). */
function VerMetricas({ itemId, fecha }: { itemId: string; fecha: string | null }) {
  const navigate = ruta.useNavigate()
  return (
    <Boton
      className="self-start"
      onClick={() =>
        void navigate({
          search: (prev) => ({
            ...prev,
            item: itemId,
            ...(fecha ? { dia: claveDia(fecha) } : {}),
          }),
          resetScroll: false,
        })
      }
    >
      Ver las métricas
    </Boton>
  )
}

function Reprogramar({
  fechaActual,
  deshabilitado,
  onGuardar,
  onCancelar,
}: {
  fechaActual: string | null
  deshabilitado: boolean
  onGuardar: (fecha: string, hora: string) => void
  onCancelar: () => void
}) {
  const inicial = fechaActual ? utcAFechaHora(fechaActual) : { fecha: '', hora: '' }
  const [fecha, setFecha] = useState(inicial.fecha)
  const [horaTexto, setHoraTexto] = useState(inicial.hora)
  const [hoy] = useState(() => claveDia(new Date()))
  return (
    <fieldset className="grid gap-3 rounded-xl border border-line bg-raised p-3">
      <legend className="px-1 text-sm font-bold">Reprogramar</legend>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1.5 text-xs font-semibold text-muted">
          Fecha
          <input
            type="date"
            min={hoy}
            value={fecha}
            disabled={deshabilitado}
            onChange={(e) => setFecha(e.target.value)}
            className={CAMPO}
          />
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-muted">
          Hora
          <input
            type="time"
            value={horaTexto}
            disabled={deshabilitado}
            onChange={(e) => setHoraTexto(e.target.value)}
            className={CAMPO}
          />
        </label>
      </div>
      <p className="m-0 text-xs text-muted">Hora de Buenos Aires.</p>
      <div className="flex gap-2">
        <Boton
          variante="primario"
          disabled={deshabilitado}
          onClick={() => onGuardar(fecha, horaTexto)}
        >
          Guardar fecha
        </Boton>
        <Boton variante="fantasma" disabled={deshabilitado} onClick={onCancelar}>
          Cerrar
        </Boton>
      </div>
    </fieldset>
  )
}
