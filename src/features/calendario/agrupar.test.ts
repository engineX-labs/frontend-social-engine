import type { CalendarioMes, Idea, Programada, Publicada } from '@/domain/types'
import { aUtcDesdeBA } from '@/lib/fecha'
import {
  agruparPorDia,
  formatoDe,
  nombreDia,
  programadasDelCalendario,
  resumenDia,
  type ProgramadaConFecha,
} from './agrupar'

const pub = (id: string, h: number, d = 5): Publicada => ({
  tipo: 'publicada',
  id,
  red: 'instagram',
  fecha: aUtcDesdeBA(2026, 11, d, h),
  formato: 'Foto',
  copy: '',
  portadaUrl: null,
  alcance: 1,
  interacciones: 1,
  analisis: '',
})
const idea = (id: string, h: number, d = 5): Idea => ({
  tipo: 'idea',
  id,
  red: 'instagram',
  fecha: aUtcDesdeBA(2026, 11, d, h),
  formato: 'Reel',
  ideaPortada: '',
  copyPropuestas: [],
  porQue: [],
})
const mes = (publicadas: Publicada[], ideas: Idea[]) =>
  ({ mes: '2026-11', publicadas, ideas }) as CalendarioMes

describe('agruparPorDia', () => {
  it('agrupa en hora de Buenos Aires y ordena por hora', () => {
    // 23:30 BA del 5 es 02:30 UTC del 6: tiene que caer el 5.
    const m = agruparPorDia(mes([pub('b', 23), pub('a', 9)], [idea('i', 12)]), [])
    expect([...m.keys()]).toEqual(['2026-11-05'])
    expect(m.get('2026-11-05')!.map((i) => i.id)).toEqual(['a', 'i', 'b'])
  })
  it('aplica los filtros', () => {
    const d = mes([pub('a', 9)], [idea('i', 12)])
    expect(
      agruparPorDia(d, ['idea'])
        .get('2026-11-05')!
        .map((i) => i.id),
    ).toEqual(['a'])
    expect(agruparPorDia(d, ['idea', 'publicada']).size).toBe(0)
  })
})

describe('textos', () => {
  it('resumen del día', () => {
    expect(resumenDia([])).toBe('sin publicaciones')
    expect(resumenDia([pub('a', 9), idea('i', 9)])).toBe('1 publicada y 1 sugerida')
    expect(resumenDia([pub('a', 9), pub('b', 10)])).toBe('2 publicadas')
  })
  it('nombre largo del día', () => {
    expect(nombreDia('2026-11-14')).toBe('sábado 14 de noviembre')
  })
})

const prog = (
  id: string,
  estado: Programada['estado'],
  fecha: string | null,
  error: string | null = null,
): Programada => ({
  tipo: 'programada',
  id,
  red: 'tiktok',
  redId: 'r',
  estado,
  formato: 'video',
  texto: null,
  medios: [],
  fecha,
  error,
  urlPublicada: null,
  itemId: null,
})
const conProgramadas = (programadas: Programada[]) =>
  ({ mes: '2026-11', publicadas: [], ideas: [], programadas }) as unknown as CalendarioMes

describe('piezas guardadas desde la app', () => {
  it('se mezclan por día y por hora con publicadas e ideas', () => {
    const datos = {
      ...mes([pub('p', 12)], [idea('i', 20)]),
      programadas: [prog('a', 'programada', aUtcDesdeBA(2026, 11, 5, 9))],
    } as CalendarioMes
    const m = agruparPorDia(datos, [])
    expect(m.get('2026-11-05')!.map((i) => i.id)).toEqual(['a', 'p', 'i'])
  })

  it('descarta las canceladas y las que no tienen día', () => {
    const datos = conProgramadas([
      prog('ok', 'programada', aUtcDesdeBA(2026, 11, 5, 9)),
      prog('cancelada', 'cancelada', aUtcDesdeBA(2026, 11, 5, 10)),
      prog('sin-dia', 'borrador', null),
    ])
    expect(
      agruparPorDia(datos, [])
        .get('2026-11-05')!
        .map((i) => i.id),
    ).toEqual(['ok'])
    expect(programadasDelCalendario(datos).map((p) => p.id)).toEqual(['ok'])
  })

  it('el filtro `programada` las oculta y deja el resto', () => {
    const datos = {
      ...mes([pub('p', 12)], []),
      programadas: [prog('a', 'programada', aUtcDesdeBA(2026, 11, 5, 9))],
    } as CalendarioMes
    expect(
      agruparPorDia(datos, ['programada'])
        .get('2026-11-05')!
        .map((i) => i.id),
    ).toEqual(['p'])
  })

  it('sin el campo `programadas` (backend sin publicar) no hay piezas', () => {
    expect(agruparPorDia(mes([pub('p', 12)], []), []).get('2026-11-05')!).toHaveLength(1)
    expect(programadasDelCalendario(mes([], []))).toEqual([])
  })

  it('el formato se lee como en pantalla', () => {
    const dia = aUtcDesdeBA(2026, 11, 5, 9)
    expect(formatoDe(prog('a', 'programada', dia) as ProgramadaConFecha)).toBe('Video')
    expect(
      formatoDe({ ...prog('a', 'borrador', dia), formato: 'fotos' } as ProgramadaConFecha),
    ).toBe('Fotos')
    expect(formatoDe(pub('p', 12))).toBe('Foto')
  })

  it('el resumen del día nombra cada estado y cuenta como publicada la que ya salió', () => {
    const dia = aUtcDesdeBA(2026, 11, 5, 9)
    const p = (id: string, estado: Programada['estado'], error: string | null = null) =>
      prog(id, estado, dia, error) as ProgramadaConFecha
    expect(resumenDia([p('a', 'programada'), p('b', 'programada')])).toBe('2 programadas')
    expect(resumenDia([pub('x', 9), p('a', 'programada'), idea('i', 9)])).toBe(
      '1 publicada, 1 programada y 1 sugerida',
    )
    expect(resumenDia([pub('x', 9), p('a', 'publicada')])).toBe('2 publicadas')
    expect(resumenDia([p('a', 'borrador')])).toBe('1 borrador')
    expect(resumenDia([p('a', 'publicando')])).toBe('1 publicándose')
    expect(resumenDia([p('a', 'fallida', 'x'), p('b', 'fallida', 'y')])).toBe('2 fallidas')
    expect(resumenDia([p('a', 'fallida', 'estado_desconocido')])).toBe('1 confirmándose')
    expect(resumenDia([p('a', 'fallida', 'No se publicó')])).toBe('1 sin publicar')
  })
})
