import { obtenerToken } from './auth'

afterEach(() => vi.unstubAllEnvs())

describe('obtenerToken', () => {
  it('en desarrollo devuelve VITE_DEV_TOKEN', async () => {
    vi.stubEnv('VITE_DEV_TOKEN', 'jwt-de-prueba')
    await expect(obtenerToken()).resolves.toBe('jwt-de-prueba')
  })

  it('sin VITE_DEV_TOKEN, o vacío, devuelve null', async () => {
    vi.stubEnv('VITE_DEV_TOKEN', '')
    await expect(obtenerToken()).resolves.toBeNull()
    vi.stubEnv('VITE_DEV_TOKEN', '   ')
    await expect(obtenerToken()).resolves.toBeNull()
  })

  it('fuera de desarrollo ignora VITE_DEV_TOKEN', async () => {
    vi.stubEnv('VITE_DEV_TOKEN', 'jwt-de-prueba')
    vi.stubEnv('DEV', false)
    await expect(obtenerToken()).resolves.toBeNull()
  })
})
