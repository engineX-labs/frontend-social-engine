import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { CalendarDays, Moon, Sun } from 'lucide-react'
import { motion } from 'motion/react'
import { Toaster } from 'sonner'
import { USAR_MOCKS } from '@/api/http'
import { Marca } from '@/components/Marca'
import { AvatarFidel } from '@/components/ui/AvatarFidel'
import { Boton } from '@/components/ui/Boton'
import { IconoInstagram } from '@/components/ui/IconoInstagram'
import { CUENTA_DEMO } from '@/mocks/cuenta'
import { cn } from '@/lib/utils'
import { useTheme } from './useTheme'

const SECCIONES = [
  { to: '/', texto: 'Calendario' },
  { to: '/chat', texto: 'Fidel' },
] as const

function IconoSeccion({ to, className }: { to: string; className?: string }) {
  return to === '/' ? (
    <CalendarDays className={className} aria-hidden="true" />
  ) : (
    <AvatarFidel tamano="xs" className={className} />
  )
}

export function Layout() {
  const { tema, alternar } = useTheme()
  const ruta = useRouterState({ select: (s) => s.location.pathname })
  // En escritorio ancho el panel de detalle convive con la grilla: se reserva su espacio.
  const conPanel = useRouterState({
    select: (s) =>
      s.location.pathname === '/' && Boolean((s.location.search as { item?: string }).item),
  })
  const activa = (to: string) => (to === '/' ? ruta === '/' : ruta.startsWith(to))

  return (
    <div
      className={cn(
        'mx-auto min-h-dvh max-w-[1500px] px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] transition-[padding] duration-(--dur-base) ease-brand sm:px-6 md:pb-12',
        conPanel && 'min-[1100px]:pr-[464px]!',
      )}
    >
      {/* Glass con propósito: la barra queda fija y el contenido pasa por debajo. */}
      <header className="sticky top-0 z-30 -mx-4 flex items-center gap-3 border-b border-hairline bg-glass px-4 py-2.5 backdrop-blur-xl backdrop-saturate-150 sm:-mx-6 sm:px-6">
        <Link to="/" aria-label="social engine, ir al calendario" className="rounded-md">
          <Marca />
        </Link>
        <nav aria-label="Secciones" className="ml-3 hidden gap-1 md:flex">
          {SECCIONES.map(({ to, texto }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'relative inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors duration-(--dur-fast)',
                activa(to) ? 'text-ink' : 'text-muted hover:text-ink',
              )}
            >
              {activa(to) && (
                <motion.span
                  layoutId="nav-escritorio"
                  className="absolute inset-0 rounded-md border border-hairline bg-raised"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <IconoSeccion to={to} className="relative size-4" />
              <span className="relative">{texto}</span>
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex min-w-0 items-center gap-2">
          {USAR_MOCKS && (
            <p
              className="flex min-h-9 min-w-0 items-center gap-2 rounded-full border border-hairline bg-raised py-1 pr-1.5 pl-3 text-[13px] font-semibold"
              title="Estás viendo datos de ejemplo"
            >
              <IconoInstagram className="hidden size-3.5 text-muted min-[400px]:block" />
              <span className="max-w-24 truncate sm:max-w-none">{CUENTA_DEMO.comercio}</span>
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-bold tracking-wide text-accent-ink">
                Demo
              </span>
            </p>
          )}
          <Boton
            tamano="icono-sm"
            onClick={alternar}
            aria-label="Cambiar entre modo claro y oscuro"
            className="rounded-full"
          >
            {tema === 'dark' ? (
              <Sun className="size-4" aria-hidden="true" />
            ) : (
              <Moon className="size-4" aria-hidden="true" />
            )}
          </Boton>
        </div>
      </header>
      <main className="pt-5">
        <Outlet />
      </main>
      <nav
        aria-label="Secciones"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-glass pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150 md:hidden"
      >
        <div className="mx-auto grid max-w-sm grid-cols-2 gap-1 px-3 py-1.5">
          {SECCIONES.map(({ to, texto }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-bold transition-colors duration-(--dur-fast) active:scale-[0.97]',
                activa(to) ? 'text-ink' : 'text-muted',
              )}
            >
              {activa(to) && (
                <motion.span
                  layoutId="nav-movil"
                  className="absolute inset-0 rounded-lg bg-raised"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <IconoSeccion to={to} className="relative size-5" />
              <span className="relative">{texto}</span>
            </Link>
          ))}
        </div>
      </nav>
      <Toaster
        theme={tema}
        position="bottom-center"
        offset={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
        mobileOffset={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
        toastOptions={{
          style: {
            background: 'var(--ink)',
            color: 'var(--surface)',
            border: 'none',
            fontFamily: 'var(--font-sans)',
            fontWeight: 600,
            borderRadius: '12px',
          },
        }}
      />
    </div>
  )
}
