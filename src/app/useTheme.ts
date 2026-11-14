import { useCallback, useEffect, useState } from 'react'

export type Tema = 'light' | 'dark'
const CLAVE = 'se-theme'

function leer(): Tema | null {
  try {
    const v = localStorage.getItem(CLAVE)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

function sistema(): Tema {
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

/** Sin elección del usuario sigue al sistema; al elegir, se fija con data-theme y se recuerda. */
export function useTheme() {
  const [elegido, setElegido] = useState<Tema | null>(leer)
  const [delSistema, setDelSistema] = useState<Tema>(sistema)

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: light)')
    if (!mq) return
    const fn = () => setDelSistema(mq.matches ? 'light' : 'dark')
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])

  useEffect(() => {
    if (elegido) document.documentElement.dataset.theme = elegido
    else delete document.documentElement.dataset.theme
  }, [elegido])

  const actual: Tema = elegido ?? delSistema
  const alternar = useCallback(() => {
    const nuevo: Tema = actual === 'dark' ? 'light' : 'dark'
    setElegido(nuevo)
    try {
      localStorage.setItem(CLAVE, nuevo)
    } catch {
      /* sin almacenamiento: queda solo para esta sesión */
    }
  }, [actual])

  return { tema: actual, alternar }
}
