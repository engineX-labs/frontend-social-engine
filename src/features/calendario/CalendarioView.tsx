import { getRouteApi } from '@tanstack/react-router'
import { motion, type PanInfo } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { useCalendario } from '@/api/calendario'
import { EstadoError } from '@/components/estados'
import type { CalendarioSearch } from '@/app/search'
import { conRendimiento } from '@/domain/metrics'
import type { Item } from '@/domain/types'
import { claveDia, claveMes, desplazarMes, diasDeGrilla } from '@/lib/fecha'
import { Agenda } from './Agenda'
import { agruparPorDia, type Tipo } from './agrupar'
import { BarraMes } from './BarraMes'
import { Grilla, GrillaEsqueleto, type Rendimientos } from './Grilla'
import { Resumen, ResumenEsqueleto } from './Resumen'
import { TarjetaFidel } from './TarjetaFidel'
import { useEsEscritorio } from './useMedia'

const ruta = getRouteApi('/')
const SIN_OCULTAR: readonly Tipo[] = []

/** Calendario mensual. Todo el estado (mes, día, ítem abierto, filtros) vive en la URL. */
export function CalendarioView() {
  const search = ruta.useSearch()
  const navigate = ruta.useNavigate()
  const escritorio = useEsEscritorio()

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
  const { data, isPending, isError, refetch } = useCalendario(mes)

  const ir = (cambio: Partial<CalendarioSearch>) =>
    void navigate({ search: (prev) => ({ ...prev, ...cambio }) })

  const porDia = useMemo(() => (data ? agruparPorDia(data, ocultar) : null), [data, ocultar])
  const sinFiltros = useMemo(() => (data ? agruparPorDia(data, SIN_OCULTAR) : null), [data])
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
  const abrir = (it: Item) => ir({ item: it.id, dia: claveDia(it.fecha) })
  const elegirDia = (dia: string) =>
    ir({ dia: escritorio && dia === diaExplicito ? undefined : dia })
  const cambiarMes = (m: string) => ir({ mes: m, dia: undefined, item: undefined })

  // Móvil: deslizar a los lados cambia de mes (los botones siguen siendo la vía con teclado).
  const alSoltar = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info
    if (Math.abs(offset.x) < Math.abs(offset.y)) return
    if (offset.x < -60 || velocity.x < -500) cambiarMes(desplazarMes(mes, 1))
    else if (offset.x > 60 || velocity.x > 500) cambiarMes(desplazarMes(mes, -1))
  }

  return (
    <section aria-label="Calendario" className="flex flex-col gap-4">
      <h1 className="sr-only">Calendario</h1>
      <BarraMes
        mes={mes}
        ocultar={ocultar}
        cuentas={data ? { publicada: data.publicadas.length, idea: data.ideas.length } : null}
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
          mensaje="No pudimos cargar el calendario."
          onReintentar={() => void refetch()}
        />
      )}
      {data && porDia && sinFiltros && (
        <>
          <Resumen datos={data} onItem={(id) => ir({ item: id })} />
          <TarjetaFidel ideas={data.ideas} onVer={(id) => ir({ item: id })} />
          {data.publicadas.length + data.ideas.length === 0 && (
            <p className="rounded-xl bg-inset/60 px-4 py-3 text-sm text-muted">
              Este mes todavía no tiene publicaciones ni ideas.
            </p>
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
            onDragEnd={alSoltar}
            className="touch-pan-y"
          >
            <Grilla
              mes={mes}
              hoy={hoy}
              seleccionado={mostrarAgenda ? diaAgenda : null}
              porDia={porDia}
              rendimientos={rendimientos}
              escritorio={escritorio}
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
