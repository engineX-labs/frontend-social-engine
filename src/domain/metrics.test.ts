import { aUtcDesdeBA } from '@/lib/fecha'
import { calcularResumen, claseRendimiento, conRendimiento, esNoche, mediana } from './metrics'
import type { Publicada } from './types'

const pub = (id: string, h: number, alcance: number, formato: Publicada['formato'] = 'Foto') =>
  ({
    tipo: 'publicada',
    id,
    red: 'instagram',
    fecha: aUtcDesdeBA(2026, 11, 5, h, 0),
    formato,
    copy: '',
    portadaUrl: null,
    alcance,
    interacciones: 0,
    analisis: '',
  }) satisfies Publicada

describe('mediana', () => {
  it('devuelve 0 sin datos', () => expect(mediana([])).toBe(0))
  it('toma el valor central en cantidad impar', () => expect(mediana([5, 1, 3])).toBe(3))
  it('promedia los dos centrales en cantidad par', () => expect(mediana([1, 2, 3, 10])).toBe(2.5))
  it('no se distorsiona por un pico', () => expect(mediana([100, 110, 120, 9000])).toBe(115))
})

describe('esNoche', () => {
  it('cubre de 18 a 21:59', () => {
    expect(esNoche(17)).toBe(false)
    expect(esNoche(18)).toBe(true)
    expect(esNoche(21)).toBe(true)
    expect(esNoche(22)).toBe(false)
  })
})

describe('claseRendimiento', () => {
  it('clasifica contra la mediana', () => {
    expect(claseRendimiento(1.3)).toBe('sube')
    expect(claseRendimiento(1)).toBe('normal')
    expect(claseRendimiento(0.69)).toBe('baja')
  })
})

describe('calcularResumen', () => {
  const pubs = [pub('a', 20, 1100, 'Reel'), pub('b', 10, 400), pub('c', 19, 800, 'Reel')]
  it('calcula mediana, mejor hora (hora BA) y franja', () => {
    const r = calcularResumen(pubs)
    expect(r.medianaAlcance).toBe(800)
    expect(r.mejorHora).toBe(20)
    expect(r.medianaNoche).toBe(950)
    expect(r.medianaResto).toBe(400)
    expect(r.medianaPorFormato.Reel).toBe(950)
  })
  it('agrega razón y puesto', () => {
    const r = calcularResumen(pubs)
    const [a, b] = conRendimiento(pubs, r)
    expect(a?.puesto).toBe(1)
    expect(a?.clase).toBe('sube')
    expect(b?.clase).toBe('baja')
  })
})
