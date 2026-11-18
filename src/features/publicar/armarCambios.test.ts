import { PRIVACIDAD_PUBLICA } from '@/domain/publicacion'
import type { Medio, Programada } from '@/domain/types'
import { armarCambios, valoresDePieza, type ValoresPieza } from './envio'

const AHORA = Date.UTC(2026, 10, 17, 15, 0) // 12:00 en Buenos Aires
const foto: Medio = { url: 'https://mock.zernio.test/medios/a.jpg', tipo: 'imagen' }
const video: Medio = { url: 'https://mock.zernio.test/medios/a.mp4', tipo: 'video' }
const opcionesTikTok = {
  privacyLevel: PRIVACIDAD_PUBLICA,
  allowComment: true,
  allowDuet: false,
  allowStitch: false,
  contentPreviewConfirmed: true,
  expressConsentGiven: true,
}

const programada: Programada = {
  tipo: 'programada',
  id: 'p1',
  red: 'instagram',
  redId: 'red-ig',
  estado: 'programada',
  formato: 'foto',
  texto: 'Hola',
  medios: [foto],
  fecha: '2026-11-20T23:00:42.123Z',
  error: null,
  urlPublicada: null,
  itemId: null,
}
const borrador: Programada = { ...programada, estado: 'borrador', fecha: null }
const inicial = valoresDePieza(programada)
const cambiar = (extra: Partial<ValoresPieza>): ValoresPieza => ({ ...inicial, ...extra })
const editar = (
  v: ValoresPieza,
  accion: Parameters<typeof armarCambios>[4] = 'guardar',
  pieza = programada,
  base = inicial,
) => armarCambios(v, base, pieza, pieza.red, accion, AHORA)

describe('valoresDePieza', () => {
  it('pasa la fecha a hora de Buenos Aires y deja vacío lo que no hay', () => {
    expect(inicial).toMatchObject({
      fecha: '2026-11-20',
      hora: '20:00',
      texto: 'Hola',
      tipo: 'foto',
    })
    expect(valoresDePieza(borrador)).toMatchObject({ fecha: '', hora: '' })
    expect(valoresDePieza({ ...borrador, texto: null }).texto).toBe('')
  })
})

describe('armarCambios', () => {
  it('sin tocar nada no hay cambios, aunque la fecha tenga segundos', () => {
    expect(editar(inicial)).toEqual({ cambios: {}, problemas: [], sinCambios: true })
  })

  it('manda solo lo que cambió; reprogramar es `guardar` con otra fecha', () => {
    expect(editar(cambiar({ texto: 'Chau' })).cambios).toEqual({ texto: 'Chau' })
    expect(editar(cambiar({ fecha: '2026-11-25', hora: '10:30' })).cambios).toEqual({
      programadaPara: '2026-11-25T13:30:00.000Z',
    })
  })

  it('vaciar el texto manda null; los archivos tienen que respetar el tipo', () => {
    expect(editar(cambiar({ texto: '' })).cambios).toEqual({ texto: null })
    expect(editar(cambiar({ medios: [video] })).problemas).toEqual([
      'La foto lleva exactamente 1 imagen',
    ])
  })

  it('guardar una programada pide la pieza completa y una fecha válida', () => {
    expect(editar(cambiar({ fecha: '2026-11-17', hora: '12:02' })).problemas).toEqual([
      'La fecha tiene que ser al menos 5 minutos en el futuro',
    ])
    expect(editar(cambiar({ fecha: '', hora: '' })).problemas).toEqual([
      'Elegí la fecha y la hora para programar',
    ])
  })

  it('guardar un borrador casi no pide nada; programarlo pide todo y manda la acción', () => {
    const base = valoresDePieza(borrador)
    expect(editar({ ...base, medios: [] }, 'guardar', borrador, base).problemas).toEqual([])
    expect(editar(base, 'programar', borrador, base).problemas).toEqual([
      'Elegí la fecha y la hora para programar',
    ])
    expect(
      editar({ ...base, fecha: '2026-11-22', hora: '18:00' }, 'programar', borrador, base).cambios,
    ).toEqual({ accion: 'programar', programadaPara: '2026-11-22T21:00:00.000Z' })
  })

  it('publicar ahora manda la acción y no la fecha', () => {
    const base = valoresDePieza(borrador)
    expect(editar(base, 'publicar_ahora', borrador, base).cambios).toEqual({
      accion: 'publicar_ahora',
    })
  })

  it('TikTok: las opciones que no se tocan no se mandan ni se exigen; las que se tocan, sí', () => {
    const tt: Programada = {
      ...programada,
      red: 'tiktok',
      redId: 'red-tt',
      formato: 'video',
      medios: [video],
    }
    const base = valoresDePieza(tt)
    expect(editar(base, 'guardar', tt, base)).toMatchObject({ problemas: [], sinCambios: true })
    const tocadas = { ...base, opciones: { ...base.opciones, privacyLevel: 'SELF_ONLY' } }
    // Al tocarlas, hay que dejarlas completas: faltan la vista previa y el consentimiento.
    expect(editar(tocadas, 'guardar', tt, base).problemas).toEqual([
      'Los videos de TikTok tienen que ser públicos',
      'Falta confirmar la vista previa del contenido',
      'Falta el consentimiento expreso para publicar en TikTok',
    ])
    const completas = { ...base, opciones: opcionesTikTok }
    expect(editar(completas, 'guardar', tt, base).cambios).toEqual({ opciones: opcionesTikTok })
  })
})
