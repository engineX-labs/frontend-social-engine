import { getRouteApi } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useCalendario } from '@/api/calendario'
import { EstadoCarga, EstadoError } from '@/components/estados'
import type { CalendarioSearch } from '@/app/search'
import type { Item } from '@/domain/types'
import { claveDia, claveMes, diasDeGrilla } from '@/lib/fecha'
import { Agenda } from './Agenda'
import { agruparPorDia, type Tipo } from './agrupar'
import { BannerFidel } from './BannerFidel'
import { BarraMes } from './BarraMes'
import { Grilla } from './Grilla'
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

  return (
    <section aria-label="Calendario" className="flex flex-col gap-4">
      <h1 className="sr-only">Calendario</h1>
      <BarraMes
        mes={mes}
        ocultar={ocultar}
        cuentas={data ? { publicada: data.publicadas.length, idea: data.ideas.length } : null}
        onMes={(m) => ir({ mes: m, dia: undefined, item: undefined })}
        onHoy={() => ir({ mes: undefined, dia: hoy, item: undefined })}
        onFiltro={alternar}
      />
      {isPending && <EstadoCarga texto="Cargando el mes…" />}
      {isError && (
        <EstadoError
          mensaje="No pudimos cargar el calendario."
          onReintentar={() => void refetch()}
        />
      )}
      {data && porDia && sinFiltros && (
        <>
          <BannerFidel ideas={data.ideas} onVer={(id) => ir({ item: id })} />
          {data.publicadas.length + data.ideas.length === 0 && (
            <p className="rounded-lg border border-dashed border-line px-4 py-3 text-sm text-muted">
              Este mes todavía no tiene publicaciones ni ideas.
            </p>
          )}
          <Grilla
            mes={mes}
            hoy={hoy}
            seleccionado={mostrarAgenda ? diaAgenda : null}
            porDia={porDia}
            escritorio={escritorio}
            onDia={elegirDia}
            onMas={(dia) => ir({ dia })}
            onItem={abrir}
          />
          {mostrarAgenda && (
            <Agenda
              dia={diaAgenda}
              hoy={hoy}
              items={porDia.get(diaAgenda) ?? []}
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
