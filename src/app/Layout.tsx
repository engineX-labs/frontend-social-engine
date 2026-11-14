import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { CalendarDays, MessageCircle, Moon, Sun } from 'lucide-react'
import { Marca } from '@/components/Marca'
import { useTheme } from './useTheme'

const base =
  'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-muted transition-colors hover:text-ink'
const activo = 'bg-raised text-ink'

export function Layout() {
  const { tema, alternar } = useTheme()
  // En escritorio ancho el panel de detalle convive con la grilla: se reserva su espacio.
  const conPanel = useRouterState({
    select: (s) =>
      s.location.pathname === '/' && Boolean((s.location.search as { item?: string }).item),
  })
  return (
    <div
      className={`mx-auto min-h-dvh max-w-[1500px] px-4 pb-24 transition-[padding] duration-[220ms] md:pb-12 ${conPanel ? 'min-[1100px]:pr-[456px]' : ''}`}
    >
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-surface py-3">
        <Link to="/" aria-label="social engine, ir al calendario">
          <Marca />
        </Link>
        <nav aria-label="Secciones" className="ml-4 hidden gap-1 md:flex">
          <Link
            to="/"
            className={base}
            activeProps={{ className: activo }}
            activeOptions={{ exact: true }}
          >
            <CalendarDays className="size-4" aria-hidden="true" />
            Calendario
          </Link>
          <Link to="/chat" className={base} activeProps={{ className: activo }}>
            <MessageCircle className="size-4" aria-hidden="true" />
            Fidel
          </Link>
        </nav>
        <button
          type="button"
          onClick={alternar}
          aria-label="Cambiar entre modo claro y oscuro"
          className="ml-auto inline-grid size-10 place-items-center rounded-md border border-line bg-raised hover:border-line-strong"
        >
          {tema === 'dark' ? (
            <Sun className="size-4" aria-hidden="true" />
          ) : (
            <Moon className="size-4" aria-hidden="true" />
          )}
        </button>
      </header>
      <main className="pt-4">
        <Outlet />
      </main>
      <nav
        aria-label="Secciones"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <Link
          to="/"
          activeOptions={{ exact: true }}
          className="flex flex-col items-center gap-1 py-2.5 text-xs font-semibold text-muted"
          activeProps={{ className: 'text-accent-ink' }}
        >
          <CalendarDays className="size-5" aria-hidden="true" />
          Calendario
        </Link>
        <Link
          to="/chat"
          className="flex flex-col items-center gap-1 py-2.5 text-xs font-semibold text-muted"
          activeProps={{ className: 'text-accent-ink' }}
        >
          <MessageCircle className="size-5" aria-hidden="true" />
          Fidel
        </Link>
      </nav>
    </div>
  )
}
