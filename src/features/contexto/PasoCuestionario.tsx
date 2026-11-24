import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { PropsDePaso } from '@/app/pasosDeEntrada'
import { PantallaEntrada } from '@/features/registro/PantallaEntrada'
import { Cuestionario } from './Cuestionario'
import { PantallaGuardando } from './PantallaGuardando'

/**
 * Paso de la entrada (`app/pasosDeEntrada.ts`): mientras el cuestionario de contexto esté
 * `pendiente` lo muestra; si se completa o se saltea, deja seguir. Va después de la bienvenida y
 * antes de «en preparación»: se puede contestar mientras se prepara la cuenta de Zernio.
 */
export function PasoCuestionario({ comercio, children }: PropsDePaso) {
  const consultas = useQueryClient()
  const [terminado, setTerminado] = useState(false)
  const [actualizando, setActualizando] = useState(false)
  if (actualizando)
    return (
      <PantallaEntrada>
        <PantallaGuardando />
      </PantallaEntrada>
    )
  if (comercio.contexto !== 'pendiente' || terminado) return children
  return (
    <PantallaEntrada>
      <Cuestionario
        onTerminar={() => {
          // La carga sigue hasta que llegue el estado nuevo de la cuenta: sin saltos en el medio.
          setActualizando(true)
          void consultas.invalidateQueries({ queryKey: ['yo'] }).finally(() => {
            setTerminado(true)
            setActualizando(false)
          })
        }}
      />
    </PantallaEntrada>
  )
}
