import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { toast } from 'sonner'
import { useCalendario } from '@/api/calendario'
import { refresco } from '@/api/pendientes'
import { crearProgramada } from '@/api/publicacion'
import type { Medio, Programada } from '@/domain/types'
import { claveMes } from '@/lib/fecha'
import { calendarioDelMes } from '@/mocks/datos'
import {
  avanzarPieza,
  mockPublicacion,
  programadasParaElCalendario,
  todasLasProgramadas,
} from '@/mocks/programadas'
import { server } from '@/mocks/server'
import { leerVistas, olvidarVistas } from './avisos'
import { useSeguimientoDePublicacion } from './useSeguimientoDePublicacion'

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }))

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms))
const contador = { calendario: 0, redes: 0 }

/** Cuenta los pedidos al calendario y devuelve lo mismo que el mock, o las piezas que se le den. */
function contar(programadas?: () => Programada[]) {
  server.use(
    http.get('*/api/calendario', ({ request }) => {
      contador.calendario++
      const mes = new URL(request.url).searchParams.get('mes')!
      return HttpResponse.json({
        ...calendarioDelMes(mes),
        programadas: programadas ? programadas() : programadasParaElCalendario(mes),
      })
    }),
    http.get('*/api/redes', () => {
      contador.redes++
      return HttpResponse.json([
        { id: 'red-ig', red: 'instagram', username: 'casa.alamo', salud: null },
      ])
    }),
  )
}

function Sonda({ mes, abrir }: { mes: string; abrir: (p: Programada) => void }) {
  const { data } = useCalendario(mes)
  useSeguimientoDePublicacion({ datos: data, abrir })
  return null
}

function montar(mes = '2026-11', abrir: (p: Programada) => void = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const ui = (
    <QueryClientProvider client={queryClient}>
      <Sonda mes={mes} abrir={abrir} />
    </QueryClientProvider>
  )
  return render(ui)
}

/** Noviembre sin nada por resolverse: sin programadas cercanas, sin publicándose y sin «Confirmando…». */
function quieto() {
  avanzarPieza('prog-2', 'cancelada')
  avanzarPieza('prog-3', 'cancelada')
  avanzarPieza('prog-6', 'fallida', { error: 'Zernio rechazó la publicación; revisá el contenido' })
}

const foto: Medio = { url: 'https://mock.zernio.test/medios/f.jpg', tipo: 'imagen' }
const visibilidad = (valor: DocumentVisibilityState) =>
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => valor })

beforeEach(() => {
  contador.calendario = 0
  contador.redes = 0
  olvidarVistas()
  vi.mocked(toast).mockClear()
  vi.mocked(toast.error).mockClear()
  refresco.intervaloMs = 40
  vi.stubEnv('VITE_PUBLICACION_HABILITADA', 'true')
})
afterEach(() => {
  refresco.intervaloMs = 30_000
  refresco.ventanaMs = 10 * 60_000
  visibilidad('visible')
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('refresco acotado', () => {
  it('refresca mientras una pieza se está publicando', async () => {
    quieto()
    avanzarPieza('prog-2', 'publicando')
    contar()
    montar()
    await waitFor(() => expect(contador.calendario).toBeGreaterThanOrEqual(3))
  })

  it('refresca mientras una pieza está en «Confirmando…»', async () => {
    quieto()
    avanzarPieza('prog-6', 'fallida', { error: 'estado_desconocido' })
    contar()
    montar()
    await waitFor(() => expect(contador.calendario).toBeGreaterThanOrEqual(3))
  })

  it('refresca cuando hay una programada para dentro de menos de 10 minutos', async () => {
    quieto()
    const pieza = await crearProgramada({
      redId: 'red-ig',
      accion: 'programar',
      tipo: 'foto',
      medios: [foto],
      programadaPara: new Date(Date.now() + 6 * 60_000).toISOString(),
    })
    contar()
    montar(claveMes(pieza.fecha!))
    await waitFor(() => expect(contador.calendario).toBeGreaterThanOrEqual(3))
  })

  it('una programada lejana empieza a refrescar sola cuando se acerca su hora', async () => {
    quieto()
    refresco.ventanaMs = 1000
    const base = todasLasProgramadas().find((p) => p.id === 'prog-2')!
    const cuando = Date.now() + 1500
    contar(() => [{ ...base, estado: 'programada', fecha: new Date(cuando).toISOString() }])
    montar()
    await waitFor(() => expect(contador.calendario).toBe(1))
    await pausa(250)
    expect(contador.calendario).toBe(1)
    await waitFor(() => expect(contador.calendario).toBeGreaterThanOrEqual(3), { timeout: 3000 })
  })

  it('sin piezas por resolverse no hay pedidos de más', async () => {
    quieto()
    contar()
    montar()
    await waitFor(() => expect(contador.calendario).toBe(1))
    await pausa(300)
    expect(contador.calendario).toBe(1)
  })

  it('con la pestaña oculta no pide; al volver a verla refresca enseguida', async () => {
    quieto()
    avanzarPieza('prog-2', 'publicando')
    refresco.intervaloMs = 60_000
    visibilidad('hidden')
    contar()
    montar()
    await waitFor(() => expect(contador.calendario).toBe(1))
    document.dispatchEvent(new Event('visibilitychange'))
    await pausa(200)
    expect(contador.calendario).toBe(1)
    visibilidad('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    await waitFor(() => expect(contador.calendario).toBe(2))
  })

  it('con la bandera del front apagada no refresca ni pide redes', async () => {
    vi.stubEnv('VITE_PUBLICACION_HABILITADA', '')
    avanzarPieza('prog-2', 'publicando')
    contar()
    montar()
    await waitFor(() => expect(contador.calendario).toBe(1))
    await pausa(300)
    expect(contador.calendario).toBe(1)
    expect(contador.redes).toBe(0)
  })

  it('con el backend apagado (404 en /api/redes) no refresca', async () => {
    mockPublicacion.habilitada = false
    contar()
    montar()
    await waitFor(() => expect(contador.calendario).toBe(1))
    await pausa(300)
    expect(contador.calendario).toBe(1)
  })
})

describe('avisos', () => {
  /** Monta con una pieza publicándose y espera a que quede registrada como «lo último visto». */
  async function conPiezaPublicandose(abrir?: (p: Programada) => void) {
    quieto()
    avanzarPieza('prog-2', 'publicando')
    contar()
    const vista = montar('2026-11', abrir)
    await waitFor(() => expect(leerVistas()['prog-2']).toBe('publicando'))
    return vista
  }

  it('avisa una sola vez cuando se publica, aunque se siga refrescando', async () => {
    await conPiezaPublicandose()
    avanzarPieza('prog-2', 'publicada', { urlPublicada: 'https://instagram.com/p/x' })
    await waitFor(() => expect(toast).toHaveBeenCalledTimes(1))
    expect(vi.mocked(toast).mock.calls[0]![0]).toBe('Se publicó en Instagram')
    await pausa(300)
    expect(toast).toHaveBeenCalledTimes(1)
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('avisa el fallo con su motivo', async () => {
    await conPiezaPublicandose()
    avanzarPieza('prog-2', 'fallida', {
      error: 'Zernio rechazó la publicación; revisá el contenido',
    })
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1))
    expect(vi.mocked(toast.error).mock.calls[0]![0]).toBe('No se pudo publicar')
    expect(vi.mocked(toast.error).mock.calls[0]![1]).toMatchObject({
      description: expect.stringContaining('Zernio rechazó la publicación; revisá el contenido'),
    })
    expect(toast).not.toHaveBeenCalled()
  })

  it('«Confirmando…» no avisa nada', async () => {
    await conPiezaPublicandose()
    avanzarPieza('prog-2', 'fallida', { error: 'estado_desconocido' })
    await waitFor(() => expect(leerVistas()['prog-2']).toBe('confirmando'))
    await pausa(300)
    expect(toast).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('al abrir la app con piezas ya terminadas no avisa de ninguna', async () => {
    quieto()
    contar()
    montar()
    await waitFor(() => expect(leerVistas()['prog-4']).toBe('publicada'))
    await pausa(200)
    expect(toast).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('no se repite al desmontar y volver a montar en la misma sesión', async () => {
    const vista = await conPiezaPublicandose()
    avanzarPieza('prog-2', 'publicada')
    await waitFor(() => expect(toast).toHaveBeenCalledTimes(1))
    vista.unmount()
    montar()
    await waitFor(() => expect(contador.calendario).toBeGreaterThanOrEqual(2))
    await pausa(200)
    expect(toast).toHaveBeenCalledTimes(1)
  })

  it('avisa lo que cambió mientras se estaba en otra pantalla (lo último visto es pendiente)', async () => {
    const vista = await conPiezaPublicandose()
    vista.unmount()
    avanzarPieza('prog-2', 'publicada')
    montar()
    await waitFor(() => expect(toast).toHaveBeenCalledTimes(1))
  })

  it('la acción «Ver» abre la pieza', async () => {
    const abrir = vi.fn()
    await conPiezaPublicandose(abrir)
    avanzarPieza('prog-2', 'publicada')
    await waitFor(() => expect(toast).toHaveBeenCalledTimes(1))
    const opciones = vi.mocked(toast).mock.calls[0]![1] as unknown as {
      action: { onClick: () => void }
    }
    opciones.action.onClick()
    expect(abrir).toHaveBeenCalledWith(expect.objectContaining({ id: 'prog-2' }))
  })

  it('con sessionStorage roto avisa igual, una sola vez y sin romper', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    await conPiezaPublicandose()
    avanzarPieza('prog-2', 'publicada')
    await waitFor(() => expect(toast).toHaveBeenCalledTimes(1))
    await pausa(300)
    expect(toast).toHaveBeenCalledTimes(1)
  })

  it('con la bandera apagada no avisa aunque cambie una pieza', async () => {
    vi.stubEnv('VITE_PUBLICACION_HABILITADA', '')
    quieto()
    avanzarPieza('prog-2', 'publicando')
    contar()
    montar()
    await waitFor(() => expect(contador.calendario).toBe(1))
    avanzarPieza('prog-2', 'publicada')
    await pausa(300)
    expect(toast).not.toHaveBeenCalled()
  })
})
