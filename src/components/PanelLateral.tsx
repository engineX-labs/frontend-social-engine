import { X } from 'lucide-react'
import { motion, useDragControls, type PanInfo } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { Boton } from '@/components/ui/Boton'
import { atraparTab } from '@/lib/foco'
import { useMedia } from '@/lib/useMedia'

/** Spring del panel: entra con un leve asentamiento, sin rebote visible. */
const RESORTE = { type: 'spring', stiffness: 420, damping: 40, mass: 0.9 } as const
/** La salida es más corta que la entrada: cerrar no se hace esperar. */
const SALIDA = { duration: 0.2, ease: [0.4, 0, 1, 1] } as const

interface Props {
  /** Id del título, para `aria-labelledby`. */
  idTitulo: string
  titulo: ReactNode
  /** Lo que va sobre el título (una etiqueta, el estado). */
  encima?: ReactNode
  etiquetaCerrar: string
  /** Escape, el scrim, la manija y la X llaman a esto: quien lo recibe puede pedir confirmación. */
  onCerrar: () => void
  /** Barra inferior fija (las acciones). */
  pie?: ReactNode
  children: ReactNode
}

/**
 * Panel lateral (≥820px) o bottom sheet (móvil) con el mismo comportamiento que el detalle: foco al
 * abrir y devuelto al cerrar, Escape, trampa de foco cuando es modal y arrastre para cerrar en móvil.
 * Va dentro de un `AnimatePresence` de quien lo usa.
 */
export function PanelLateral({
  idTitulo,
  titulo,
  encima,
  etiquetaCerrar,
  onCerrar,
  pie,
  children,
}: Props) {
  // Con scrim (<1440px) el panel es modal; en escritorio ancho convive con la grilla.
  const modal = !useMedia('(min-width: 1440px)', false)
  const lateral = useMedia('(min-width: 820px)', false)
  const arrastre = useDragControls()
  const cerrarRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const cerrarEstable = useRef(onCerrar)
  useEffect(() => {
    cerrarEstable.current = onCerrar
  })

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    cerrarRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      // Un diálogo de confirmación encima maneja su propio Escape.
      if (e.defaultPrevented) return
      if (e.key === 'Escape') cerrarEstable.current()
      if (!window.matchMedia?.('(min-width: 1440px)').matches) atraparTab(e, panelRef.current)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (opener?.isConnected) opener.focus()
    }
  }, [])

  // Bottom sheet: se cierra al soltarlo con un tirón o pasada la cuarta parte de su alto.
  const alSoltar = (_: unknown, info: PanInfo) => {
    const alto = panelRef.current?.offsetHeight ?? 600
    if (info.offset.y > alto * 0.25 || info.velocity.y > 600) onCerrar()
  }

  const fuera = lateral ? { x: '100%' } : { y: '100%' }

  return (
    <>
      <motion.div
        aria-hidden="true"
        onClick={onCerrar}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: SALIDA }}
        transition={{ duration: 0.24 }}
        className="fixed inset-0 z-40 bg-scrim min-[1440px]:hidden"
      />
      <motion.aside
        ref={panelRef}
        role="dialog"
        aria-modal={modal}
        aria-labelledby={idTitulo}
        initial={fuera}
        animate={{ x: 0, y: 0 }}
        exit={{ ...fuera, transition: SALIDA }}
        transition={RESORTE}
        drag={lateral ? false : 'y'}
        dragControls={arrastre}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.04, bottom: 0.9 }}
        onDragEnd={alSoltar}
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-2xl border-t border-glass-line bg-surface shadow-pop min-[820px]:inset-x-auto min-[820px]:inset-y-0 min-[820px]:right-0 min-[820px]:max-h-none min-[820px]:w-[min(440px,100%)] min-[820px]:rounded-none min-[820px]:border-l min-[820px]:border-t-0 min-[820px]:border-line min-[820px]:pt-[env(safe-area-inset-top)]"
      >
        {/* Manija: zona de arrastre del bottom sheet. Con teclado se cierra con Escape o el botón. */}
        <div
          aria-hidden="true"
          onPointerDown={(e) => arrastre.start(e)}
          className="flex h-6 shrink-0 cursor-grab touch-none items-end justify-center active:cursor-grabbing min-[820px]:hidden"
        >
          <span className="h-1 w-10 rounded-full bg-line-strong/70" />
        </div>

        <header
          onPointerDown={(e) => {
            if (!lateral && !(e.target as HTMLElement).closest('button')) arrastre.start(e)
          }}
          className="flex items-start gap-3 px-5 pb-4 pt-2 min-[820px]:pt-5"
        >
          <div className="min-w-0 flex-1 space-y-2.5">
            {encima}
            <h2
              id={idTitulo}
              className="text-xl font-extrabold leading-tight tracking-[-0.02em] first-letter:uppercase"
            >
              {titulo}
            </h2>
          </div>
          <Boton
            ref={cerrarRef}
            variante="fantasma"
            tamano="icono"
            onClick={onCerrar}
            aria-label={etiquetaCerrar}
            className="-mr-2 -mt-1"
          >
            <X className="size-5" aria-hidden="true" />
          </Boton>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain border-t border-hairline px-5 py-5">
          {children}
        </div>

        {pie && (
          <footer className="border-t border-hairline px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {pie}
          </footer>
        )}
      </motion.aside>
    </>
  )
}
