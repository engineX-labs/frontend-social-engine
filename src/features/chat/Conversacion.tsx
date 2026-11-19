import { ArrowDown } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { EstadoError } from '@/components/estados'
import { Bienvenida } from './Bienvenida'
import { Composer } from './Composer'
import { ContextoChip } from './ContextoChip'
import { Mensaje } from './Mensaje'
import { useFidel } from './contexto'

/** A menos de esto del final se considera que el usuario está abajo. */
const CERCA_PX = 80

/** La conversación con Fidel. Llena el contenedor (barra lateral u hoja): lista con scroll y composer abajo. */
export function Conversacion() {
  const { chat, sobre, quitarSobre } = useFidel()
  const { mensajes, estado, ocupado, enviar, detener, reintentar } = chat
  const ultimo = mensajes.at(-1)
  const fallo = ultimo?.rol === 'fidel' && ultimo.estado === 'error' ? ultimo : null

  // Seguir al último mensaje solo si el usuario está al final; si subió a leer, no se lo pelea.
  const lista = useRef<HTMLDivElement>(null)
  const contenido = useRef<HTMLDivElement>(null)
  const pie = useRef<HTMLDivElement>(null)
  const pegado = useRef(true)
  const [lejos, setLejos] = useState(false)
  const alFondo = useCallback(() => {
    const el = lista.current
    if (el) el.scrollTop = el.scrollHeight
    pegado.current = true
    setLejos(false)
  }, [])
  function alScrollear() {
    const el = lista.current
    if (!el) return
    const cerca = el.scrollHeight - el.scrollTop - el.clientHeight < CERCA_PX
    pegado.current = cerca
    setLejos(!cerca)
  }
  useEffect(() => {
    if (pegado.current) alFondo()
  }, [mensajes, estado, alFondo])
  // También cuando cambia el alto sin que cambien los mensajes: el campo crece al escribir,
  // llega una tarjeta, gira el teléfono.
  useEffect(() => {
    if (typeof ResizeObserver !== 'function') return
    const ro = new ResizeObserver(() => {
      const el = lista.current
      if (el && pegado.current) el.scrollTop = el.scrollHeight
    })
    for (const el of [contenido.current, pie.current]) if (el) ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const alEnviar = useCallback(
    (texto: string) => {
      pegado.current = true
      return enviar(texto)
    },
    [enviar],
  )
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={lista}
        onScroll={alScrollear}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4"
      >
        <div
          ref={contenido}
          role="log"
          aria-live="polite"
          aria-busy={ocupado}
          aria-label="Conversación con Fidel"
          tabIndex={0}
          className="w-full flex-1 rounded-md pt-4 pb-6 -outline-offset-2"
        >
          {mensajes.length === 0 ? (
            <Bienvenida onElegir={alEnviar} />
          ) : (
            <div className="space-y-6">
              {mensajes.map((m) => (
                <Mensaje key={m.id} m={m} />
              ))}
              {fallo && (
                <div className="pl-10">
                  <EstadoError
                    mensaje={fallo.error ?? 'No pudimos hablar con Fidel.'}
                    onReintentar={reintentar}
                  />
                </div>
              )}
            </div>
          )}
        </div>
        {/* El composer queda pegado abajo dentro del scroll: la conversación pasa por debajo. */}
        <div ref={pie} className="sticky bottom-0 z-10 w-full pb-3">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-(--fondo-chat,var(--surface)) from-50% to-transparent"
          />
          <AnimatePresence>
            {lejos && (
              <motion.button
                type="button"
                onClick={alFondo}
                aria-label="Ir al final"
                initial={{ opacity: 0, y: 8, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.9 }}
                transition={{ duration: 0.18, ease: [0.2, 0.7, 0.2, 1] }}
                className="absolute bottom-full left-1/2 mb-3 -ml-[18px] grid size-9 place-items-center rounded-full border border-glass-line bg-glass text-ink shadow-pop backdrop-blur-xl before:absolute before:-inset-1.5 hover:border-line-strong"
              >
                <ArrowDown className="size-4" aria-hidden="true" />
              </motion.button>
            )}
          </AnimatePresence>
          <div className="relative">
            <Composer
              ocupado={ocupado}
              onEnviar={alEnviar}
              onDetener={detener}
              contexto={sobre && <ContextoChip itemId={sobre} onQuitar={quitarSobre} />}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
