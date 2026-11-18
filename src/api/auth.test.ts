import { alNoAutorizado, avisarNoAutorizado, obtenerToken, registrarProveedorDeToken } from './auth'

describe('obtenerToken', () => {
  it('sin proveedor (sin sesión) devuelve null', async () => {
    await expect(obtenerToken()).resolves.toBeNull()
  })

  it('con proveedor devuelve el token y se lo pide cada vez (no lo guarda)', async () => {
    const pedir = vi.fn().mockResolvedValueOnce('uno').mockResolvedValueOnce('dos')
    registrarProveedorDeToken(pedir)
    await expect(obtenerToken()).resolves.toBe('uno')
    await expect(obtenerToken()).resolves.toBe('dos')
    expect(pedir).toHaveBeenCalledTimes(2)
  })

  it('si el proveedor falla devuelve null en vez de romper el pedido', async () => {
    registrarProveedorDeToken(async () => {
      throw new Error('sin red')
    })
    await expect(obtenerToken()).resolves.toBeNull()
  })

  it('al quitar el proveedor vuelve a null', async () => {
    registrarProveedorDeToken(async () => 'token')
    registrarProveedorDeToken(null)
    await expect(obtenerToken()).resolves.toBeNull()
  })
})

describe('alNoAutorizado', () => {
  it('avisa a quien escucha y deja de avisar al darse de baja', () => {
    const oyente = vi.fn()
    const baja = alNoAutorizado(oyente)
    avisarNoAutorizado()
    expect(oyente).toHaveBeenCalledTimes(1)
    baja()
    avisarNoAutorizado()
    expect(oyente).toHaveBeenCalledTimes(1)
  })
})
