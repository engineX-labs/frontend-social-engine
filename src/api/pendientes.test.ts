import type { Programada } from '@/domain/types'
import { estaPendiente, hayPendientes, proximoDespertar, refresco } from './pendientes'

const AHORA = Date.UTC(2026, 10, 18, 15, 0)
const MIN = 60_000
const pieza = (extra: Partial<Programada> = {}): Programada => ({
  tipo: 'programada',
  id: 'p',
  red: 'instagram',
  redId: 'red-ig',
  estado: 'programada',
  formato: 'foto',
  texto: null,
  medios: [],
  fecha: new Date(AHORA + 2 * 60 * MIN).toISOString(),
  error: null,
  urlPublicada: null,
  itemId: null,
  ...extra,
})

describe('estaPendiente', () => {
  it('publicando y «Confirmando…» están pendientes, con la fecha que tengan', () => {
    expect(estaPendiente(pieza({ estado: 'publicando' }), AHORA)).toBe(true)
    expect(estaPendiente(pieza({ estado: 'fallida', error: 'estado_desconocido' }), AHORA)).toBe(
      true,
    )
  })

  it('una programada lejana no; a 10 minutos justos o menos, o vencida, sí', () => {
    expect(estaPendiente(pieza(), AHORA)).toBe(false)
    expect(
      estaPendiente(pieza({ fecha: new Date(AHORA + 10 * MIN + 1).toISOString() }), AHORA),
    ).toBe(false)
    expect(estaPendiente(pieza({ fecha: new Date(AHORA + 10 * MIN).toISOString() }), AHORA)).toBe(
      true,
    )
    expect(estaPendiente(pieza({ fecha: new Date(AHORA - 5 * MIN).toISOString() }), AHORA)).toBe(
      true,
    )
  })

  it('lo que ya terminó o no corre no está pendiente', () => {
    expect(estaPendiente(pieza({ estado: 'publicada' }), AHORA)).toBe(false)
    expect(estaPendiente(pieza({ estado: 'fallida', error: 'Zernio rechazó' }), AHORA)).toBe(false)
    expect(estaPendiente(pieza({ estado: 'fallida', error: 'No se publicó' }), AHORA)).toBe(false)
    expect(estaPendiente(pieza({ estado: 'cancelada' }), AHORA)).toBe(false)
    expect(estaPendiente(pieza({ estado: 'borrador', fecha: null }), AHORA)).toBe(false)
    expect(
      estaPendiente(pieza({ estado: 'borrador', fecha: new Date(AHORA).toISOString() }), AHORA),
    ).toBe(false)
  })

  it('la ventana se puede acortar para probar', () => {
    const p = pieza({ fecha: new Date(AHORA + 3 * MIN).toISOString() })
    expect(estaPendiente(p, AHORA, 2 * MIN)).toBe(false)
    expect(estaPendiente(p, AHORA, 3 * MIN)).toBe(true)
  })
})

describe('hayPendientes', () => {
  it('es verdadero si alguna lo está', () => {
    expect(hayPendientes([], AHORA)).toBe(false)
    expect(hayPendientes([pieza(), pieza({ estado: 'publicada' })], AHORA)).toBe(false)
    expect(hayPendientes([pieza(), pieza({ estado: 'publicando' })], AHORA)).toBe(true)
  })
})

describe('proximoDespertar', () => {
  it('es el momento en que la primera programada lejana entra en la ventana', () => {
    const a = pieza({ fecha: new Date(AHORA + 60 * MIN).toISOString() })
    const b = pieza({ id: 'q', fecha: new Date(AHORA + 30 * MIN).toISOString() })
    expect(proximoDespertar([a, b], AHORA)).toBe(AHORA + 20 * MIN)
  })

  it('no cuenta lo que ya está cerca, lo que no es programada ni lo que no tiene fecha', () => {
    expect(
      proximoDespertar([pieza({ fecha: new Date(AHORA + 5 * MIN).toISOString() })], AHORA),
    ).toBeNull()
    expect(proximoDespertar([pieza({ estado: 'publicando' })], AHORA)).toBeNull()
    expect(proximoDespertar([pieza({ estado: 'borrador', fecha: null })], AHORA)).toBeNull()
    expect(proximoDespertar([], AHORA)).toBeNull()
  })
})

describe('refresco', () => {
  it('por defecto refresca cada 30 s y mira 10 minutos hacia adelante', () => {
    expect(refresco.intervaloMs).toBe(30_000)
    expect(refresco.ventanaMs).toBe(10 * MIN)
  })
})
