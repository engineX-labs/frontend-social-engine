import { validarCalendarioSearch } from './search'

describe('validarCalendarioSearch · ocultar', () => {
  it('acepta publicada, idea y programada', () => {
    expect(
      validarCalendarioSearch({ ocultar: ['publicada', 'idea', 'programada'] }).ocultar,
    ).toEqual(['publicada', 'idea', 'programada'])
  })
  it('descarta lo desconocido y deja lo válido', () => {
    expect(validarCalendarioSearch({ ocultar: ['programada', 'otra', 3, null] }).ocultar).toEqual([
      'programada',
    ])
  })
  it('sin valores válidos no hay `ocultar`', () => {
    expect(validarCalendarioSearch({ ocultar: ['otra'] }).ocultar).toBeUndefined()
    expect(validarCalendarioSearch({ ocultar: 'idea' }).ocultar).toBeUndefined()
    expect(validarCalendarioSearch({}).ocultar).toBeUndefined()
  })
})
