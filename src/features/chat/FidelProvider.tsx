import { getRouteApi, useRouterState } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { CalendarioSearch } from '@/app/search'
import { useMedia } from '@/lib/useMedia'
import { ANCHO_FIDEL, FidelContext, type Fidel } from './contexto'
import { useChat } from './useChat'

const ruta = getRouteApi('/')

const CLAVE_ABIERTO = 'fidel:abierto'
const CLAVE_ANCHO = 'fidel:ancho'

/** Preferencias de este navegador. Sin almacenamiento (modo privado, bloqueado) se usan los valores por defecto. */
function leer(clave: string): string | null {
  try {
    return localStorage.getItem(clave)
  } catch {
    return null
  }
}
function guardar(clave: string, valor: string) {
  try {
    localStorage.setItem(clave, valor)
  } catch {
    // Sin almacenamiento: la preferencia dura lo que la pestaña.
  }
}

const limitar = (n: number) => Math.round(Math.min(ANCHO_FIDEL.max, Math.max(ANCHO_FIDEL.min, n)))

export function FidelProvider({ children }: { children: ReactNode }) {
  const escritorio = useMedia('(min-width: 1024px)', true)
  const navigate = ruta.useNavigate()
  const sobre = useRouterState({
    select: (s) =>
      s.location.pathname === '/' ? (s.location.search as CalendarioSearch).sobre : undefined,
  })
  const pedido = useRouterState({
    select: (s) =>
      s.location.pathname === '/' ? (s.location.search as CalendarioSearch).fidel : undefined,
  })

  const chat = useChat({ itemId: sobre })
  // En escritorio la barra arranca abierta la primera vez: Fidel es lo que se viene a ver.
  const [fija, setFija] = useState(() => leer(CLAVE_ABIERTO) !== '0')
  const [hoja, setHoja] = useState(false)
  const [ancho, setAnchoCrudo] = useState(() => {
    const guardado = Number(leer(CLAVE_ANCHO))
    return guardado ? limitar(guardado) : ANCHO_FIDEL.defecto
  })

  useEffect(() => guardar(CLAVE_ABIERTO, fija ? '1' : '0'), [fija])
  useEffect(() => guardar(CLAVE_ANCHO, String(ancho)), [ancho])

  const abrir = useCallback(() => (escritorio ? setFija(true) : setHoja(true)), [escritorio])
  const cerrar = useCallback(() => (escritorio ? setFija(false) : setHoja(false)), [escritorio])
  const setAncho = useCallback((n: number) => setAnchoCrudo(limitar(n)), [])
  const alCitar = useCallback(() => {
    if (!escritorio) setHoja(false)
  }, [escritorio])
  const quitarSobre = useCallback(
    () =>
      void navigate({
        search: (prev) => ({ ...prev, sobre: undefined }),
        replace: true,
        resetScroll: false,
      }),
    [navigate],
  )

  // `?fidel=abierto` (desde "Preguntarle a Fidel", "Hablar con Fidel" o un enlace viejo a /chat)
  // abre a Fidel. Se ajusta en el render, al llegar el pedido; después se quita de la URL.
  const [pedidoVisto, setPedidoVisto] = useState<typeof pedido>(undefined)
  if (pedido !== pedidoVisto) {
    setPedidoVisto(pedido)
    if (pedido === 'abierto') {
      if (escritorio) setFija(true)
      else setHoja(true)
    }
  }
  useEffect(() => {
    if (pedido !== 'abierto') return
    // En escritorio, listo para escribir. En el celular no: abriría el teclado encima de todo.
    if (escritorio)
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('[aria-label="Fidel"] textarea')?.focus(),
      )
    void navigate({
      search: (prev) => ({ ...prev, fidel: undefined }),
      replace: true,
      resetScroll: false,
    })
  }, [pedido, navigate, escritorio])

  // Atajo: Ctrl/⌘ + . abre o pliega a Fidel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '.' || !(e.metaKey || e.ctrlKey)) return
      e.preventDefault()
      if (escritorio) setFija((x) => !x)
      else setHoja((x) => !x)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [escritorio])

  const valor = useMemo<Fidel>(
    () => ({
      chat,
      sobre,
      quitarSobre,
      escritorio,
      abierto: escritorio ? fija : hoja,
      abrir,
      cerrar,
      ancho,
      setAncho,
      alCitar,
    }),
    [chat, sobre, quitarSobre, escritorio, fija, hoja, abrir, cerrar, ancho, setAncho, alCitar],
  )
  return <FidelContext value={valor}>{children}</FidelContext>
}
