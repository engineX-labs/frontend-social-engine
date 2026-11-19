/** Contrato de `GET/POST/PUT /api/perfil-marca` (camelCase, fechas en UTC). */
export type EstadoPerfil = 'ninguno' | 'generando' | 'listo' | 'error' | 'sin_datos'

export interface FormatoCalculado {
  formato: string
  cantidad: number
  porcentaje: number
}

/** Lo calcula el código del backend (sin modelo): son cifras, no se editan. */
export interface PerfilCalculado {
  publicacionesUsadas: number
  formatos: FormatoCalculado[]
  porSemana: number
  diasHabituales: string[]
  horasHabituales: number[]
  hashtagsTop: string[]
  mejorFormato: string | null
}

/** Lo interpreta el modelo (y el usuario corrige): texto. */
export interface PerfilInterpretado {
  temas: string[]
  tono: string
  estiloVisual: string
  publico: string
}

export interface PerfilMarca {
  estado: EstadoPerfil
  calculado: PerfilCalculado | null
  interpretado: PerfilInterpretado | null
  confirmado: PerfilInterpretado | null
  generadoEn: string | null
  error: string | null
}

export const ETIQUETA_FORMATO: Record<string, string> = {
  foto: 'Fotos',
  fotos: 'Fotos',
  imagen: 'Imágenes',
  carrusel: 'Carruseles',
  reel: 'Reels',
  historia: 'Historias',
  video: 'Videos',
}

export const etiquetaFormato = (f: string) => ETIQUETA_FORMATO[f.toLowerCase()] ?? f
