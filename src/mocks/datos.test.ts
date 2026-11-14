import { IDEAS, PUBLICADAS, semanasDeDesplazo } from './datos'

describe('datos de ejemplo', () => {
  it('en tests quedan fijos en noviembre de 2026', () => {
    expect(PUBLICADAS[0]?.fecha).toBe('2026-11-05T23:04:00.000Z')
    expect(IDEAS[0]?.fecha).toBe('2026-11-17T22:00:00.000Z')
  })
  it('en el demo se corren semanas enteras hasta la fecha actual', () => {
    const base = Date.UTC(2026, 10, 14, 15)
    const dia = 24 * 60 * 60 * 1000
    expect(semanasDeDesplazo(base, false)).toBe(0)
    expect(semanasDeDesplazo(base + 3 * dia, false)).toBe(0)
    expect(semanasDeDesplazo(base + 4 * dia, false)).toBe(1)
    expect(semanasDeDesplazo(base + 70 * dia, false)).toBe(10)
    expect(semanasDeDesplazo(base - 14 * dia, false)).toBe(-2)
    expect(semanasDeDesplazo(base + 70 * dia, true)).toBe(0)
  })
})
