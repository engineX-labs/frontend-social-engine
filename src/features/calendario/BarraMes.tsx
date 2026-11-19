import { CalendarClock, Check, ChevronLeft, ChevronRight, EyeOff, Plus } from 'lucide-react'
import { AvatarFidel } from '@/components/ui/AvatarFidel'
import { Boton } from '@/components/ui/Boton'
import { nombreMes, desplazarMes } from '@/lib/fecha'
import { cn } from '@/lib/utils'
import type { Tipo } from './agrupar'

interface Props {
  mes: string
  ocultar: readonly Tipo[]
  cuentas: Partial<Record<Tipo, number>> | null
  /** Publicar y programar prendido: suma el filtro «Programadas». */
  conProgramadas?: boolean
  onMes: (mes: string) => void
  onHoy: () => void
  onFiltro: (tipo: Tipo) => void
  /** Abre «Nueva publicación». Solo con publicar y programar prendido. */
  onNueva?: () => void
}

const FILTROS: { tipo: Tipo; texto: string }[] = [
  { tipo: 'publicada', texto: 'Publicadas' },
  { tipo: 'programada', texto: 'Programadas' },
  { tipo: 'idea', texto: 'Sugeridas' },
]

export function BarraMes({
  mes,
  ocultar,
  cuentas,
  conProgramadas = false,
  onMes,
  onHoy,
  onFiltro,
  onNueva,
}: Props) {
  const marcaAncha = conProgramadas ? '@max-[559px]:hidden' : ''
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
      <h2 aria-live="polite" className="mr-auto text-2xl font-extrabold tracking-tight">
        {nombreMes(mes)}
      </h2>
      {onNueva && (
        <Boton variante="primario" onClick={onNueva} aria-label="Nueva publicación">
          <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
          <span aria-hidden="true" className="@max-[559px]:hidden">
            Nueva publicación
          </span>
          <span aria-hidden="true" className="@min-[560px]:hidden">
            Nueva
          </span>
        </Boton>
      )}
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
      {/* Interruptores independientes sobre un mismo riel: encendido = pieza elevada con su
          marca; apagado = plano, con el ojo tachado. «Programadas» solo existe con publicar prendido. */}
      {/* Con tres filtros en 390px no entran con su marca: bajo 560px la marca del filtro encendido se
          oculta (su estado sigue en el relleno elevado y en aria-pressed; el apagado lleva el ojo). */}
      <div
        role="group"
        aria-label="Filtrar por tipo"
        className="flex w-full gap-1 rounded-lg bg-inset p-1 @min-[560px]:w-auto"
      >
        {FILTROS.filter(({ tipo }) => conProgramadas || tipo !== 'programada').map(
          ({ tipo, texto }) => {
            const visible = !ocultar.includes(tipo)
            return (
              <button
                key={tipo}
                type="button"
                aria-pressed={visible}
                onClick={() => onFiltro(tipo)}
                className={cn(
                  // Con tres filtros en 390px no entran con el aire de escritorio: menos relleno y
                  // separación hasta que el calendario tiene ancho (560px).
                  'inline-flex min-h-10 flex-auto items-center justify-center gap-1 rounded-md px-1.5 text-sm font-semibold select-none @min-[560px]:min-h-9 @min-[560px]:flex-none @min-[560px]:gap-2 @min-[560px]:px-3',
                  'transition-[background-color,color,box-shadow,transform] duration-(--dur-fast) ease-brand active:scale-[0.97] active:duration-(--dur-press)',
                  visible
                    ? 'bg-raised text-ink shadow-card ring-1 ring-hairline'
                    : 'text-muted hover:text-ink',
                )}
              >
                {!visible ? (
                  <EyeOff className="size-4 shrink-0" aria-hidden="true" />
                ) : tipo === 'idea' ? (
                  <AvatarFidel tamano="xs" className={cn('size-4 shrink-0', marcaAncha)} />
                ) : tipo === 'programada' ? (
                  <CalendarClock
                    className={cn('size-4 shrink-0', marcaAncha)}
                    strokeWidth={2.5}
                    aria-hidden="true"
                  />
                ) : (
                  <Check
                    className={cn('size-4 shrink-0', marcaAncha)}
                    strokeWidth={3}
                    aria-hidden="true"
                  />
                )}
                {texto}
                {cuentas && (
                  <span className="cifra font-mono text-xs text-muted">{cuentas[tipo] ?? 0}</span>
                )}
              </button>
            )
          },
        )}
      </div>
    </div>
  )
}
