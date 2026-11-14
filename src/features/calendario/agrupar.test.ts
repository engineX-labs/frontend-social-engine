import type { CalendarioMes, Idea, Publicada } from '@/domain/types'
import { aUtcDesdeBA } from '@/lib/fecha'
import { agruparPorDia, nombreDia, resumenDia } from './agrupar'

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
