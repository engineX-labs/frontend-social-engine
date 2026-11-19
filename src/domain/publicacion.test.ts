import {
  MAX_ANTICIPACION_MS,
  MIN_ANTICIPACION_MS,
  PRIVACIDAD_PUBLICA,
  situacionDe,
  validarFecha,
  validarPieza,
} from './publicacion'
import type { OpcionesTikTok } from './types'

const img = { tipo: 'imagen' as const }
const vid = { tipo: 'video' as const }
const veces = <T>(n: number, x: T) => Array.from({ length: n }, () => x)

const tiktokOk: OpcionesTikTok = {
  privacyLevel: PRIVACIDAD_PUBLICA,
  allowComment: true,
  allowDuet: false,
  allowStitch: false,
  contentPreviewConfirmed: true,
  expressConsentGiven: true,
}

describe('validarPieza · Instagram', () => {
  const ig = (
    tipo: Parameters<typeof validarPieza>[0]['tipo'],
    medios: { tipo: 'imagen' | 'video' }[],
    texto?: string,
  ) => validarPieza({ red: 'instagram', tipo, texto, medios })

  it('acepta una pieza de cada tipo bien armada', () => {
    expect(ig('foto', [img], 'hola')).toEqual([])
    expect(ig('carrusel', [img, vid], 'hola')).toEqual([])
    expect(ig('reel', [vid], 'hola')).toEqual([])
    expect(ig('historia', [img])).toEqual([])
    expect(ig('historia', [vid])).toEqual([])
  })

  it('la historia no lleva texto y lleva exactamente 1 medio', () => {
    expect(ig('historia', [img], 'hola')).toEqual(['Las historias no llevan texto'])
    expect(ig('historia', [img, img])).toEqual(['La historia lleva exactamente 1 medio'])
    expect(ig('historia', [])).toEqual(['La historia lleva exactamente 1 medio'])
  })

  it('el carrusel lleva de 2 a 20 medios (los extremos valen)', () => {
    expect(ig('carrusel', [img])).toEqual(['El carrusel lleva de 2 a 20 medios'])
    expect(ig('carrusel', veces(2, img))).toEqual([])
    expect(ig('carrusel', veces(20, img))).toEqual([])
    expect(ig('carrusel', veces(21, img))).toEqual(['El carrusel lleva de 2 a 20 medios'])
  })

  it('el reel lleva 1 video y la foto 1 imagen', () => {
    expect(ig('reel', [img])).toEqual(['El reel lleva exactamente 1 video'])
    expect(ig('reel', [vid, vid])).toEqual(['El reel lleva exactamente 1 video'])
    expect(ig('foto', [vid])).toEqual(['La foto lleva exactamente 1 imagen'])
    expect(ig('foto', [img, img])).toEqual(['La foto lleva exactamente 1 imagen'])
  })

  it('el texto llega hasta 2.200 caracteres', () => {
    expect(ig('foto', [img], 'a'.repeat(2200))).toEqual([])
    expect(ig('foto', [img], 'a'.repeat(2201))).toEqual(['El texto supera los 2200 caracteres'])
  })

  it('un tipo de TikTok no existe en Instagram', () => {
    expect(ig('video', [vid])).toEqual(['El tipo «video» no existe en instagram'])
  })

  it('junta varios problemas', () => {
    expect(ig('historia', [img, img], 'hola')).toEqual([
      'La historia lleva exactamente 1 medio',
      'Las historias no llevan texto',
    ])
  })
})

describe('validarPieza · TikTok', () => {
  const tt = (
    tipo: 'video' | 'fotos',
    medios: { tipo: 'imagen' | 'video' }[],
    opciones: OpcionesTikTok | null = tiktokOk,
    texto?: string,
  ) => validarPieza({ red: 'tiktok', tipo, texto, medios, opciones })

  it('acepta un video público y fotos', () => {
    expect(tt('video', [vid])).toEqual([])
    expect(tt('fotos', [img], { ...tiktokOk, privacyLevel: 'SELF_ONLY' })).toEqual([])
  })

  it('las fotos llevan de 1 a 35 imágenes y sin video', () => {
    expect(tt('fotos', [])).toEqual(['Las fotos de TikTok llevan de 1 a 35 imágenes, sin video'])
    expect(tt('fotos', veces(35, img))).toEqual([])
    expect(tt('fotos', veces(36, img))).toEqual([
      'Las fotos de TikTok llevan de 1 a 35 imágenes, sin video',
    ])
    expect(tt('fotos', [img, vid])).toEqual([
      'Las fotos de TikTok llevan de 1 a 35 imágenes, sin video',
    ])
  })

  it('un video de TikTok tiene que ser público', () => {
    expect(tt('video', [vid], { ...tiktokOk, privacyLevel: 'SELF_ONLY' })).toEqual([
      'Los videos de TikTok tienen que ser públicos',
    ])
  })

  it('sin opciones faltan todas las obligatorias', () => {
    expect(tt('video', [vid], null)).toEqual([
      'Falta elegir la privacidad en TikTok',
      'Falta indicar si se permiten comentarios',
      'Falta indicar si se permiten dúos',
      'Falta indicar si se permiten stitch',
      'Falta confirmar la vista previa del contenido',
      'Falta el consentimiento expreso para publicar en TikTok',
    ])
  })

  it('en fotos no se piden dúos ni stitch', () => {
    expect(
      tt('fotos', [img], { ...tiktokOk, allowDuet: undefined, allowStitch: undefined }),
    ).toEqual([])
  })

  it('el consentimiento y la vista previa tienen que estar en true', () => {
    expect(tt('video', [vid], { ...tiktokOk, expressConsentGiven: false })).toEqual([
      'Falta el consentimiento expreso para publicar en TikTok',
    ])
    expect(tt('video', [vid], { ...tiktokOk, contentPreviewConfirmed: false })).toEqual([
      'Falta confirmar la vista previa del contenido',
    ])
  })

  it('la descripción de fotos llega hasta 4.000 caracteres y la de un video hasta 2.200', () => {
    expect(tt('fotos', [img], tiktokOk, 'a'.repeat(4000))).toEqual([])
    expect(tt('fotos', [img], tiktokOk, 'a'.repeat(4001))).toEqual([
      'El texto supera los 4000 caracteres',
    ])
    expect(tt('video', [vid], tiktokOk, 'a'.repeat(2201))).toEqual([
      'El texto supera los 2200 caracteres',
    ])
  })
})

describe('validarFecha', () => {
  const ahora = Date.UTC(2026, 10, 17, 15)
  it('exactamente 5 minutos y exactamente 180 días valen', () => {
    expect(validarFecha(new Date(ahora + MIN_ANTICIPACION_MS), ahora)).toBeNull()
    expect(validarFecha(new Date(ahora + MAX_ANTICIPACION_MS), ahora)).toBeNull()
  })
  it('antes de 5 minutos, en el pasado o pasados los 180 días no vale', () => {
    expect(validarFecha(new Date(ahora + MIN_ANTICIPACION_MS - 1), ahora)).toBe(
      'La fecha tiene que ser al menos 5 minutos en el futuro',
    )
    expect(validarFecha(new Date(ahora - 1000), ahora)).toBe(
      'La fecha tiene que ser al menos 5 minutos en el futuro',
    )
    expect(validarFecha(new Date(ahora + MAX_ANTICIPACION_MS + 1), ahora)).toBe(
      'La fecha no puede superar los 180 días',
    )
  })
  it('una fecha ilegible no vale', () => {
    expect(validarFecha('no-es-una-fecha', ahora)).toBe('La fecha no es válida')
  })
})

describe('situacionDe', () => {
  it('separa «Confirmando…» y «No se publicó» de una fallida común', () => {
    expect(situacionDe({ estado: 'fallida', error: 'estado_desconocido' })).toBe('confirmando')
    expect(situacionDe({ estado: 'fallida', error: 'No se publicó' })).toBe('no-se-publico')
    expect(situacionDe({ estado: 'fallida', error: 'Zernio rechazó la publicación' })).toBe(
      'fallida',
    )
    expect(situacionDe({ estado: 'programada', error: null })).toBe('programada')
  })
})
