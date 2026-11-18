import { IconoInstagram } from '@/components/ui/IconoInstagram'
import { IconoTiktok } from '@/components/ui/IconoTiktok'
import type { Red } from '@/domain/types'

export const NOMBRE_RED: Record<Red, string> = { instagram: 'Instagram', tiktok: 'TikTok' }

/** El ícono de la red; decorativo: el nombre va siempre en texto al lado. */
export function IconoRed({ red, className }: { red: Red; className?: string }) {
  return red === 'tiktok' ? (
    <IconoTiktok className={className} />
  ) : (
    <IconoInstagram className={className} />
  )
}
