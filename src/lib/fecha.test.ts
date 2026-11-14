import { aUtcDesdeBA, claveDia, desplazarMes, diasDeGrilla, hora, nombreMes } from './fecha'

describe('fecha (hora de Buenos Aires)', () => {
  it('convierte entre UTC y BA', () => {
    const iso = aUtcDesdeBA(2026, 11, 14, 20, 0)
    expect(iso).toBe('2026-11-14T23:00:00.000Z')
    expect(hora(iso)).toBe('20:00')
  })
  it('el día depende de BA, no de UTC', () => {
    expect(claveDia('2026-11-15T01:30:00Z')).toBe('2026-11-14')
  })
  it('nombra el mes y lo desplaza', () => {
    expect(nombreMes('2026-11')).toBe('Noviembre 2026')
    expect(desplazarMes('2026-12', 1)).toBe('2027-01')
    expect(desplazarMes('2026-01', -1)).toBe('2025-12')
  })
  it('arma la grilla de lunes a domingo', () => {
    const g = diasDeGrilla('2026-11')
    expect(g[0]).toBe('2026-10-26')
    expect(g.length % 7).toBe(0)
    expect(g).toContain('2026-11-30')
  })
})
