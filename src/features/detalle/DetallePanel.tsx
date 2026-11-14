import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { MessageCircle, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { calendarioQuery, useItem } from '@/api/calendario'
import { ApiError } from '@/api/http'
import { EstadoCarga, EstadoError } from '@/components/estados'
import { EtiquetaTipo } from '@/components/EtiquetaTipo'
import { conRendimiento } from '@/domain/metrics'
import { diaLargo } from '@/lib/fecha'
import { DetalleIdea } from './DetalleIdea'
import { DetallePublicada } from './DetallePublicada'
import { mesDe } from './formato'

const ruta = getRouteApi('/')

/** Panel de detalle: lateral ≥820px, bottom sheet en móvil. Se abre con `?item=<id>`. */
export function DetallePanel() {
  const { item } = ruta.useSearch()
  return item ? <Panel id={item} /> : null
}

/** Con scrim (<1100px) el panel es modal; en escritorio ancho convive con la grilla. */
function useModal() {
  const [modal, setModal] = useState(() => !window.matchMedia?.('(min-width: 1100px)').matches)
  useEffect(() => {
    const mq = window.matchMedia?.('(min-width: 1100px)')
    if (!mq) return
    const fn = () => setModal(!mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return modal
}

function Panel({ id }: { id: string }) {
  const navigate = ruta.useNavigate()
  const modal = useModal()
  const cerrarRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)
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

  // Foco al abrir y devolución al cerrar; Escape; animación de entrada.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    cerrarRef.current?.focus()
    const raf = requestAnimationFrame(() => setVisible(true))
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrarEstable.current()
      // Con scrim (<1100px) el panel es modal: Tab no sale de él.
      if (e.key !== 'Tab' || window.matchMedia?.('(min-width: 1100px)').matches) return
      const panel = panelRef.current
      if (!panel) return
      const foco = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement)
      const primero = foco[0]
      const ultimo = foco[foco.length - 1]
      if (!primero || !ultimo) return
      const activo = document.activeElement
      if (!panel.contains(activo)) {
        e.preventDefault()
        primero.focus()
      } else if (e.shiftKey && activo === primero) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && activo === ultimo) {
        e.preventDefault()
        primero.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
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

  return (
    <>
      <div
        aria-hidden="true"
        onClick={cerrar}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-[220ms] motion-reduce:transition-none min-[1100px]:hidden ${visible ? 'opacity-100' : 'opacity-0'}`}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal={modal}
        aria-labelledby="detalle-titulo"
        className={`fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-xl border-t border-line bg-surface shadow-card transition-transform duration-[220ms] ease-[var(--ease)] motion-reduce:transition-none min-[820px]:inset-x-auto min-[820px]:inset-y-0 min-[820px]:right-0 min-[820px]:max-h-none min-[820px]:w-[min(440px,100%)] min-[820px]:rounded-none min-[820px]:border-l min-[820px]:border-t-0 min-[820px]:pt-[env(safe-area-inset-top)] ${visible ? 'translate-y-0 min-[820px]:translate-x-0' : 'translate-y-full min-[820px]:translate-x-full min-[820px]:translate-y-0'}`}
      >
        <header className="flex items-start gap-3 border-b border-line p-4">
          <div className="min-w-0 flex-1 space-y-2">
            {item && <EtiquetaTipo tipo={item.tipo} />}
            <h2 id="detalle-titulo" className="text-lg font-extrabold leading-tight tracking-tight">
              {titulo}
            </h2>
          </div>
          <button
            ref={cerrarRef}
            type="button"
            onClick={cerrar}
            aria-label="Cerrar detalle"
            className="grid size-10 shrink-0 place-items-center rounded-md border border-line bg-raised hover:border-line-strong"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4">
          {!item && itemQ.isPending ? (
            <EstadoCarga texto="Cargando el detalle…" />
          ) : !item ? (
            <EstadoError
              mensaje={
                itemQ.error instanceof ApiError && itemQ.error.status === 404
                  ? 'No encontramos este elemento. Puede que ya no exista.'
                  : 'No pudimos cargar el detalle.'
              }
              onReintentar={() => void itemQ.refetch()}
            />
          ) : item.tipo === 'publicada' ? (
            <DetallePublicada
              pub={item}
              rendimiento={rendimiento}
              resumen={calQ.data?.resumen ?? null}
            />
          ) : (
            <DetalleIdea key={item.id} idea={item} />
          )}
        </div>

        {item && (
          <footer className="border-t border-line p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Link
              to="/chat"
              search={{ item: item.id }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-bold text-on-accent hover:bg-accent-hover"
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              Preguntarle a Fidel
            </Link>
          </footer>
        )}
      </aside>
    </>
  )
}
