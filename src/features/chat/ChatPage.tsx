import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { ArrowDown } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { EstadoError } from '@/components/estados'
import { Bienvenida } from './Bienvenida'
import { Composer } from './Composer'
import { ContextoChip } from './ContextoChip'
import { Mensaje } from './Mensaje'
import { useChat } from './useChat'

const ruta = getRouteApi('/chat')

/** A menos de esto del final se considera que el usuario está abajo. */
const CERCA_PX = 80

export function ChatPage() {
  const { item } = ruta.useSearch()
  const navegar = useNavigate()
  // El chip se puede quitar; si llega otro `?item=`, vuelve a aparecer.
  const [quitado, setQuitado] = useState<string>()
  const conItem = item !== quitado ? item : undefined

  const { mensajes, estado, ocupado, enviar, detener, reintentar } = useChat({ itemId: conItem })
  const ultimo = mensajes.at(-1)
  const fallo = ultimo?.rol === 'fidel' && ultimo.estado === 'error' ? ultimo : null

  // El chat ocupa justo lo que queda bajo la barra superior. Se mide dónde empieza en vez de
  // confiar en un número: si la barra cambia de alto no aparece un scroll doble.
  const seccion = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const el = seccion.current
    if (!el) return
    const medir = () =>
      el.style.setProperty('--chat-top', `${el.getBoundingClientRect().top + window.scrollY}px`)
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [])

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
  function quitarContexto() {
    setQuitado(item)
    void navegar({ to: '/chat', search: {}, replace: true })
  }

  return (
    <section
      ref={seccion}
      aria-label="Chat con Fidel"
      // Sale del padding del layout: arranca pegado a la barra superior y termina sobre la barra
      // inferior (móvil, ≈64px + safe-area) o al borde de la ventana (escritorio).
      className="-mt-5 -mb-6 flex h-[calc(100dvh-var(--chat-top,57px)-4rem-env(safe-area-inset-bottom))] flex-col md:-mb-12 md:h-[calc(100dvh-var(--chat-top,57px))]"
    >
      <h1 className="sr-only">Fidel</h1>
      <div
        ref={lista}
        onScroll={alScrollear}
        className="-mx-4 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 sm:-mx-6 sm:px-6"
      >
        <div
          ref={contenido}
          role="log"
          aria-live="polite"
          aria-busy={ocupado}
          aria-label="Conversación con Fidel"
          tabIndex={0}
          className="mx-auto w-full max-w-3xl flex-1 rounded-md pt-6 pb-6 -outline-offset-2"
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
        <div ref={pie} className="sticky bottom-0 z-10 mx-auto w-full max-w-3xl pb-2 md:pb-4">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-linear-to-t from-surface from-35% to-transparent md:h-8 md:from-50%"
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
              contexto={conItem && <ContextoChip itemId={conItem} onQuitar={quitarContexto} />}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
