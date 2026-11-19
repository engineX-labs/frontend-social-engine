import { useAuth } from '@clerk/react'
import type { ReactNode } from 'react'
import { Marca } from '@/components/Marca'
import { Boton } from '@/components/ui/Boton'

/** El marco de las pantallas de antes del calendario: marca, contenido y una salida. */
export function PantallaEntrada({ children }: { children: ReactNode }) {
  const { signOut } = useAuth()
  return (
    <main className="grid min-h-dvh place-items-center bg-surface px-4 py-10 text-ink">
      <div className="flex w-full max-w-[520px] animate-aparecer flex-col gap-6">
        <Marca />
        {children}
        <Boton
          variante="fantasma"
          tamano="sm"
          className="self-start"
          onClick={() => void signOut()}
        >
          Salir
        </Boton>
      </div>
    </main>
  )
}
