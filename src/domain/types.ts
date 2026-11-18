/** Contrato de datos del front con la API de social engine (a reemplazar por openapi-typescript). */
/**
 * Formato de una publicación ya publicada. «Video» es de TikTok e «Historia» de Instagram: no se
 * comparan con los Reels (R6). El backend los empieza a mandar con «Backend · Formato correcto en el
 * calendario»; hasta entonces las Stories y los videos de TikTok llegan en `programadas`.
 */
export type Formato = 'Reel' | 'Carrusel' | 'Foto' | 'Video' | 'Historia'
/** Los formatos que Fidel sugiere en una idea. */
export type FormatoIdea = 'Reel' | 'Carrusel' | 'Foto'
export type Red = 'instagram' | 'tiktok'

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
  formato: FormatoIdea
  ideaPortada: string
  /** Propuestas de copy de Fidel, de la mejor a la menos buena. */
  copyPropuestas: string[]
  porQue: string[]
}

export type Item = Publicada | Idea

/** Tipo de pieza que se publica o programa. En Instagram: foto, carrusel, reel, historia; en TikTok: video, fotos. */
export type TipoPieza = 'foto' | 'carrusel' | 'reel' | 'historia' | 'video' | 'fotos'
export type EstadoProgramada =
  'borrador' | 'programada' | 'publicando' | 'publicada' | 'fallida' | 'cancelada'

export interface Medio {
  /** `https`, con el prefijo de la `publicUrl` que devuelve `POST /api/medios`. */
  url: string
  tipo: 'imagen' | 'video'
}

/** Opciones de TikTok, en camelCase (el backend las pasa a Zernio). */
export interface OpcionesTikTok {
  privacyLevel?: string
  allowComment?: boolean
  allowDuet?: boolean
  allowStitch?: boolean
  contentPreviewConfirmed?: boolean
  expressConsentGiven?: boolean
  commercialContentType?: string
  videoCoverTimestampMs?: number
}

/** Pieza que el comercio guardó, programó o publicó desde la app. */
export interface Programada {
  tipo: 'programada'
  id: string
  red: Red
  redId: string
  estado: EstadoProgramada
  formato: TipoPieza
  texto: string | null
  medios: Medio[]
  /** ISO 8601 en UTC; `null` en un borrador sin fecha. */
  fecha: string | null
  /**
   * `estado_desconocido` = «Confirmando…» (no es un fallo, se resuelve solo); `No se publicó` = final;
   * cualquier otro texto es el motivo del fallo.
   */
  error: string | null
  urlPublicada: string | null
  /** Id de la publicación (con métricas) cuando ya se enlazó. */
  itemId: string | null
}

export interface RedConectada {
  id: string
  red: Red
  username: string
  /** Salud de la conexión; `null` si todavía no se midió. */
  salud: string | null
}

export interface OpcionesTikTokRed {
  privacidades: string[]
  duracionMaximaSegundos: number | null
  puedePublicarMas: boolean | null
  comentariosDeshabilitados: boolean | null
  duetDeshabilitado: boolean | null
  stitchDeshabilitado: boolean | null
}

export interface SubidaMedio {
  uploadUrl: string
  publicUrl: string
}

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
  /** Piezas guardadas desde la app. Con la publicación apagada en el backend no llega o llega vacío. */
  programadas?: Programada[]
  ideas: Idea[]
  resumen: ResumenMetricas
}
