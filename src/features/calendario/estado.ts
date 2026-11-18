import {
  Ban,
  Check,
  CircleX,
  Clock,
  Hourglass,
  LoaderCircle,
  PencilLine,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import type { SituacionProgramada } from '@/domain/publicacion'

/** Cómo se ve cada situación de una pieza guardada desde la app: ícono con forma propia, texto y tono. */
export interface InfoEstado {
  texto: string
  Icono: LucideIcon
  /** Color del ícono; el texto va siempre en el color de la tinta para tener contraste. */
  color: string
  /** Gira (solo con movimiento permitido). */
  gira?: boolean
  /** Borde de la pieza: los fallos se marcan además del ícono y el texto. */
  borde: string
}

export const ESTADO: Record<SituacionProgramada, InfoEstado> = {
  borrador: {
    texto: 'Borrador',
    Icono: PencilLine,
    color: 'text-muted',
    borde: 'border-line-strong',
  },
  programada: {
    texto: 'Programada',
    Icono: Clock,
    color: 'text-accent-ink',
    borde: 'border-line-strong',
  },
  publicando: {
    texto: 'Publicando',
    Icono: LoaderCircle,
    color: 'text-accent-ink',
    gira: true,
    borde: 'border-line-strong',
  },
  confirmando: {
    texto: 'Confirmando…',
    Icono: Hourglass,
    color: 'text-muted',
    borde: 'border-line-strong',
  },
  fallida: { texto: 'Falló', Icono: TriangleAlert, color: 'text-danger', borde: 'border-danger' },
  'no-se-publico': {
    texto: 'No se publicó',
    Icono: CircleX,
    color: 'text-danger',
    borde: 'border-danger',
  },
  publicada: {
    texto: 'Publicada',
    Icono: Check,
    color: 'text-success',
    borde: 'border-line-strong',
  },
  cancelada: { texto: 'Cancelada', Icono: Ban, color: 'text-muted', borde: 'border-line-strong' },
}

/** Texto del estado en minúscula, para los nombres accesibles ("20:00 Reel en Instagram, programada"). */
export const textoDeEstado = (s: SituacionProgramada) => ESTADO[s].texto.toLowerCase()

/** Una línea que explica un estado que no es obvio (un fallo, «Confirmando…»); `error` es el de la pieza. */
export function notaDeEstado(error: string | null, situacion: SituacionProgramada): string | null {
  if (situacion === 'confirmando') return 'Estamos confirmando si se publicó. Se actualiza solo.'
  if (situacion === 'no-se-publico') return 'No se publicó. Podés crearla de nuevo.'
  if (situacion === 'fallida') return error ?? 'Falló la publicación.'
  return null
}
