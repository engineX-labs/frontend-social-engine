import { esMX } from '@clerk/localizations'
import { ClerkProvider, SignIn, useAuth } from '@clerk/react'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { alNoAutorizado, registrarProveedorDeToken } from '@/api/auth'
import { Marca } from '@/components/Marca'

/** Clave pública de Clerk (`pk_...`). No es secreta; la clave secreta nunca va al front. */
export const CLAVE_CLERK = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined

/** Tokens de engineX para los componentes de Clerk (los de shadcn no coinciden con los de la app). */
const apariencia = {
  variables: {
    colorPrimary: '#ff5b2e',
    colorTextOnPrimaryBackground: 'var(--on-accent)',
    colorBackground: 'var(--surface-raised)',
    colorText: 'var(--ink)',
    colorTextSecondary: 'var(--ink-muted)',
    colorInputBackground: 'var(--surface-inset)',
    colorInputText: 'var(--ink)',
    colorDanger: 'var(--danger)',
    fontFamily: 'var(--font-sans)',
    borderRadius: '0.75rem',
  },
}

/**
 * El login es obligatorio: sin sesión solo se ve la pantalla de ingreso. Todo lo de adentro
 * (la API, el router) se monta recién con una sesión válida. Los usuarios entran por invitación
 * (modo Invite-only en el panel de Clerk), así que acá no hay registro.
 */
export function Acceso({ clave = CLAVE_CLERK, children }: { clave?: string; children: ReactNode }) {
  if (!clave?.trim()) return <FaltaConfiguracion />
  return (
    <ClerkProvider
      publishableKey={clave}
      afterSignOutUrl="/"
      localization={esMX}
      appearance={apariencia}
    >
      <Puerta>{children}</Puerta>
    </ClerkProvider>
  )
}

function Puerta({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth()
  const consultas = useQueryClient()
  const [vencida, setVencida] = useState(false)
  const saliendo = useRef(false)

  // Se registra durante el render, antes de que los hijos hagan su primer pedido: un efecto del
  // padre corre después de los de los hijos y el primer pedido saldría sin token.
  registrarProveedorDeToken(isSignedIn ? () => getToken() : null)

  // Sin sesión se vacía la caché: el próximo usuario de esta pestaña no puede ver datos del anterior.
  useEffect(() => {
    if (isLoaded && !isSignedIn) consultas.clear()
  }, [isLoaded, isSignedIn, consultas])

  // Al volver a entrar se quita el aviso de "sesión vencida" (se ajusta durante el render).
  const [estabaAdentro, setEstabaAdentro] = useState(Boolean(isSignedIn))
  if (Boolean(isSignedIn) !== estabaAdentro) {
    setEstabaAdentro(Boolean(isSignedIn))
    if (isSignedIn) setVencida(false)
  }
  useEffect(() => {
    if (isSignedIn) saliendo.current = false
  }, [isSignedIn])

  // Un 401 de la API: se cierra la sesión una sola vez, aunque fallen varios pedidos juntos.
  useEffect(
    () =>
      alNoAutorizado(() => {
        if (saliendo.current) return
        saliendo.current = true
        setVencida(true)
        void signOut()
      }),
    [signOut],
  )

  if (!isLoaded) return <Cargando />
  if (!isSignedIn) return <PantallaIngreso vencida={vencida} />
  return children
}

function Cargando() {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className="grid min-h-dvh place-items-center bg-surface text-ink"
    >
      <span className="animate-aparecer">
        <Marca />
      </span>
    </div>
  )
}

function PantallaIngreso({ vencida }: { vencida: boolean }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-surface px-4 py-10 text-ink">
      <div className="flex w-full max-w-[440px] flex-col items-center gap-6">
        <Marca />
        {vencida && (
          <p
            role="status"
            className="m-0 w-full rounded-lg border border-line bg-raised px-4 py-3 text-center text-sm"
          >
            Tu sesión venció. Volvé a ingresar.
          </p>
        )}
        <SignIn routing="hash" fallbackRedirectUrl="/" />
      </div>
    </main>
  )
}

function FaltaConfiguracion() {
  return (
    <main className="grid min-h-dvh place-items-center bg-surface px-4 py-10 text-ink">
      <div
        role="alert"
        className="flex w-full max-w-[520px] flex-col gap-3 rounded-lg border border-line bg-raised p-5 text-sm"
      >
        <Marca />
        <h1 className="m-0 text-lg font-bold">Falta configurar el ingreso</h1>
        <p className="m-0 text-muted">
          La app necesita la clave pública de Clerk. Definí{' '}
          <code className="cifra">VITE_CLERK_PUBLISHABLE_KEY</code> en <code>.env.local</code> (ver{' '}
          <code>.env.example</code>) y reiniciá el servidor.
        </p>
      </div>
    </main>
  )
}
