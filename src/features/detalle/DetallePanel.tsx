import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { X } from 'lucide-react'
import { AnimatePresence, motion, useDragControls, type PanInfo } from 'motion/react'
import { useEffect, useMemo, useRef } from 'react'
import { calendarioQuery, useItem } from '@/api/calendario'
import { esErrorDeAcceso, mensajeDeApi } from '@/api/errores'
import { ApiError } from '@/api/http'
import { EstadoError } from '@/components/estados'
import { EtiquetaTipo } from '@/components/EtiquetaTipo'
import { AvatarFidel } from '@/components/ui/AvatarFidel'
import { Boton } from '@/components/ui/Boton'
import { Esqueleto } from '@/components/ui/Esqueleto'
import { conRendimiento } from '@/domain/metrics'
import { diaLargo } from '@/lib/fecha'
import { atraparTab } from '@/lib/foco'
import { useMedia } from '@/lib/useMedia'
import { DetalleIdea } from './DetalleIdea'
import { DetallePublicada } from './DetallePublicada'
import { mesDe } from './formato'

const ruta = getRouteApi('/')

/** Spring del panel: entra con un leve asentamiento, sin rebote visible. */
const RESORTE = { type: 'spring', stiffness: 420, damping: 40, mass: 0.9 } as const
/** La salida es más corta que la entrada: cerrar no se hace esperar. */
const SALIDA = { duration: 0.2, ease: [0.4, 0, 1, 1] } as const

/** Panel de detalle: lateral ≥820px, bottom sheet en móvil. Se abre con `?item=<id>`. */
export function DetallePanel() {
  const { item } = ruta.useSearch()
  return <AnimatePresence>{item ? <Panel key="detalle" id={item} /> : null}</AnimatePresence>
}

function Panel({ id }: { id: string }) {
  const navigate = ruta.useNavigate()
  // Con scrim (<1440px) el panel es modal; en escritorio ancho convive con la grilla.
  const modal = !useMedia('(min-width: 1440px)', false)
  const lateral = useMedia('(min-width: 820px)', false)
  const arrastre = useDragControls()
  const cerrarRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const itemQ = useItem(id)
  const item = itemQ.data

  // Solo las publicadas se comparan contra la mediana del mes.
  const mes = item?.tipo === 'publicada' ? mesDe(item.fecha) : ''
  const calQ = useQuery({ ...calendarioQuery(mes), enabled: Boolean(mes) })

  const cerrar = () =>
    void navigate({ search: (prev) => ({ ...prev, item: undefined }), resetScroll: false })
  const cerrarEstable = useRef(cerrar)
  useEffect(() => {
    cerrarEstable.current = cerrar
  })

  // Foco al abrir y devolución al cerrar; Escape; trampa de foco cuando es modal.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    cerrarRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrarEstable.current()
      // Con scrim (<1440px) el panel es modal: Tab no sale de él.
      if (!window.matchMedia?.('(min-width: 1440px)').matches) atraparTab(e, panelRef.current)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (opener?.isConnected) opener.focus()
    }
  }, [])

  const rendimiento = useMemo(() => {
    if (item?.tipo !== 'publicada' || !calQ.data) return null
    const lista = calQ.data.publicadas
    return conRendimiento(lista, calQ.data.resumen).find((p) => p.id === item.id) ?? null
  }, [item, calQ.data])

  const titulo = item
    ? `${item.tipo === 'publicada' ? item.formato : `Idea: ${item.formato}`} · ${diaLargo(item.fecha)}`
    : 'Detalle'

  // Bottom sheet: se cierra al soltarlo con un tirón o pasada la cuarta parte de su alto.
  const alSoltar = (_: unknown, info: PanInfo) => {
    const alto = panelRef.current?.offsetHeight ?? 600
    if (info.offset.y > alto * 0.25 || info.velocity.y > 600) cerrar()
  }

  const fuera = lateral ? { x: '100%' } : { y: '100%' }

  return (
    <>
      <motion.div
        aria-hidden="true"
        onClick={cerrar}
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
        aria-labelledby="detalle-titulo"
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
            {item ? <EtiquetaTipo tipo={item.tipo} /> : <Esqueleto className="h-6 w-24" />}
            <h2
              id="detalle-titulo"
              className="text-xl font-extrabold leading-tight tracking-[-0.02em] first-letter:uppercase"
            >
              {titulo}
            </h2>
          </div>
          <Boton
            ref={cerrarRef}
            variante="fantasma"
            tamano="icono"
            onClick={cerrar}
            aria-label="Cerrar detalle"
            className="-mr-2 -mt-1"
          >
            <X className="size-5" aria-hidden="true" />
          </Boton>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain border-t border-hairline px-5 py-5">
          {!item && itemQ.isPending ? (
            <CargandoDetalle />
          ) : !item ? (
            <EstadoError
              mensaje={
                itemQ.error instanceof ApiError && itemQ.error.status === 404
                  ? 'No encontramos este elemento. Puede que ya no exista.'
                  : mensajeDeApi(itemQ.error, 'No pudimos cargar el detalle.')
              }
              onReintentar={esErrorDeAcceso(itemQ.error) ? undefined : () => void itemQ.refetch()}
            />
          ) : item.tipo === 'publicada' ? (
            <DetallePublicada
              key={item.id}
              pub={item}
              rendimiento={rendimiento}
              resumen={calQ.data?.resumen ?? null}
              totalMes={calQ.data?.publicadas.length ?? 0}
            />
          ) : (
            <DetalleIdea key={item.id} idea={item} />
          )}
        </div>

        {item && (
          <footer className="border-t border-hairline px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Boton
              variante="primario"
              className="w-full"
              onClick={() =>
                void navigate({
                  // Con el detalle como modal, se cierra para que Fidel quede a la vista.
                  search: (prev) => ({
                    ...prev,
                    sobre: item.id,
                    fidel: 'abierto',
                    item: modal ? undefined : item.id,
                  }),
                  resetScroll: false,
                })
              }
            >
              <AvatarFidel tamano="xs" />
              Preguntarle a Fidel
            </Boton>
          </footer>
        )}
      </motion.aside>
    </>
  )
}

function CargandoDetalle() {
  return (
    <div role="status" aria-label="Cargando el detalle" className="space-y-6">
      <div className="flex gap-4">
        <Esqueleto className="aspect-[4/5] w-32 rounded-xl" />
        <div className="flex-1 space-y-3 pt-1">
          <Esqueleto className="h-3 w-16" />
          <Esqueleto className="h-9 w-28" />
          <Esqueleto className="h-6 w-32 rounded-full" />
        </div>
      </div>
      <Esqueleto className="h-16 w-full rounded-xl" />
      <div className="space-y-2">
        <Esqueleto className="h-3 w-full" />
        <Esqueleto className="h-3 w-11/12" />
        <Esqueleto className="h-3 w-2/3" />
      </div>
    </div>
  )
}
