import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { registrarProveedorDeToken } from '@/api/auth'
import { reiniciarProgramadas } from '@/mocks/programadas'
import { server } from '@/mocks/server'
import { clerkPrueba } from './clerk'

// Clerk necesita red y una clave real: en los tests se usa un doble (ver `clerk.tsx`).
vi.mock('@clerk/react', async () => (await import('./clerk')).moduloClerkDePrueba)

// jsdom no implementa `scrollIntoView`.
Element.prototype.scrollIntoView = vi.fn()

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  cleanup()
  localStorage.clear()
  server.resetHandlers()
  reiniciarProgramadas()
  clerkPrueba.restablecer()
  registrarProveedorDeToken(null)
})
afterAll(() => server.close())
