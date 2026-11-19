import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { PropsDePaso } from '@/app/pasosDeEntrada'
import { PantallaEntrada } from '@/features/registro/PantallaEntrada'
import { Cuestionario } from './Cuestionario'

/**
 * Paso de la entrada (`app/pasosDeEntrada.ts`): mientras el cuestionario de contexto esté
 * `pendiente` lo muestra; si se completa o se saltea, deja seguir. Va después de la bienvenida y
 * antes de «en preparación»: se puede contestar mientras se prepara la cuenta de Zernio.
 */
export function PasoCuestionario({ comercio, children }: PropsDePaso) {
  const consultas = useQueryClient()
  const [terminado, setTerminado] = useState(false)
  if (comercio.contexto !== 'pendiente' || terminado) return children
  return (
    <PantallaEntrada>
      <Cuestionario
        onTerminar={() => {
          setTerminado(true)
          void consultas.invalidateQueries({ queryKey: ['yo'] })
        }}
      />
    </PantallaEntrada>
  )
}
