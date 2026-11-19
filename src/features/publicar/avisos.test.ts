import { toast } from 'sonner'
import type { Programada } from '@/domain/types'
import {
  detectarAvisos,
  guardarVistas,
  leerVistas,
  MAX_INDIVIDUALES,
  mostrarAvisos,
  olvidarVistas,
  textoDeAviso,
  type Vistas,
} from './avisos'

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }))

const pieza = (id: string, extra: Partial<Programada> = {}): Programada => ({
  tipo: 'programada',
  id,
  red: 'instagram',
  redId: 'red-ig',
  estado: 'programada',
  formato: 'reel',
  texto: null,
  medios: [],
  fecha: '2026-11-20T23:00:00.000Z',
  error: null,
  urlPublicada: null,
  itemId: null,
  ...extra,
})

beforeEach(() => {
  olvidarVistas()
  vi.mocked(toast).mockClear()
  vi.mocked(toast.error).mockClear()
})
afterEach(() => vi.restoreAllMocks())

describe('detectarAvisos', () => {
  it('lo que ya estaba terminado al abrir no avisa', () => {
    const r = detectarAvisos({}, [
      pieza('a', { estado: 'publicada' }),
      pieza('b', { estado: 'fallida', error: 'Zernio rechazó' }),
    ])
    expect(r.avisos).toEqual([])
    expect(r.vistas).toEqual({ a: 'publicada', b: 'fallida' })
  })

  it('avisa una vez al pasar de publicando a publicada, y no al volver a verla', () => {
    const primera = detectarAvisos({}, [pieza('a', { estado: 'publicando' })])
    expect(primera.avisos).toEqual([])
    const segunda = detectarAvisos(primera.vistas, [pieza('a', { estado: 'publicada' })])
    expect(segunda.avisos.map((x) => [x.pieza.id, x.resultado])).toEqual([['a', 'publicada']])
    const tercera = detectarAvisos(segunda.vistas, [pieza('a', { estado: 'publicada' })])
    expect(tercera.avisos).toEqual([])
  })

  it('avisa el fallo con su pieza, y «No se publicó» como un resultado aparte', () => {
    const previas: Vistas = { a: 'publicando', b: 'confirmando', c: 'programada' }
    const r = detectarAvisos(previas, [
      pieza('a', { estado: 'fallida', error: 'Zernio rechazó la publicación' }),
      pieza('b', { estado: 'fallida', error: 'No se publicó' }),
      pieza('c', { estado: 'publicada' }),
    ])
    expect(r.avisos.map((x) => [x.pieza.id, x.resultado])).toEqual([
      ['a', 'fallida'],
      ['b', 'no-se-publico'],
      ['c', 'publicada'],
    ])
  })

  it('«Confirmando…» no es un resultado: ni al llegar a ese estado ni al seguir en él', () => {
    const a = detectarAvisos({ a: 'publicando' }, [
      pieza('a', { estado: 'fallida', error: 'estado_desconocido' }),
    ])
    expect(a.avisos).toEqual([])
    const b = detectarAvisos(a.vistas, [
      pieza('a', { estado: 'fallida', error: 'estado_desconocido' }),
    ])
    expect(b.avisos).toEqual([])
    const c = detectarAvisos(b.vistas, [pieza('a', { estado: 'publicada' })])
    expect(c.avisos).toHaveLength(1)
  })

  it('un reintento que vuelve a fallar avisa otra vez; un borrador o una cancelada no avisan', () => {
    const f1 = detectarAvisos({ a: 'publicando' }, [pieza('a', { estado: 'fallida', error: 'x' })])
    expect(f1.avisos).toHaveLength(1)
    const reintento = detectarAvisos(f1.vistas, [pieza('a', { estado: 'publicando' })])
    expect(reintento.avisos).toEqual([])
    const f2 = detectarAvisos(reintento.vistas, [pieza('a', { estado: 'fallida', error: 'x' })])
    expect(f2.avisos).toHaveLength(1)
    const otras = detectarAvisos({ b: 'programada', c: 'programada' }, [
      pieza('b', { estado: 'cancelada' }),
      pieza('c', { estado: 'borrador', fecha: null }),
    ])
    expect(otras.avisos).toEqual([])
  })

  it('no toca lo que no vino y no pasa de 300 recordadas', () => {
    expect(detectarAvisos({ z: 'publicada' }, []).vistas).toEqual({ z: 'publicada' })
    const muchas = Object.fromEntries(
      Array.from({ length: 400 }, (_, i) => [`x${i}`, 'publicada' as const]),
    )
    const { vistas } = detectarAvisos(muchas, [pieza('nueva')])
    expect(Object.keys(vistas)).toHaveLength(300)
    expect(vistas.nueva).toBe('programada')
    expect(vistas.x0).toBeUndefined()
  })
})

describe('textoDeAviso', () => {
  it('dice la red, el formato y el motivo', () => {
    expect(textoDeAviso({ pieza: pieza('a'), resultado: 'publicada' })).toEqual({
      titulo: 'Se publicó en Instagram',
      descripcion: 'Reel en Instagram del viernes 20 de noviembre a las 20:00.',
    })
    const tt = pieza('b', {
      red: 'tiktok',
      formato: 'video',
      error: 'Zernio rechazó la publicación',
    })
    expect(textoDeAviso({ pieza: tt, resultado: 'fallida' })).toEqual({
      titulo: 'No se pudo publicar',
      descripcion:
        'Video en TikTok del viernes 20 de noviembre a las 20:00: Zernio rechazó la publicación.',
    })
    expect(textoDeAviso({ pieza: pieza('c'), resultado: 'no-se-publico' }).titulo).toBe(
      'No se publicó',
    )
  })
})

describe('mostrarAvisos', () => {
  const aviso = (id: string, resultado: 'publicada' | 'fallida') => ({
    pieza: pieza(id),
    resultado,
  })

  it('un aviso por pieza, con su acción «Ver» que abre esa pieza', () => {
    const abrir = vi.fn()
    mostrarAvisos([aviso('a', 'publicada'), aviso('b', 'fallida')], abrir)
    expect(toast).toHaveBeenCalledTimes(1)
    expect(toast.error).toHaveBeenCalledTimes(1)
    const opciones = vi.mocked(toast).mock.calls[0]![1] as unknown as {
      id: string
      action: { label: string; onClick: () => void }
    }
    expect(opciones.id).toBe('publicar-a-publicada')
    expect(opciones.action.label).toBe('Ver')
    opciones.action.onClick()
    expect(abrir).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }))
  })

  it('más de 3 del mismo resultado se agrupan en uno solo', () => {
    const abrir = vi.fn()
    const muchas = Array.from({ length: MAX_INDIVIDUALES + 1 }, (_, i) =>
      aviso(`p${i}`, 'publicada'),
    )
    mostrarAvisos([...muchas, aviso('x', 'fallida')], abrir)
    expect(toast).toHaveBeenCalledTimes(1)
    expect(vi.mocked(toast).mock.calls[0]![0]).toBe('Se publicaron 4 piezas')
    expect(toast.error).toHaveBeenCalledTimes(1)
    const opciones = vi.mocked(toast).mock.calls[0]![1] as unknown as {
      action: { onClick: () => void }
    }
    opciones.action.onClick()
    expect(abrir).toHaveBeenCalledWith(expect.objectContaining({ id: 'p0' }))
  })

  it('exactamente 3 siguen siendo individuales', () => {
    mostrarAvisos(
      Array.from({ length: 3 }, (_, i) => aviso(`p${i}`, 'fallida')),
      vi.fn(),
    )
    expect(toast.error).toHaveBeenCalledTimes(3)
  })
})

describe('memoria de la sesión', () => {
  it('guarda en sessionStorage y lo lee de vuelta', () => {
    guardarVistas({ a: 'publicando' })
    expect(JSON.parse(sessionStorage.getItem('social-engine.publicacion.vistas')!)).toEqual({
      a: 'publicando',
    })
    expect(leerVistas()).toEqual({ a: 'publicando' })
  })

  it('un contenido ilegible en sessionStorage no rompe: se usa lo de memoria', () => {
    guardarVistas({ a: 'publicando' })
    sessionStorage.setItem('social-engine.publicacion.vistas', '{no es json')
    expect(leerVistas()).toEqual({ a: 'publicando' })
    sessionStorage.setItem('social-engine.publicacion.vistas', '[1,2]')
    expect(leerVistas()).toEqual({ a: 'publicando' })
  })

  it('sin sessionStorage (lanza) sigue funcionando en memoria y no avisa de más', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    expect(() => guardarVistas({ a: 'publicando' })).not.toThrow()
    expect(leerVistas()).toEqual({ a: 'publicando' })
    expect(() => olvidarVistas()).not.toThrow()
  })
})
