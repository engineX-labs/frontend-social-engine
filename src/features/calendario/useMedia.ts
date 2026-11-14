import { useSyncExternalStore } from 'react'

/** Escucha una media query. Sin `matchMedia` (tests, SSR) devuelve `porDefecto`. */
export function useMedia(query: string, porDefecto = true): boolean {
  return useSyncExternalStore(
    (aviso) => {
      if (typeof matchMedia !== 'function') return () => {}
      const m = matchMedia(query)
      m.addEventListener('change', aviso)
      return () => m.removeEventListener('change', aviso)
    },
    () => (typeof matchMedia === 'function' ? matchMedia(query).matches : porDefecto),
    () => porDefecto,
  )
}

/** Escritorio: desde 820px la grilla muestra chips; por debajo, puntos y agenda. */
export const useEsEscritorio = () => useMedia('(min-width: 820px)')
