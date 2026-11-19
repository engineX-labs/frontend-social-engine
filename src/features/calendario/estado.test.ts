import type { SituacionProgramada } from '@/domain/publicacion'
import { ESTADO, notaDeEstado, textoDeEstado } from './estado'

const TODAS: SituacionProgramada[] = [
  'borrador',
  'programada',
  'publicando',
  'confirmando',
  'fallida',
  'no-se-publico',
  'publicada',
  'cancelada',
]

describe('ESTADO', () => {
  it('cada situación tiene texto propio y un ícono con forma propia (no se distingue solo por color)', () => {
    expect(new Set(TODAS.map((s) => ESTADO[s].texto)).size).toBe(TODAS.length)
    expect(new Set(TODAS.map((s) => ESTADO[s].Icono)).size).toBe(TODAS.length)
  })
  it('los nombres accesibles van en minúscula', () => {
    expect(textoDeEstado('confirmando')).toBe('confirmando…')
    expect(textoDeEstado('no-se-publico')).toBe('no se publicó')
  })
  it('solo los fallos marcan el borde', () => {
    for (const s of TODAS)
      expect(ESTADO[s].borde === 'border-danger').toBe(s === 'fallida' || s === 'no-se-publico')
  })
})

describe('notaDeEstado', () => {
  it('explica los estados que no son obvios y muestra el motivo de un fallo', () => {
    expect(notaDeEstado(null, 'confirmando')).toMatch(/confirmando si se publicó/)
    expect(notaDeEstado('No se publicó', 'no-se-publico')).toMatch(/crearla de nuevo/)
    expect(notaDeEstado('Zernio rechazó la publicación', 'fallida')).toBe(
      'Zernio rechazó la publicación',
    )
    expect(notaDeEstado(null, 'fallida')).toBe('Falló la publicación.')
  })
  it('los estados normales no llevan nota', () => {
    for (const s of ['borrador', 'programada', 'publicando', 'publicada'] as const)
      expect(notaDeEstado(null, s)).toBeNull()
  })
})
