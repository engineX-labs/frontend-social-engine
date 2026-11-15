import { createContext, useContext } from 'react'
import type { useChat } from './useChat'

/** Límites del ancho de la barra de Fidel en escritorio, en px. */
export const ANCHO_FIDEL = { min: 320, max: 560, defecto: 400 } as const
/** Ancho del riel con la barra plegada, en px. */
export const ANCHO_RIEL = 64

export interface Fidel {
  /** La conversación vive acá: plegar la barra o cerrar la hoja no la borra. */
  chat: ReturnType<typeof useChat>
  /** Publicación o idea sobre la que se pregunta (`?sobre=`). */
  sobre?: string
  quitarSobre: () => void
  /** ≥1024px: barra lateral. Por debajo: botón flotante y hoja. */
  escritorio: boolean
  /** Escritorio: barra abierta (no riel). Móvil: hoja abierta. */
  abierto: boolean
  abrir: () => void
  cerrar: () => void
  ancho: number
  setAncho: (ancho: number) => void
  /** Al tocar una publicación citada: en móvil se cierra la hoja para ver el detalle. */
  alCitar: () => void
}

export const FidelContext = createContext<Fidel | null>(null)

export function useFidel(): Fidel {
  const f = useContext(FidelContext)
  if (!f) throw new Error('useFidel necesita <FidelProvider>')
  return f
}

/** Para piezas del chat que también se pueden montar sueltas. */
export const useFidelOpcional = () => useContext(FidelContext)
