import { animate, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

/**
 * Cuenta hasta `valor` (desde 0 al montar, desde el valor anterior cuando cambia).
 * Con "reducir movimiento", o sin `matchMedia` (tests), devuelve el valor final de entrada.
 */
export function useConteo(valor: number): number {
  const reducir = useReducedMotion()
  const sinAnimar = Boolean(reducir) || typeof matchMedia !== 'function'
  const [mostrado, setMostrado] = useState(sinAnimar ? valor : 0)
  const actual = useRef(mostrado)

  useEffect(() => {
    if (sinAnimar) {
      actual.current = valor
      return
    }
    const control = animate(actual.current, valor, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        actual.current = v
        setMostrado(Math.round(v))
      },
    })
    return () => control.stop()
  }, [valor, sinAnimar])

  return sinAnimar ? valor : mostrado
}
