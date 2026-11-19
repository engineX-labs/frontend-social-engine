import { cargarCuentaDeZernio, fijarRegistro } from '@/mocks/registro'
import { ApiError, apiFetch, urlApi } from './http'

/** Los mocks copian el contrato del backend: estos tests fijan esa copia (estados, códigos, mensajes). */
const estado = async (path: string, init?: Parameters<typeof apiFetch>[1]) =>
  apiFetch(path, init).then(
    () => 200,
    (e: unknown) => (e instanceof ApiError ? e.status : -1),
  )

describe('contrato del alta (mocks)', () => {
  it('GET /api/yo: sin comercio es null y con comercio trae su estado', async () => {
    fijarRegistro('sin_comercio')
    expect(await apiFetch('/api/yo')).toEqual({ comercio: null })
    for (const e of ['en_preparacion', 'sin_redes', 'activo'] as const) {
      fijarRegistro(e)
      expect(await apiFetch('/api/yo')).toEqual({
        comercio: { id: expect.any(String), nombre: 'Casa Álamo', estado: e },
      })
    }
  })

  it('POST /api/comercio: 201 si lo crea, 200 (el mismo) si ya existía', async () => {
    fijarRegistro('sin_comercio')
    const pedir = (nombre: string) =>
      fetch(urlApi('/api/comercio'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre }),
      })
    const primero = await pedir('  Panadería Sol ')
    expect(primero.status).toBe(201)
    const creado = await primero.json()
    expect(creado).toMatchObject({ nombre: 'Panadería Sol', estado: 'en_preparacion' })
    const segundo = await pedir('Otro nombre')
    expect(segundo.status).toBe(200)
    expect(await segundo.json()).toEqual(creado)
  })

  it('POST /api/comercio: el nombre va de 1 a 80 caracteres (422 con detalle)', async () => {
    fijarRegistro('sin_comercio')
    for (const nombre of ['', '   ', 'x'.repeat(81)])
      expect(await estado('/api/comercio', { method: 'POST', json: { nombre } })).toBe(422)
    expect(
      await estado('/api/comercio', { method: 'POST', json: { nombre: 'x'.repeat(80) } }),
    ).toBe(200)
  })

  it('sin comercio, las rutas de conexión dan 403', async () => {
    fijarRegistro('sin_comercio')
    expect(await estado('/api/conexion/redes')).toBe(403)
    expect(await estado('/api/conexion/redes/sincronizar', { method: 'POST' })).toBe(403)
  })

  it('plataforma no soportada es 400; con la cuenta en preparación, 409', async () => {
    fijarRegistro('sin_redes')
    expect(await estado('/api/conexion/redes/facebook', { method: 'POST', json: {} })).toBe(400)
    fijarRegistro('en_preparacion')
    expect(await estado('/api/conexion/redes/instagram', { method: 'POST', json: {} })).toBe(409)
    cargarCuentaDeZernio()
    expect(await estado('/api/conexion/redes/instagram', { method: 'POST', json: {} })).toBe(200)
  })

  it('GET /api/conexion/redes lista las redes y las plataformas que faltan', async () => {
    fijarRegistro('activo')
    expect(await apiFetch('/api/conexion/redes')).toEqual({
      redes: [
        { id: 'red-ig', plataforma: 'instagram', username: 'casaalamo', estado: 'conectada' },
      ],
      plataformasFaltantes: ['tiktok'],
    })
  })

  it('sincronizar registra la red autorizada una sola vez (no duplica)', async () => {
    fijarRegistro('sin_redes')
    await apiFetch('/api/conexion/redes/tiktok', {
      method: 'POST',
      json: { reconectarRedId: null },
    })
    const primero = await apiFetch<{ nuevas: number }>('/api/conexion/redes/sincronizar', {
      method: 'POST',
    })
    const segundo = await apiFetch<{ nuevas: number; redes: unknown[] }>(
      '/api/conexion/redes/sincronizar',
      { method: 'POST' },
    )
    expect(primero.nuevas).toBe(1)
    expect(segundo.nuevas).toBe(0)
    expect(segundo.redes).toHaveLength(1)
    expect(await apiFetch('/api/yo')).toMatchObject({ comercio: { estado: 'activo' } })
  })
})
