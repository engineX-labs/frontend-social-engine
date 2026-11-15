import type { ReactNode } from 'react'
import { AvatarFidel } from '@/components/ui/AvatarFidel'
import { cn } from '@/lib/utils'

export function Campo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="rotulo">{etiqueta}</dt>
      <dd className="mt-1 text-sm font-semibold">{children}</dd>
    </div>
  )
}

export function Seccion({
  titulo,
  children,
  className,
}: {
  titulo: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('space-y-2.5', className)}>
      <h3 className="rotulo">{titulo}</h3>
      {children}
    </section>
  )
}

/**
 * Lo que dice Fidel: superficie propia con su avatar, separada de los datos.
 * El gradiente del avatar es la firma; el fondo apenas lo insinúa.
 */
export function VozFidel({
  titulo,
  accion,
  children,
}: {
  titulo: string
  accion?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl bg-fidel-soft p-4 ring-1 ring-hairline">
      <div className="flex items-center gap-2.5">
        <AvatarFidel tamano="sm" />
        <h3 className="flex-1 text-sm font-bold">{titulo}</h3>
        {accion}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  )
}
