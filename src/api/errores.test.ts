import { esErrorDeAcceso, mensajeDeApi, mensajeDePublicar, tipoDeConflicto } from './errores'
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

describe('tipoDeConflicto', () => {
  it('reconoce cada 409 por su texto', () => {
    expect(
      tipoDeConflicto(new ApiError(409, 'Hay que reconectar la red con permiso para publicar')),
    ).toBe('reconectar')
    expect(
      tipoDeConflicto(
        new ApiError(409, 'La red no tiene permiso para publicar; volvé a conectarla'),
      ),
    ).toBe('reconectar')
    expect(
      tipoDeConflicto(new ApiError(409, 'Se está procesando, probá de nuevo en unos segundos')),
    ).toBe('procesando')
    expect(tipoDeConflicto(new ApiError(409, 'Id en uso'))).toBe('id_en_uso')
    expect(
      tipoDeConflicto(new ApiError(409, 'No se puede programar una pieza en estado publicada')),
    ).toBe('estado')
  })

  it('el código del backend manda sobre el texto', () => {
    expect(tipoDeConflicto(new ApiError(409, 'texto raro', { codigo: 'procesando' }))).toBe(
      'procesando',
    )
  })

  it('solo mira los 409', () => {
    expect(tipoDeConflicto(new ApiError(422, 'Id en uso'))).toBeNull()
    expect(tipoDeConflicto(new TypeError('red'))).toBeNull()
  })
})

describe('mensajeDePublicar', () => {
  it('un 422 muestra el primer problema', () => {
    const e = new ApiError(422, 'Pedido inválido', {
      problemas: ['Las historias no llevan texto', 'x'],
    })
    expect(mensajeDePublicar(e, 'defecto')).toBe('Las historias no llevan texto')
  })
  it('explica reconectar, procesando y el 503 sin dar detalles de Zernio', () => {
    expect(
      mensajeDePublicar(
        new ApiError(409, 'Hay que reconectar la red con permiso para publicar'),
        'd',
      ),
    ).toMatch(/reconectar/i)
    expect(mensajeDePublicar(new ApiError(409, 'Se está procesando, probá de nuevo'), 'd')).toMatch(
      /procesando/i,
    )
    expect(mensajeDePublicar(new ApiError(503, 'No se pudo publicar ahora; avisanos'), 'd')).toBe(
      'No se pudo publicar ahora. Probá de nuevo en un rato.',
    )
  })
  it('un 409 de estado muestra el mensaje del backend y el resto cae en el de acceso o el defecto', () => {
    expect(
      mensajeDePublicar(
        new ApiError(409, 'No se puede cancelar una pieza en estado publicada'),
        'd',
      ),
    ).toBe('No se puede cancelar una pieza en estado publicada')
    expect(mensajeDePublicar(new ApiError(403, 'x'), 'd')).toBe(
      'Tu usuario todavía no tiene un comercio asignado.',
    )
    expect(mensajeDePublicar(new TypeError('red'), 'defecto')).toBe('defecto')
  })
})
