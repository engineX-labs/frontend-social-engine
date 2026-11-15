import { X } from 'lucide-react'
import { AnimatePresence, motion, useDragControls, type PanInfo } from 'motion/react'
import { useEffect, useRef } from 'react'
import { AvatarFidel } from '@/components/ui/AvatarFidel'
import { Boton } from '@/components/ui/Boton'
import { atraparTab } from '@/lib/foco'
import { useFidel } from './contexto'
import { Conversacion } from './Conversacion'

const RESORTE = { type: 'spring', stiffness: 420, damping: 40, mass: 0.9 } as const
const SALIDA = { duration: 0.2, ease: [0.4, 0, 1, 1] } as const

/** Fidel en el celular: botón flotante que abre el chat como hoja desde abajo. */
export function HojaFidel() {
  const { abierto, abrir, chat } = useFidel()
  return (
    <>
      <AnimatePresence>
        {!abierto && (
          <motion.button
            type="button"
            onClick={abrir}
            aria-label="Hablar con Fidel"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            whileTap={{ scale: 0.92 }}
            className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 grid size-14 place-items-center rounded-full shadow-pop"
          >
            <AvatarFidel tamano="lg" pensando={chat.ocupado} />
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>{abierto && <Hoja key="hoja-fidel" />}</AnimatePresence>
    </>
  )
}

function Hoja() {
  const { cerrar, chat } = useFidel()
  const arrastre = useDragControls()
  const hojaRef = useRef<HTMLDivElement>(null)
  const cerrarRef = useRef<HTMLButtonElement>(null)
  const cerrarEstable = useRef(cerrar)
  useEffect(() => {
    cerrarEstable.current = cerrar
  })

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    cerrarRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrarEstable.current()
      atraparTab(e, hojaRef.current)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (opener?.isConnected) opener.focus()
    }
  }, [])

  const alSoltar = (_: unknown, info: PanInfo) => {
    const alto = hojaRef.current?.offsetHeight ?? 600
    if (info.offset.y > alto * 0.25 || info.velocity.y > 600) cerrar()
  }

  return (
    <>
      <motion.div
        aria-hidden="true"
        onClick={cerrar}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: SALIDA }}
        className="fixed inset-0 z-[55] bg-scrim"
      />
      <motion.div
        ref={hojaRef}
        role="dialog"
        aria-modal="true"
        aria-label="Chat con Fidel"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%', transition: SALIDA }}
        transition={RESORTE}
        drag="y"
        dragControls={arrastre}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.04, bottom: 0.9 }}
        onDragEnd={alSoltar}
        className="fixed inset-x-0 bottom-0 z-[60] flex h-[92dvh] flex-col rounded-t-2xl border-t border-glass-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-pop"
      >
        <div
          onPointerDown={(e) => {
            if (!(e.target as HTMLElement).closest('button')) arrastre.start(e)
          }}
          className="shrink-0 touch-none"
        >
          <div aria-hidden="true" className="flex h-6 items-end justify-center">
            <span className="h-1 w-10 rounded-full bg-line-strong/70" />
          </div>
          <header className="flex items-center gap-3 border-b border-hairline px-4 pt-1 pb-3">
            <AvatarFidel tamano="sm" pensando={chat.ocupado} />
            <h2 className="flex-1 text-base font-bold">Fidel</h2>
            <Boton
              ref={cerrarRef}
              variante="fantasma"
              tamano="icono"
              onClick={cerrar}
              aria-label="Cerrar el chat"
              className="-mr-2"
            >
              <X className="size-5" aria-hidden="true" />
            </Boton>
          </header>
        </div>
        <Conversacion />
      </motion.div>
    </>
  )
}
