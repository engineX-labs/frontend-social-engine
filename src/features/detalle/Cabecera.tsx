import type { ReactNode } from 'react'

export function Campo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted">
        {etiqueta}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold">{children}</dd>
    </div>
  )
}

export function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted">
        {titulo}
      </h3>
      {children}
    </section>
  )
}
