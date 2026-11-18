import { UserButton } from '@clerk/react'
import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { Moon, Sun } from 'lucide-react'
import { Toaster } from 'sonner'
import { USAR_MOCKS } from '@/api/http'
import { Marca } from '@/components/Marca'
import { Boton } from '@/components/ui/Boton'
import { IconoInstagram } from '@/components/ui/IconoInstagram'
import { BarraFidel } from '@/features/chat/BarraFidel'
import { useFidel } from '@/features/chat/contexto'
import { FidelProvider } from '@/features/chat/FidelProvider'
import { HojaFidel } from '@/features/chat/HojaFidel'
import { CUENTA_DEMO } from '@/mocks/cuenta'
import { cn } from '@/lib/utils'
import { useTheme } from './useTheme'

/** Un solo dashboard: el calendario, con Fidel al costado (escritorio) o a mano (móvil). */
export function Layout() {
  return (
    <FidelProvider>
      <Marco />
    </FidelProvider>
  )
}

function Marco() {
  const { tema, alternar } = useTheme()
  const { escritorio } = useFidel()
  // En escritorio ancho el panel de detalle convive con la grilla: se reserva su espacio.
  const conPanel = useRouterState({
    select: (s) =>
      s.location.pathname === '/' && Boolean((s.location.search as { item?: string }).item),
  })

  return (
    <div className="min-h-dvh [--alto-cabecera:3.5rem]">
      <header className="sticky top-0 z-30 flex h-(--alto-cabecera) items-center gap-3 border-b border-hairline bg-glass px-4 backdrop-blur-xl backdrop-saturate-150 sm:px-6">
        <Link to="/" aria-label="social engine, ir al calendario" className="rounded-md">
          <Marca />
        </Link>
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
          <UserButton />
        </div>
      </header>
      <div className="flex">
        {escritorio && <BarraFidel />}
        <main
          className={cn(
            'min-w-0 flex-1 px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] transition-[padding] duration-(--dur-base) ease-brand sm:px-6 lg:pb-12',
            conPanel && 'min-[1440px]:pr-[464px]!',
          )}
        >
          <div className="mx-auto max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
      {!escritorio && <HojaFidel />}
      <Toaster
        theme={tema}
        position="bottom-center"
        offset={{ bottom: '1.5rem' }}
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
