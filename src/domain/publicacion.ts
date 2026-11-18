import type { OpcionesTikTok, Programada, Red, TipoPieza } from './types'

/**
 * Reglas de una pieza antes de publicarla o programarla. Copian las del backend
 * (`app/publicacion/reglas.py`) solo para avisar antes de enviar: la que manda es la del backend,
 * que además devuelve los problemas en un 422.
 */
export const TIPOS_POR_RED: Record<Red, readonly TipoPieza[]> = {
  instagram: ['foto', 'carrusel', 'reel', 'historia'],
  tiktok: ['video', 'fotos'],
}

export const ETIQUETA_TIPO: Record<TipoPieza, string> = {
  foto: 'Foto',
  carrusel: 'Carrusel',
  reel: 'Reel',
  historia: 'Historia',
  video: 'Video',
  fotos: 'Fotos',
}

export const MAX_TEXTO = 2200
export const MAX_DESCRIPCION_FOTOS = 4000
export const MIN_ANTICIPACION_MS = 5 * 60 * 1000
export const MAX_ANTICIPACION_MS = 180 * 24 * 60 * 60 * 1000
export const PRIVACIDAD_PUBLICA = 'PUBLIC_TO_EVERYONE'

export interface MedioPieza {
  tipo: 'imagen' | 'video'
}

export function limiteDeTexto(tipo: TipoPieza): number {
  return tipo === 'fotos' ? MAX_DESCRIPCION_FOTOS : MAX_TEXTO
}

function validarMedios(tipo: TipoPieza, medios: MedioPieza[]): string[] {
  const n = medios.length
  const imagenes = medios.filter((m) => m.tipo === 'imagen').length
  const videos = medios.filter((m) => m.tipo === 'video').length
  if (tipo === 'foto' && !(n === 1 && imagenes === 1)) return ['La foto lleva exactamente 1 imagen']
  if (tipo === 'historia' && n !== 1) return ['La historia lleva exactamente 1 medio']
  if ((tipo === 'reel' || tipo === 'video') && !(n === 1 && videos === 1))
    return [`El ${tipo} lleva exactamente 1 video`]
  if (tipo === 'carrusel' && !(n >= 2 && n <= 20)) return ['El carrusel lleva de 2 a 20 medios']
  if (tipo === 'fotos' && (n < 1 || n > 35 || videos > 0))
    return ['Las fotos de TikTok llevan de 1 a 35 imágenes, sin video']
  return []
}

function validarTikTok(tipo: TipoPieza, opciones: OpcionesTikTok | null | undefined): string[] {
  const op = opciones ?? {}
  const problemas: string[] = []
  if (!op.privacyLevel) problemas.push('Falta elegir la privacidad en TikTok')
  else if (tipo === 'video' && op.privacyLevel !== PRIVACIDAD_PUBLICA)
    problemas.push('Los videos de TikTok tienen que ser públicos')
  if (typeof op.allowComment !== 'boolean')
    problemas.push('Falta indicar si se permiten comentarios')
  if (tipo === 'video') {
    if (typeof op.allowDuet !== 'boolean') problemas.push('Falta indicar si se permiten dúos')
    if (typeof op.allowStitch !== 'boolean') problemas.push('Falta indicar si se permiten stitch')
  }
  if (op.contentPreviewConfirmed !== true)
    problemas.push('Falta confirmar la vista previa del contenido')
  if (op.expressConsentGiven !== true)
    problemas.push('Falta el consentimiento expreso para publicar en TikTok')
  return problemas
}

/** Problemas en castellano; lista vacía = pieza válida. */
export function validarPieza(entrada: {
  red: Red
  tipo: TipoPieza
  texto: string | null | undefined
  medios: MedioPieza[]
  opciones?: OpcionesTikTok | null
}): string[] {
  const { red, tipo, texto, medios, opciones } = entrada
  if (!TIPOS_POR_RED[red].includes(tipo)) return [`El tipo «${tipo}» no existe en ${red}`]
  const problemas = validarMedios(tipo, medios)
  if (tipo === 'historia' && texto) problemas.push('Las historias no llevan texto')
  const limite = limiteDeTexto(tipo)
  if (texto && texto.length > limite) problemas.push(`El texto supera los ${limite} caracteres`)
  if (red === 'tiktok') problemas.push(...validarTikTok(tipo, opciones))
  return problemas
}

/** `null` si la fecha es válida; si no, el problema en castellano. Los dos extremos son válidos. */
export function validarFecha(programadaPara: Date | string, ahora: Date | number): string | null {
  const diferencia = new Date(programadaPara).getTime() - new Date(ahora).getTime()
  if (Number.isNaN(diferencia)) return 'La fecha no es válida'
  if (diferencia < MIN_ANTICIPACION_MS)
    return 'La fecha tiene que ser al menos 5 minutos en el futuro'
  if (diferencia > MAX_ANTICIPACION_MS) return 'La fecha no puede superar los 180 días'
  return null
}

/** `fallida` con este `error` es «Confirmando…»: no es un fallo y no admite reintentar ni cancelar. */
export const ERROR_CONFIRMANDO = 'estado_desconocido'
/** `fallida` con este `error` es final: no se publica después, se crea de nuevo. */
export const ERROR_NO_SE_PUBLICO = 'No se publicó'

export type SituacionProgramada =
  | 'borrador'
  | 'programada'
  | 'publicando'
  | 'confirmando'
  | 'fallida'
  | 'no-se-publico'
  | 'publicada'
  | 'cancelada'

/** Lo que el usuario ve: separa «Confirmando…» y «No se publicó» de una fallida común. */
export function situacionDe(p: { estado: string; error: string | null }): SituacionProgramada {
  if (p.estado === 'fallida') {
    if (p.error === ERROR_CONFIRMANDO) return 'confirmando'
    if (p.error === ERROR_NO_SE_PUBLICO) return 'no-se-publico'
    return 'fallida'
  }
  return p.estado as SituacionProgramada
}

/** Los tipos que admiten una portada elegida aparte: el video de un reel o de TikTok. */
export const admitePortada = (tipo: TipoPieza | ''): boolean => tipo === 'reel' || tipo === 'video'

/**
 * La portada que se muestra de una pieza: la elegida o la primera imagen. `null` si no hay ninguna
 * (un video sin portada: la pantalla puede mostrar un fotograma del video).
 */
export function portadaDePieza(p: Pick<Programada, 'portadaUrl' | 'medios'>): string | null {
  return p.portadaUrl ?? p.medios.find((m) => m.tipo === 'imagen')?.url ?? null
}
