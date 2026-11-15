import { useEffect, useState, type RefObject } from 'react'

/** Ancho de un elemento, al día con ResizeObserver. Sin ResizeObserver (tests) devuelve null. */
export function useAncho(ref: RefObject<HTMLElement | null>): number | null {
  const [ancho, setAncho] = useState<number | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver !== 'function') return
    const ro = new ResizeObserver(([e]) => {
      if (e) setAncho(Math.round(e.contentRect.width))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return ancho
}
