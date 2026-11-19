import { useSyncExternalStore, type ReactNode } from 'react'
import { vi } from 'vitest'

/**
 * Doble de `@clerk/react` para los tests: no hay red ni clave. El estado se cambia con
 * `clerkPrueba.fijar(...)` y los componentes que usan `useAuth` se vuelven a pintar.
 */
interface EstadoClerk {
  isLoaded: boolean
  isSignedIn: boolean
  token: string | null
}

const INICIAL: EstadoClerk = { isLoaded: true, isSignedIn: true, token: 'token-de-prueba' }
let estado: EstadoClerk = { ...INICIAL }
const oyentes = new Set<() => void>()

function suscribir(oyente: () => void) {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}

const getToken = async () => (estado.isSignedIn ? estado.token : null)

export const clerkPrueba = {
  signOut: vi.fn(async () => clerkPrueba.fijar({ isSignedIn: false })),
  fijar(parcial: Partial<EstadoClerk>) {
    estado = { ...estado, ...parcial }
    for (const oyente of [...oyentes]) oyente()
  },
  restablecer() {
    estado = { ...INICIAL }
    clerkPrueba.signOut.mockClear()
  },
}

function useAuth() {
  const actual = useSyncExternalStore(suscribir, () => estado)
  return {
    isLoaded: actual.isLoaded,
    isSignedIn: actual.isSignedIn,
    getToken,
    signOut: clerkPrueba.signOut,
  }
}

export const moduloClerkDePrueba = {
  ClerkProvider: ({ children }: { children: ReactNode }) => children,
  SignIn: () => <div data-testid="clerk-sign-in" />,
  SignUp: () => <div data-testid="clerk-sign-up" />,
  Waitlist: () => <div data-testid="clerk-waitlist" />,
  UserButton: () => <div data-testid="clerk-user-button" />,
  useAuth,
}
