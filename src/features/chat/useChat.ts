import { useCallback, useEffect, useRef, useState } from 'react'
import { streamChat } from './api'
import type { MensajeApi, MensajeChat } from './tipos'

/** `esperando`: pidió y todavía no llegó texto. `respondiendo`: llegan deltas. */
export type EstadoChat = 'reposo' | 'esperando' | 'respondiendo'

let contador = 0
const nuevoId = () => `m${++contador}`

function aPeticion(historial: MensajeChat[]): { mensajes: MensajeApi[]; itemId?: string } {
  const mensajes = historial
    .filter(
      (m) => m.texto && (m.rol === 'usuario' || m.estado === 'listo' || m.estado === 'detenido'),
    )
    .map((m) => ({ rol: m.rol, texto: m.texto }))
  const ultimoUsuario = [...historial].reverse().find((m) => m.rol === 'usuario')
  return { mensajes, itemId: ultimoUsuario?.itemId }
}

export function useChat({ itemId }: { itemId?: string } = {}) {
  const [mensajes, setMensajes] = useState<MensajeChat[]>([])
  const [estado, setEstado] = useState<EstadoChat>('reposo')
  const refMensajes = useRef<MensajeChat[]>([])
  const refAbort = useRef<AbortController | null>(null)
  const refItem = useRef(itemId)
  useEffect(() => {
    refItem.current = itemId
  }, [itemId])

  const aplicar = useCallback((fn: (prev: MensajeChat[]) => MensajeChat[]) => {
    refMensajes.current = fn(refMensajes.current)
    setMensajes(refMensajes.current)
  }, [])

  const responder = useCallback(
    async (historial: MensajeChat[]) => {
      const idFidel = nuevoId()
      const control = new AbortController()
      refAbort.current = control
      const parche = (p: Partial<MensajeChat>) =>
        aplicar((prev) => prev.map((m) => (m.id === idFidel ? { ...m, ...p } : m)))

      aplicar(() => [...historial, { id: idFidel, rol: 'fidel', texto: '', estado: 'streaming' }])
      setEstado('esperando')
      try {
        for await (const delta of streamChat(aPeticion(historial), control.signal)) {
          setEstado('respondiendo')
          aplicar((prev) =>
            prev.map((m) => (m.id === idFidel ? { ...m, texto: m.texto + delta } : m)),
          )
        }
        parche({ estado: 'listo' })
      } catch (e) {
        if (control.signal.aborted) parche({ estado: 'detenido' })
        else
          parche({
            estado: 'error',
            error: e instanceof Error ? e.message : 'No pudimos hablar con Fidel.',
          })
      } finally {
        if (refAbort.current === control) refAbort.current = null
        setEstado('reposo')
      }
    },
    [aplicar],
  )

  const enviar = useCallback(
    (texto: string) => {
      const limpio = texto.trim()
      if (!limpio || refAbort.current) return false
      const usuario: MensajeChat = {
        id: nuevoId(),
        rol: 'usuario',
        texto: limpio,
        estado: 'listo',
        itemId: refItem.current,
      }
      void responder([...refMensajes.current, usuario])
      return true
    },
    [responder],
  )

  const detener = useCallback(() => refAbort.current?.abort(), [])

  /** Descarta la respuesta fallida y vuelve a preguntar lo mismo. */
  const reintentar = useCallback(() => {
    if (refAbort.current) return
    const ultimo = refMensajes.current.at(-1)
    if (ultimo?.rol !== 'fidel' || ultimo.estado !== 'error') return
    void responder(refMensajes.current.slice(0, -1))
  }, [responder])

  useEffect(() => () => refAbort.current?.abort(), [])

  return { mensajes, estado, ocupado: estado !== 'reposo', enviar, detener, reintentar }
}
