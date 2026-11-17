import { esErrorDeAcceso, mensajeDeApi } from './errores'
import { ApiError } from './http'

describe('esErrorDeAcceso', () => {
  it('es verdadero solo para 401 y 403', () => {
    expect(esErrorDeAcceso(new ApiError(401, 'x'))).toBe(true)
    expect(esErrorDeAcceso(new ApiError(403, 'x'))).toBe(true)
    expect(esErrorDeAcceso(new ApiError(500, 'x'))).toBe(false)
    expect(esErrorDeAcceso(new TypeError('red'))).toBe(false)
    expect(esErrorDeAcceso(null)).toBe(false)
  })
})

describe('mensajeDeApi', () => {
  it('explica el 401 y el 403', () => {
    expect(mensajeDeApi(new ApiError(401, 'Sesión inválida o vencida'), 'defecto')).toMatch(
      /sesión/i,
    )
    expect(mensajeDeApi(new ApiError(403, 'x'), 'defecto')).toBe(
      'Tu usuario todavía no tiene un comercio asignado.',
    )
  })

  it('para el resto usa el mensaje por defecto', () => {
    expect(mensajeDeApi(new ApiError(500, 'caído'), 'defecto')).toBe('defecto')
    expect(mensajeDeApi(new TypeError('red'), 'defecto')).toBe('defecto')
  })
})
