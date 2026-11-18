import { getRouteApi } from '@tanstack/react-router'
import { motion, type PanInfo } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useCalendario } from '@/api/calendario'
import { esErrorDeAcceso, mensajeDeApi } from '@/api/errores'
import { useBorradoresSinFecha, usePublicacionDisponible } from '@/api/publicacion'
import { EstadoError } from '@/components/estados'
import type { CalendarioSearch } from '@/app/search'
import { conRendimiento } from '@/domain/metrics'
import { claveDia, claveMes, desplazarMes, diasDeGrilla } from '@/lib/fecha'
import { Agenda } from './Agenda'
import { agruparPorDia, programadasDelCalendario, type ItemCalendario, type Tipo } from './agrupar'
import { BarraMes } from './BarraMes'
import { Grilla, GrillaEsqueleto, type Rendimientos } from './Grilla'
import { Resumen, ResumenEsqueleto } from './Resumen'
import { SinFecha } from './SinFecha'
import { TarjetaFidel } from './TarjetaFidel'
import { useAncho } from '@/lib/useAncho'
import { useEsEscritorio } from '@/lib/useMedia'

const ruta = getRouteApi('/')
const SIN_OCULTAR: readonly Tipo[] = []
/** Desde este ancho del calendario la grilla muestra chips; por debajo, puntos y agenda. */
const ANCHO_GRILLA = 720

/** Calendario mensual. Todo el estado (mes, día, ítem abierto, filtros) vive en la URL. */
export function CalendarioView() {
  const search = ruta.useSearch()
  const navigate = ruta.useNavigate()
  // La grilla con chips necesita ancho: depende del espacio que deja la barra de Fidel,
  // no solo de la pantalla.
  const seccion = useRef<HTMLElement>(null)
  const ancho = useAncho(seccion)
  const escritorio = useEsEscritorio() && (ancho === null || ancho >= ANCHO_GRILLA)

  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => {
      const n = new Date()
      setAhora((prev) => (claveDia(prev) === claveDia(n) ? prev : n))
    }, 60_000)
    return () => clearInterval(t)
  }, [])
  const hoy = claveDia(ahora)
  const mes = search.mes ?? claveMes(ahora)
  const ocultar = search.ocultar ?? SIN_OCULTAR
  const { data, error, isPending, isError, refetch } = useCalendario(mes)
  // Publicar y programar: con la bandera apagada (o el backend en 404) el calendario es el de siempre,
  // sin pedir `/api/redes` ni `/api/programadas` y sin mirar `programadas` aunque llegue.
  const { disponible: conPublicar } = usePublicacionDisponible()
  const borradoresQ = useBorradoresSinFecha(conPublicar)

  const ir = (cambio: Partial<CalendarioSearch>) =>
    void navigate({ search: (prev) => ({ ...prev, ...cambio }) })

  const vista = useMemo(
    () => (data ? { ...data, programadas: conPublicar ? (data.programadas ?? []) : [] } : null),
    [data, conPublicar],
  )
  const porDia = useMemo(() => (vista ? agruparPorDia(vista, ocultar) : null), [vista, ocultar])
  const sinFiltros = useMemo(() => (vista ? agruparPorDia(vista, SIN_OCULTAR) : null), [vista])
  const cantidadProgramadas = vista ? programadasDelCalendario(vista).length : 0
  const rendimientos = useMemo<Rendimientos>(
    () =>
      new Map(
        data?.resumen
          ? conRendimiento(data.publicadas, data.resumen).map((p) => [
              p.id,
              { razon: p.razon, clase: p.clase },
            ])
          : [],
      ),
    [data],
  )

  // Dirección del último cambio de mes: la grilla nueva entra desde ese lado.
  const [mesPrevio, setMesPrevio] = useState(mes)
  const [direccion, setDireccion] = useState(0)
  if (mesPrevio !== mes) {
    setDireccion(mes > mesPrevio ? 1 : -1)
    setMesPrevio(mes)
  }

  const diaExplicito =
    search.dia?.startsWith(mes) && diasDeGrilla(mes).includes(search.dia) ? search.dia : null
  const primerConItems = [...(sinFiltros?.keys() ?? [])].sort()[0]
  const diaAgenda = diaExplicito ?? (hoy.startsWith(mes) ? hoy : (primerConItems ?? `${mes}-01`))
  // En escritorio la agenda aparece al elegir un día; en móvil siempre hay un día elegido.
  const mostrarAgenda = escritorio ? diaExplicito !== null : true

  const alternar = (tipo: Tipo) => {
    const sig = ocultar.includes(tipo) ? ocultar.filter((t) => t !== tipo) : [...ocultar, tipo]
    ir({ ocultar: sig.length ? sig : undefined })
  }
  const abrir = (it: ItemCalendario) => ir({ item: it.id, dia: claveDia(it.fecha) })
  const elegirDia = (dia: string) =>
    ir({ dia: escritorio && dia === diaExplicito ? undefined : dia })
  const cambiarMes = (m: string) => ir({ mes: m, dia: undefined, item: undefined })

  // Móvil: deslizar a los lados cambia de mes (los botones siguen siendo la vía con teclado).
  // Si hubo arrastre, el click que suelta el dedo sobre un día no lo elige.
  const arrastrando = useRef(false)
  const alSoltar = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info
    if (Math.abs(offset.x) < Math.abs(offset.y)) return
    if (offset.x < -60 || velocity.x < -500) cambiarMes(desplazarMes(mes, 1))
    else if (offset.x > 60 || velocity.x > 500) cambiarMes(desplazarMes(mes, -1))
  }

  return (
    <section ref={seccion} aria-label="Calendario" className="@container flex flex-col gap-4">
      <h1 className="sr-only">Calendario</h1>
      <BarraMes
        mes={mes}
        ocultar={ocultar}
        cuentas={
          data
            ? {
                publicada: data.publicadas.length,
                idea: data.ideas.length,
                programada: cantidadProgramadas,
              }
            : null
        }
        conProgramadas={conPublicar}
        onMes={cambiarMes}
        onHoy={() => ir({ mes: undefined, dia: hoy, item: undefined })}
        onFiltro={alternar}
      />
      {isPending && (
        <div role="status" aria-label="Cargando el mes" className="flex flex-col gap-4">
          <ResumenEsqueleto />
          <GrillaEsqueleto escritorio={escritorio} />
        </div>
      )}
      {isError && (
        <EstadoError
          mensaje={mensajeDeApi(error, 'No pudimos cargar el calendario.')}
          onReintentar={esErrorDeAcceso(error) ? undefined : () => void refetch()}
        />
      )}
      {data && porDia && sinFiltros && (
        <>
          <Resumen datos={data} onItem={(id) => ir({ item: id })} />
          <TarjetaFidel ideas={data.ideas} onVer={(id) => ir({ item: id })} />
          {data.publicadas.length + data.ideas.length + cantidadProgramadas === 0 && (
            <p className="rounded-xl bg-inset/60 px-4 py-3 text-sm text-muted">
              {conPublicar
                ? 'Este mes todavía no tiene publicaciones, piezas programadas ni ideas.'
                : 'Este mes todavía no tiene publicaciones ni ideas.'}
            </p>
          )}
          {conPublicar && !ocultar.includes('programada') && (
            <SinFecha
              borradores={borradoresQ.data ?? []}
              error={borradoresQ.isError}
              onReintentar={() => void borradoresQ.refetch()}
              onAbrir={(id) => ir({ item: id })}
            />
          )}
          <motion.div
            key={mes}
            initial={{ opacity: 0, x: direccion * 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
            drag={escritorio ? false : 'x'}
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            dragSnapToOrigin
            onDragStart={() => {
              arrastrando.current = true
            }}
            onDragEnd={alSoltar}
            onPointerDownCapture={() => {
              arrastrando.current = false
            }}
            onClickCapture={(e) => {
              if (!arrastrando.current) return
              e.stopPropagation()
              e.preventDefault()
            }}
            className="touch-pan-y"
          >
            <Grilla
              mes={mes}
              hoy={hoy}
              seleccionado={mostrarAgenda ? diaAgenda : null}
              porDia={porDia}
              rendimientos={rendimientos}
              escritorio={escritorio}
              conRed={conPublicar}
              onDia={elegirDia}
              onMas={(dia) => ir({ dia })}
              onItem={abrir}
            />
          </motion.div>
          {mostrarAgenda && (
            <Agenda
              dia={diaAgenda}
              hoy={hoy}
              items={porDia.get(diaAgenda) ?? []}
              rendimientos={rendimientos}
              conRed={conPublicar}
              ocultas={
                (sinFiltros.get(diaAgenda)?.length ?? 0) - (porDia.get(diaAgenda)?.length ?? 0)
              }
              onItem={(it) => ir({ item: it.id })}
            />
          )}
        </>
      )}
    </section>
  )
}
