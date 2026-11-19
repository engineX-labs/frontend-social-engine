import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { motion } from 'motion/react'
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { AvatarFidel } from '@/components/ui/AvatarFidel'
import { Boton } from '@/components/ui/Boton'
import { cn } from '@/lib/utils'
import { ANCHO_FIDEL, ANCHO_RIEL, useFidel } from './contexto'
import { Conversacion } from './Conversacion'

const RESORTE = { type: 'spring', stiffness: 420, damping: 42 } as const
const PASO = 16
const ATAJO = navigator.platform?.startsWith('Mac') ? '⌘.' : 'Ctrl+.'

/** Fidel en escritorio: barra lateral izquierda que se pliega a un riel y se ensancha arrastrando el borde. */
export function BarraFidel() {
  const { abierto, abrir, cerrar, ancho, setAncho, chat } = useFidel()
  const [arrastrando, setArrastrando] = useState(false)
  const inicio = useRef({ x: 0, ancho })

  function empezar(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    inicio.current = { x: e.clientX, ancho }
    setArrastrando(true)
    document.body.style.userSelect = 'none'
  }
  function mover(e: PointerEvent<HTMLDivElement>) {
    if (arrastrando) setAncho(inicio.current.ancho + e.clientX - inicio.current.x)
  }
  function soltar() {
    setArrastrando(false)
    document.body.style.userSelect = ''
  }
  function teclas(e: KeyboardEvent<HTMLDivElement>) {
    const nuevo =
      e.key === 'ArrowLeft'
        ? ancho - PASO
        : e.key === 'ArrowRight'
          ? ancho + PASO
          : e.key === 'Home'
            ? ANCHO_FIDEL.min
            : e.key === 'End'
              ? ANCHO_FIDEL.max
              : null
    if (nuevo === null) return
    e.preventDefault()
    setAncho(nuevo)
  }

  return (
    <motion.aside
      aria-label="Fidel"
      initial={false}
      animate={{ width: abierto ? ancho : ANCHO_RIEL }}
      transition={arrastrando ? { duration: 0 } : RESORTE}
      className="sticky top-(--alto-cabecera) z-20 h-[calc(100dvh-var(--alto-cabecera))] shrink-0 border-r border-line bg-raised/50 [--fondo-chat:color-mix(in_oklab,var(--surface-raised)_50%,var(--surface))]"
    >
      <div className="h-full overflow-hidden">
        {abierto ? (
          // Ancho fijo adentro: mientras la barra se anima el contenido no se reacomoda, se recorta.
          <div className="flex h-full flex-col" style={{ width: ancho }}>
            <header className="flex items-center gap-3 border-b border-hairline px-4 py-3">
              <AvatarFidel tamano="sm" pensando={chat.ocupado} />
              <div className="min-w-0 flex-1">
                <h2 className="text-sm leading-tight font-bold">Fidel</h2>
                <p className="truncate text-xs text-muted" aria-live="polite">
                  {chat.estado === 'esperando'
                    ? 'Mirando tus datos…'
                    : chat.estado === 'respondiendo'
                      ? 'Escribiendo…'
                      : 'Tu analista de Instagram'}
                </p>
              </div>
              <Boton
                variante="fantasma"
                tamano="icono-sm"
                onClick={cerrar}
                aria-label="Plegar a Fidel"
                title={`Plegar (${ATAJO})`}
              >
                <PanelLeftClose className="size-4" aria-hidden="true" />
              </Boton>
            </header>
            <Conversacion />
          </div>
        ) : (
          <button
            type="button"
            onClick={abrir}
            aria-label="Abrir a Fidel"
            title={`Abrir a Fidel (${ATAJO})`}
            className="group flex h-full w-full flex-col items-center gap-3 pt-4 text-muted transition-colors duration-(--dur-fast) hover:bg-raised hover:text-ink"
          >
            <AvatarFidel
              tamano="md"
              pensando={chat.ocupado}
              className="transition-transform duration-(--dur-fast) ease-brand group-hover:scale-105"
            />
            <PanelLeftOpen className="size-4" aria-hidden="true" />
            <span className="mt-1 text-xs font-bold tracking-wide [writing-mode:vertical-rl]">
              Fidel
            </span>
          </button>
        )}
      </div>

      {abierto && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Ancho de la barra de Fidel"
          aria-valuemin={ANCHO_FIDEL.min}
          aria-valuemax={ANCHO_FIDEL.max}
          aria-valuenow={ancho}
          tabIndex={0}
          title="Arrastrá para cambiar el ancho; doble clic lo restablece"
          onPointerDown={empezar}
          onPointerMove={mover}
          onPointerUp={soltar}
          onPointerCancel={soltar}
          onKeyDown={teclas}
          onDoubleClick={() => setAncho(ANCHO_FIDEL.defecto)}
          className="group absolute inset-y-0 -right-1.5 z-10 flex w-3 cursor-col-resize touch-none justify-center outline-none"
        >
          <span
            className={cn(
              'h-full w-0.5 bg-accent opacity-0 transition-opacity duration-(--dur-fast) group-hover:opacity-60 group-focus-visible:opacity-100',
              arrastrando && 'opacity-100',
            )}
          />
        </div>
      )}
    </motion.aside>
  )
}
