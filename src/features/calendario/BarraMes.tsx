import { Check, ChevronLeft, ChevronRight, EyeOff } from 'lucide-react'
import { AvatarFidel } from '@/components/ui/AvatarFidel'
import { Boton } from '@/components/ui/Boton'
import { nombreMes, desplazarMes } from '@/lib/fecha'
import { cn } from '@/lib/utils'
import type { Tipo } from './agrupar'

interface Props {
  mes: string
  ocultar: readonly Tipo[]
  cuentas: Record<Tipo, number> | null
  onMes: (mes: string) => void
  onHoy: () => void
  onFiltro: (tipo: Tipo) => void
}

const FILTROS: { tipo: Tipo; texto: string }[] = [
  { tipo: 'publicada', texto: 'Publicadas' },
  { tipo: 'idea', texto: 'Sugeridas' },
]

export function BarraMes({ mes, ocultar, cuentas, onMes, onHoy, onFiltro }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
      <h2 aria-live="polite" className="mr-auto text-2xl font-extrabold tracking-tight">
        {nombreMes(mes)}
      </h2>
      <div className="flex items-center gap-1.5">
        <Boton
          tamano="icono"
          aria-label={`Mes anterior, ${nombreMes(desplazarMes(mes, -1))}`}
          onClick={() => onMes(desplazarMes(mes, -1))}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Boton>
        <Boton onClick={onHoy}>Hoy</Boton>
        <Boton
          tamano="icono"
          aria-label={`Mes siguiente, ${nombreMes(desplazarMes(mes, 1))}`}
          onClick={() => onMes(desplazarMes(mes, 1))}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Boton>
      </div>
      {/* Dos interruptores independientes sobre un mismo riel: encendido = pieza elevada con su
          marca; apagado = plano, con el ojo tachado. */}
      <div
        role="group"
        aria-label="Filtrar por tipo"
        className="flex w-full gap-1 rounded-lg bg-inset p-1 @min-[560px]:w-auto"
      >
        {FILTROS.map(({ tipo, texto }) => {
          const visible = !ocultar.includes(tipo)
          return (
            <button
              key={tipo}
              type="button"
              aria-pressed={visible}
              onClick={() => onFiltro(tipo)}
              className={cn(
                'inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold select-none @min-[560px]:min-h-9 @min-[560px]:flex-none',
                'transition-[background-color,color,box-shadow,transform] duration-(--dur-fast) ease-brand active:scale-[0.97] active:duration-(--dur-press)',
                visible
                  ? 'bg-raised text-ink shadow-card ring-1 ring-hairline'
                  : 'text-muted hover:text-ink',
              )}
            >
              {!visible ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : tipo === 'idea' ? (
                <AvatarFidel tamano="xs" className="size-4" />
              ) : (
                <Check className="size-4" strokeWidth={3} aria-hidden="true" />
              )}
              {texto}
              {cuentas && (
                <span className="cifra font-mono text-xs text-muted">{cuentas[tipo]}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
