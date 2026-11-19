import { useState, type ReactNode } from 'react'
import { useYo, type ComercioPropio } from '@/api/registro'
import { EstadoError } from '@/components/estados'
import { Marca } from '@/components/Marca'
import { Bienvenida } from '@/features/registro/Bienvenida'
import { ConectarRedes } from '@/features/registro/ConectarRedes'
import { EnPreparacion } from '@/features/registro/EnPreparacion'
import { PantallaEntrada } from '@/features/registro/PantallaEntrada'
import { leerRetorno } from '@/features/registro/retorno'
import { PASOS_DE_ENTRADA, type PasoDeEntrada } from './pasosDeEntrada'

/**
 * Lo primero que ve alguien con sesión: según `GET /api/yo`, la bienvenida (sin comercio), los
 * pasos extra (ver `pasosDeEntrada.ts`), «estamos preparando tu cuenta», «conectá tus redes» o,
 * con la cuenta activa, la app (`children`). Reemplaza al 403 «Tu usuario todavía no tiene un
 * comercio asignado», que ya no es lo primero que ve un usuario nuevo.
 */
export function Entrada({
  children,
  pasos = PASOS_DE_ENTRADA,
}: {
  children: ReactNode
  pasos?: readonly PasoDeEntrada[]
}) {
  const yo = useYo()
  // Se lee una sola vez al montar (no se modifica nada acá, por StrictMode); `ConectarRedes`
  // limpia el rastro.
  const [retorno] = useState(leerRetorno)
  const [retornoVisto, setRetornoVisto] = useState(false)

  if (yo.isPending) return <Cargando />
  if (yo.isError)
    return (
      <PantallaEntrada>
        <EstadoError
          mensaje="No pudimos cargar tu cuenta."
          onReintentar={() => void yo.refetch()}
        />
      </PantallaEntrada>
    )

  const comercio = yo.data.comercio
  if (!comercio)
    return (
      <PantallaEntrada>
        <Bienvenida />
      </PantallaEntrada>
    )

  // Volviendo del OAuth de Zernio: se muestra el resultado aunque la cuenta ya esté activa.
  if (retorno && !retornoVisto)
    return (
      <PantallaEntrada>
        <ConectarRedes retorno={retorno} onContinuar={() => setRetornoVisto(true)} />
      </PantallaEntrada>
    )

  return pasos.reduceRight<ReactNode>(
    (siguiente, Paso) => <Paso comercio={comercio}>{siguiente}</Paso>,
    <SegunEstado comercio={comercio}>{children}</SegunEstado>,
  )
}

function SegunEstado({ comercio, children }: { comercio: ComercioPropio; children: ReactNode }) {
  switch (comercio.estado) {
    case 'en_preparacion':
      return (
        <PantallaEntrada>
          <EnPreparacion nombre={comercio.nombre} />
        </PantallaEntrada>
      )
    case 'sin_redes':
      return (
        <PantallaEntrada>
          <ConectarRedes />
        </PantallaEntrada>
      )
    case 'activo':
      return children
  }
}

function Cargando() {
  return (
    <div
      role="status"
      aria-label="Cargando tu cuenta"
      className="grid min-h-dvh place-items-center bg-surface text-ink"
    >
      <span className="animate-aparecer">
        <Marca />
      </span>
    </div>
  )
}
