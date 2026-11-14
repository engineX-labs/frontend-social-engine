import { Link } from '@tanstack/react-router'
import { Sparkles } from 'lucide-react'
import type { Idea } from '@/domain/types'
import { claveDia, hora } from '@/lib/fecha'
import { mayuscula, nombreDia } from './agrupar'

/** Resumen de Fidel: cuántas ideas sugirió para el mes y cuál es la primera. */
export function BannerFidel({ ideas, onVer }: { ideas: Idea[]; onVer: (id: string) => void }) {
  if (!ideas.length) return null
  const primera = [...ideas].sort((a, b) => Date.parse(a.fecha) - Date.parse(b.fecha))[0]!
  return (
    <aside
      aria-label="Resumen de Fidel"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-dashed border-accent bg-accent-soft p-3 max-[819px]:order-last"
    >
      <Sparkles className="size-4 shrink-0 text-accent-ink" aria-hidden="true" />
      <p className="min-w-0 flex-1 basis-60 text-sm text-ink">
        <strong className="font-bold">
          Fidel te sugiere {ideas.length} {ideas.length === 1 ? 'idea' : 'ideas'} para este mes.
        </strong>{' '}
        <span className="text-muted">
          La primera: {primera.formato} el {mayuscula(nombreDia(claveDia(primera.fecha)))} a las{' '}
          {hora(primera.fecha)}.
        </span>
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onVer(primera.id)}
          className="min-h-10 rounded-md bg-accent px-3 text-sm font-bold text-on-accent hover:bg-accent-hover"
        >
          Ver idea
        </button>
        <Link
          to="/chat"
          className="inline-flex min-h-10 items-center rounded-md border border-line-strong px-3 text-sm font-semibold text-ink hover:bg-raised"
        >
          Hablar con Fidel
        </Link>
      </div>
    </aside>
  )
}
