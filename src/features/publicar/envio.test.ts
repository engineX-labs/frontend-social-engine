import { PRIVACIDAD_PUBLICA } from '@/domain/publicacion'
import type { Medio } from '@/domain/types'
import {
  armarCuerpo,
  esquemaValores,
  fechaHoraAUtc,
  utcAFechaHora,
  type ValoresPieza,
} from './envio'

const AHORA = Date.UTC(2026, 10, 17, 15, 0) // 12:00 en Buenos Aires
const foto: Medio = { url: 'https://mock.zernio.test/medios/a.jpg', tipo: 'imagen' }
const video: Medio = { url: 'https://mock.zernio.test/medios/a.mp4', tipo: 'video' }
const base = (extra: Partial<ValoresPieza> = {}): ValoresPieza => ({
  redId: 'red-ig',
  tipo: 'foto',
  texto: ' Hola ',
  fecha: '2026-11-20',
  hora: '20:00',
  medios: [foto],
  opciones: {},
  ...extra,
})
const opcionesTikTok = {
  privacyLevel: PRIVACIDAD_PUBLICA,
  allowComment: true,
  allowDuet: false,
  allowStitch: false,
  contentPreviewConfirmed: true,
  expressConsentGiven: true,
}

describe('fecha y hora en Buenos Aires', () => {
  it('pasa a UTC sumando 3 horas y vuelve igual', () => {
    expect(fechaHoraAUtc('2026-11-20', '20:00')).toBe('2026-11-20T23:00:00.000Z')
    expect(fechaHoraAUtc('2026-11-20', '22:30')).toBe('2026-11-21T01:30:00.000Z')
    expect(utcAFechaHora('2026-11-21T01:30:00.000Z')).toEqual({
      fecha: '2026-11-20',
      hora: '22:30',
    })
    expect(utcAFechaHora('2026-11-20T03:00:00.000Z')).toEqual({
      fecha: '2026-11-20',
      hora: '00:00',
    })
  })
})

describe('armarCuerpo · programar', () => {
  it('arma el cuerpo con la fecha en UTC y el texto sin espacios', () => {
    expect(armarCuerpo(base(), 'instagram', 'programar', AHORA)).toEqual({
      problemas: [],
      cuerpo: {
        redId: 'red-ig',
        accion: 'programar',
        tipo: 'foto',
        texto: 'Hola',
        medios: [foto],
        programadaPara: '2026-11-20T23:00:00.000Z',
      },
    })
  })

  it('pide la red, el tipo y la fecha', () => {
    expect(armarCuerpo(base({ redId: '' }), undefined, 'programar', AHORA).problemas).toEqual([
      'Elegí en qué red publicar',
    ])
    expect(armarCuerpo(base({ tipo: '' }), 'instagram', 'programar', AHORA).problemas).toEqual([
      'Elegí qué vas a publicar',
    ])
    expect(
      armarCuerpo(base({ fecha: '', hora: '' }), 'instagram', 'programar', AHORA).problemas,
    ).toEqual(['Elegí la fecha y la hora para programar'])
    expect(armarCuerpo(base({ hora: '' }), 'instagram', 'programar', AHORA).problemas).toEqual([
      'Completá la fecha y la hora, o dejá las dos vacías',
    ])
  })

  it('rechaza una fecha a menos de 5 minutos y acepta justo 5', () => {
    const ahoraBA = fechaHoraAUtc('2026-11-17', '12:00')
    expect(Date.parse(ahoraBA)).toBe(AHORA)
    expect(
      armarCuerpo(base({ fecha: '2026-11-17', hora: '12:04' }), 'instagram', 'programar', AHORA)
        .problemas,
    ).toEqual(['La fecha tiene que ser al menos 5 minutos en el futuro'])
    expect(
      armarCuerpo(base({ fecha: '2026-11-17', hora: '12:05' }), 'instagram', 'programar', AHORA)
        .problemas,
    ).toEqual([])
  })

  it('aplica las reglas de la pieza', () => {
    expect(
      armarCuerpo(base({ tipo: 'carrusel', medios: [foto] }), 'instagram', 'programar', AHORA)
        .problemas,
    ).toEqual(['El carrusel lleva de 2 a 20 medios'])
    expect(
      armarCuerpo(base({ texto: 'a'.repeat(2201) }), 'instagram', 'programar', AHORA).problemas,
    ).toEqual(['El texto supera los 2200 caracteres'])
  })

  it('una historia no manda texto aunque haya quedado escrito', () => {
    const r = armarCuerpo(
      base({ tipo: 'historia', texto: 'se ignora' }),
      'instagram',
      'programar',
      AHORA,
    )
    expect(r.problemas).toEqual([])
    expect(r.cuerpo?.texto).toBeNull()
  })

  it('un tipo de otra red es un problema', () => {
    expect(armarCuerpo(base({ tipo: 'video' }), 'instagram', 'programar', AHORA).problemas).toEqual(
      ['El tipo «video» no existe en instagram'],
    )
  })
})

describe('armarCuerpo · borrador y publicar ahora', () => {
  it('un borrador solo pide red y tipo: sin medios ni fecha', () => {
    const r = armarCuerpo(
      base({ medios: [], texto: '', fecha: '', hora: '' }),
      'instagram',
      'borrador',
      AHORA,
    )
    expect(r).toEqual({
      problemas: [],
      cuerpo: { redId: 'red-ig', accion: 'borrador', tipo: 'foto', texto: null, medios: [] },
    })
  })

  it('un borrador con fecha la manda; con la mitad de la fecha avisa', () => {
    expect(armarCuerpo(base(), 'instagram', 'borrador', AHORA).cuerpo?.programadaPara).toBe(
      '2026-11-20T23:00:00.000Z',
    )
    expect(armarCuerpo(base({ hora: '' }), 'instagram', 'borrador', AHORA).problemas).toEqual([
      'Completá la fecha y la hora, o dejá las dos vacías',
    ])
  })

  it('un borrador no valida la fecha pasada (se valida al programarlo)', () => {
    expect(
      armarCuerpo(base({ fecha: '2020-01-01', hora: '10:00' }), 'instagram', 'borrador', AHORA)
        .problemas,
    ).toEqual([])
  })

  it('publicar ahora valida la pieza y no manda fecha', () => {
    const r = armarCuerpo(base(), 'instagram', 'publicar_ahora', AHORA)
    expect(r.problemas).toEqual([])
    expect(r.cuerpo).not.toHaveProperty('programadaPara')
    expect(
      armarCuerpo(base({ medios: [] }), 'instagram', 'publicar_ahora', AHORA).problemas,
    ).toEqual(['La foto lleva exactamente 1 imagen'])
  })
})

describe('armarCuerpo · TikTok', () => {
  const tt = (extra: Partial<ValoresPieza> = {}) =>
    base({ redId: 'red-tt', tipo: 'video', medios: [video], opciones: opcionesTikTok, ...extra })

  it('manda las opciones de TikTok y no las de Instagram', () => {
    expect(armarCuerpo(tt(), 'tiktok', 'programar', AHORA).cuerpo?.opciones).toEqual(opcionesTikTok)
    expect(
      armarCuerpo(base({ opciones: opcionesTikTok }), 'instagram', 'programar', AHORA).cuerpo,
    ).not.toHaveProperty('opciones')
  })

  it('exige privacidad pública en video y el consentimiento', () => {
    expect(
      armarCuerpo(
        tt({ opciones: { ...opcionesTikTok, privacyLevel: 'SELF_ONLY' } }),
        'tiktok',
        'programar',
        AHORA,
      ).problemas,
    ).toEqual(['Los videos de TikTok tienen que ser públicos'])
    expect(
      armarCuerpo(
        tt({ opciones: { ...opcionesTikTok, expressConsentGiven: false } }),
        'tiktok',
        'publicar_ahora',
        AHORA,
      ).problemas,
    ).toEqual(['Falta el consentimiento expreso para publicar en TikTok'])
  })

  it('un borrador de TikTok no exige las opciones', () => {
    expect(
      armarCuerpo(tt({ opciones: {}, medios: [] }), 'tiktok', 'borrador', AHORA).problemas,
    ).toEqual([])
  })
})

describe('esquemaValores', () => {
  it('acepta el valor inicial vacío y marca fecha y hora mal formadas', () => {
    const ok = esquemaValores.safeParse(base({ fecha: '', hora: '', tipo: '' }))
    expect(ok.success).toBe(true)
    const mal = esquemaValores.safeParse(base({ fecha: '2026-02-31', hora: '25:00' }))
    expect(mal.success).toBe(false)
    expect(mal.error?.issues.map((i) => i.path[0]).sort()).toEqual(['fecha', 'hora'])
  })
})
