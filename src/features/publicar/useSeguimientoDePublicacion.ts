import { useQueries, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { estaPendiente, hayPendientes, proximoDespertar, refresco } from '@/api/pendientes'
import { invalidarPublicacion, programadaQuery, usePublicacionDisponible } from '@/api/publicacion'
import type { CalendarioMes, Programada } from '@/domain/types'
import {
  dejarDeSeguir,
  detectarAvisos,
  guardarVistas,
  idsSeguidos,
  leerVistas,
  mostrarAvisos,
  suscribirSeguidas,
} from './avisos'

/** Un `setTimeout` no admite más que esto. */
const MAX_TIMER_MS = 2 ** 31 - 1

/**
 * Seguimiento de las piezas del mes visible: refresca el calendario mientras haya algo por resolverse
 * y avisa cuando una pieza se publicó o falló. Se monta una sola vez, en el calendario.
 *
 * - **Refresco:** cada `refresco.intervaloMs` (10 s) y al volver a la pestaña, solo si hay piezas
 *   publicándose, en «Confirmando…» o programadas para dentro de 10 minutos o menos (o ya vencidas).
 *   Sin pendientes no hay pedidos; con la pestaña oculta tampoco.
 * - **Bandera:** con publicar apagado en el front (o en el backend, 404) no hace nada.
 */
export function useSeguimientoDePublicacion({
  datos,
  abrir,
}: {
  datos: CalendarioMes | undefined
  /** Abre el detalle de la pieza (el botón «Ver» del aviso). */
  abrir: (pieza: Programada) => void
}): void {
  const { disponible } = usePublicacionDisponible()
  const queryClient = useQueryClient()
  const [ahora, setAhora] = useState(() => Date.now())
  // Las piezas recién guardadas se siguen por id aunque no estén en el mes que se ve.
  const seguidas = useSyncExternalStore(suscribirSeguidas, idsSeguidos)
  const delMes = useMemo(() => (disponible ? (datos?.programadas ?? []) : []), [disponible, datos])
  const aparte = useQueries({
    queries: seguidas
      .filter((id) => !delMes.some((p) => p.id === id))
      .map((id) => ({ ...programadaQuery(id), enabled: disponible })),
  })
  const sueltas = aparte.flatMap((q) => (q.data ? [q.data] : []))
  const piezas = useMemo(
    () => (sueltas.length ? [...delMes, ...sueltas] : delMes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [delMes, JSON.stringify(sueltas.map((p) => [p.id, p.estado, p.error]))],
  )
  const pendiente = hayPendientes(piezas, ahora)
  const despertar = proximoDespertar(piezas, ahora)

  const abrirEstable = useRef(abrir)
  useEffect(() => {
    abrirEstable.current = abrir
  })

  // Una programada que todavía está lejos pasa a pendiente sola cuando se acerca su hora.
  useEffect(() => {
    if (despertar === null) return
    const espera = Math.min(Math.max(despertar - Date.now(), 0) + 50, MAX_TIMER_MS)
    const t = setTimeout(() => setAhora(Date.now()), espera)
    return () => clearTimeout(t)
  }, [despertar])

  useEffect(() => {
    if (!pendiente) return
    const refrescar = () => {
      if (document.visibilityState !== 'visible') return
      setAhora(Date.now())
      void invalidarPublicacion(queryClient)
    }
    const id = setInterval(refrescar, refresco.intervaloMs)
    document.addEventListener('visibilitychange', refrescar)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', refrescar)
    }
  }, [pendiente, queryClient])

  // Avisos: se comparan las piezas con lo último visto y se guarda de inmediato, así un segundo
  // montaje (StrictMode, otra pestaña de la misma sesión) no repite nada.
  useEffect(() => {
    if (!disponible || !datos) return
    const { avisos, vistas } = detectarAvisos(leerVistas(), piezas)
    guardarVistas(vistas)
    if (avisos.length) mostrarAvisos(avisos, (p) => abrirEstable.current(p))
    // Lo que ya se resolvió deja de seguirse.
    dejarDeSeguir(
      piezas
        .filter((p) => seguidas.includes(p.id) && !estaPendiente(p, Date.now()))
        .map((p) => p.id),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos, disponible, piezas])
}
