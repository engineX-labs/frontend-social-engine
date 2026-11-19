import type { ComponentType, ReactNode } from 'react'
import type { ComercioPropio } from '@/api/registro'
import { PasoCuestionario } from '@/features/contexto/PasoCuestionario'

/**
 * PUNTO DE EXTENSIÓN de la pantalla de entrada (`Entrada.tsx`).
 *
 * Un paso es un envoltorio: recibe el comercio ya creado y los `children` (lo que viene después).
 * Mientras le falte algo al usuario muestra su propia pantalla; cuando ya está completo (o no
 * aplica) devuelve los `children`. Así cada paso decide solo, con sus propias consultas, si
 * corresponde, y `Entrada` no necesita saber nada de él.
 *
 * Orden de la entrada: bienvenida (nombre) → **pasos extra, en el orden de la lista** → pantalla
 * según el estado del comercio (`en_preparacion` / `sin_redes`) → calendario. Los pasos van antes
 * de «en preparación» a propósito: se pueden completar mientras se prepara la cuenta.
 *
 * Hoy el único paso es el cuestionario de contexto (`features/contexto/PasoCuestionario.tsx`).
 * Para sumar otro: crear su componente con esta forma y agregarlo a `PASOS_DE_ENTRADA`.
 */
export interface PropsDePaso {
  comercio: ComercioPropio
  children: ReactNode
}

export type PasoDeEntrada = ComponentType<PropsDePaso>

/** Cuestionario de contexto (`plans/cuestionario-contexto.md`, Fase 5). Otros pasos se suman acá. */
export const PASOS_DE_ENTRADA: readonly PasoDeEntrada[] = [PasoCuestionario]
