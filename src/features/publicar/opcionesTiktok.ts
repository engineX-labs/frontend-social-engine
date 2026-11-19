import { PRIVACIDAD_PUBLICA } from '@/domain/publicacion'
import type { OpcionesTikTok } from '@/domain/types'

/**
 * Valor inicial del formulario de TikTok: sin privacidad (la elige el usuario, TikTok lo exige) y sin
 * ningún consentimiento. Los interruptores arrancan en «no» como se ven, así el valor nunca queda
 * indefinido mientras la pantalla muestra «apagado». Dúos y stitch solo existen en video.
 */
export function opcionesTikTokIniciales(tipo: 'video' | 'fotos'): OpcionesTikTok {
  return {
    allowComment: false,
    ...(tipo === 'video' ? { allowDuet: false, allowStitch: false } : {}),
    contentPreviewConfirmed: false,
    expressConsentGiven: false,
  }
}

const ETIQUETAS_PRIVACIDAD: Record<string, string> = {
  [PRIVACIDAD_PUBLICA]: 'Público',
  MUTUAL_FOLLOW_FRIENDS: 'Amigos (se siguen mutuamente)',
  FOLLOWER_OF_CREATOR: 'Solo seguidores',
  SELF_ONLY: 'Solo yo',
}

/** Nombre en español de un nivel de privacidad; uno desconocido se muestra tal cual. */
export function etiquetaPrivacidad(valor: string): string {
  return ETIQUETAS_PRIVACIDAD[valor] ?? valor
}

/** 600 → «10 min»; 90 → «1 min 30 s»; 45 → «45 s». */
export function formatearDuracion(segundos: number): string {
  const m = Math.floor(segundos / 60)
  const s = Math.round(segundos % 60)
  if (m === 0) return `${s} s`
  return s === 0 ? `${m} min` : `${m} min ${s} s`
}
