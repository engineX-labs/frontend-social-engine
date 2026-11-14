/** Contrato de datos del front con la API de social engine (a reemplazar por openapi-typescript). */
export type Formato = 'Reel' | 'Carrusel' | 'Foto'
export type Red = 'instagram'

export interface Publicada {
  tipo: 'publicada'
  id: string
  red: Red
  /** ISO 8601 en UTC. */
  fecha: string
  formato: Formato
  copy: string
  portadaUrl: string | null
  alcance: number
  interacciones: number
  /** Texto que redacta el modelo a partir de métricas ya calculadas. */
  analisis: string
}

export interface Idea {
  tipo: 'idea'
  id: string
  red: Red
  /** Fecha y hora sugeridas, ISO 8601 en UTC. */
  fecha: string
  formato: Formato
  ideaPortada: string
  /** Propuestas de copy de Fidel, de la mejor a la menos buena. */
  copyPropuestas: string[]
  porQue: string[]
}

export type Item = Publicada | Idea

export interface ResumenMetricas {
  cantidad: number
  medianaAlcance: number
  medianaPorFormato: Partial<Record<Formato, number>>
  /** Hora (0-23, hora de Buenos Aires) de la publicación con más alcance. */
  mejorHora: number
  medianaNoche: number | null
  medianaResto: number | null
  mejorAlcance: number
}

export interface CalendarioMes {
  /** Formato YYYY-MM (hora de Buenos Aires). */
  mes: string
  publicadas: Publicada[]
  ideas: Idea[]
  resumen: ResumenMetricas
}
