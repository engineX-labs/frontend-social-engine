import { calcularResumen, conRendimiento, esNoche } from '@/domain/metrics'
import type { CalendarioMes, Formato, Idea, Publicada } from '@/domain/types'
import { aUtcDesdeBA, claveMes, diaLargo, partesBA } from '@/lib/fecha'
import { portadaDemo } from './portadas'

/** Datos de ejemplo de "Casa Álamo" (Instagram), tomados del prototipo. Fechas en hora de Buenos Aires. */
// [mes, día, hora, minuto, formato, alcance, interacciones, copy]
const RAW: [number, number, number, number, Formato, number, number, string][] = [
  [
    11,
    5,
    20,
    4,
    'Reel',
    3980,
    286,
    'Tres prendas, un solo look. Mirá cómo cambia con el abrigo largo. Guardalo para tu próxima salida.',
  ],
  [
    11,
    3,
    19,
    42,
    'Carrusel',
    1580,
    121,
    'Cinco looks para la semana, uno por día. ¿Cuál te llevás? Deslizá.',
  ],
  [11, 8, 12, 10, 'Foto', 1360, 84, 'Domingo de saco beige y pantalón crudo. Pasá a probártelo.'],
  [
    10,
    27,
    13,
    0,
    'Carrusel',
    1450,
    109,
    'Lo nuevo de la semana en una sola mirada. Deslizá y elegí tu favorito.',
  ],
  [10, 22, 12, 30, 'Reel', 1280, 96, 'Probando la camisa blanca de lino en tres versiones.'],
  [10, 24, 19, 20, 'Foto', 1190, 71, 'Sábado de tejidos livianos. Ya disponibles en tres colores.'],
  [11, 10, 18, 20, 'Foto', 1100, 66, 'Martes de campera. ¿Negra o camel?'],
  [10, 31, 11, 30, 'Carrusel', 1020, 70, 'Looks de fin de mes para estrenar en noviembre.'],
  [10, 15, 13, 10, 'Foto', 960, 52, 'Jueves de sacos livianos.'],
  [10, 17, 10, 40, 'Reel', 940, 58, 'Así llega la mercadería nueva al local.'],
  [10, 20, 9, 50, 'Foto', 620, 24, 'Nuevo stock de remeras básicas.'],
  [11, 4, 8, 15, 'Foto', 410, 12, 'Buen día. Hoy abrimos a las 10.'],
]

const PUBLICADAS_BASE: Publicada[] = RAW.map((r, i) => ({
  tipo: 'publicada' as const,
  id: `pub-${i + 1}`,
  red: 'instagram' as const,
  fecha: aUtcDesdeBA(2026, r[0], r[1], r[2], r[3]),
  formato: r[4],
  copy: r[7],
  portadaUrl: portadaDemo(i, r[4]),
  alcance: r[5],
  interacciones: r[6],
  analisis: '',
}))

const resumenGlobal = calcularResumen(PUBLICADAS_BASE)

function fmtNum(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
function fmtX(x: number): string {
  return x.toFixed(1).replace(/\.0$/, '').replace('.', ',')
}

/** Texto de análisis. En producción lo redacta el modelo sobre cifras ya calculadas. */
function analizar(p: Publicada, razon: number): string {
  const f = p.formato.toLowerCase()
  const h = partesBA(p.fecha).hora
  const dia = diaLargo(p.fecha).split(' ')[0]
  const med = fmtNum(resumenGlobal.medianaAlcance)
  if (razon >= 1.3)
    return `Tu ${f} del ${dia} llegó a ${fmtX(razon)} veces tu mediana. Lo publicaste a las ${h} h${esNoche(h) ? ', dentro de tu franja más fuerte (18 a 22 h)' : ''}. Probá repetirlo.`
  if (razon < 0.7)
    return `Tu ${f} del ${dia} quedó ${Math.round((1 - razon) * 100)}% bajo tu mediana (${fmtNum(p.alcance)} contra ${med}). Salió a las ${h} h${esNoche(h) ? '' : ', fuera de tu franja más fuerte (18 a 22 h)'}. ${esNoche(h) ? 'Probá otro tema o un formato con más movimiento.' : 'Probá repetir el tema a la noche.'}`
  return `Tu ${f} del ${dia} rindió en línea con tu mediana: ${fmtNum(p.alcance)} contra ${med}. ${esNoche(h) ? 'Salió en tu franja más fuerte, así que el margen está en el contenido.' : 'Salió fuera de la franja de 18 a 22 h. Probá moverlo a la noche.'}`
}

export const PUBLICADAS: Publicada[] = conRendimiento(PUBLICADAS_BASE, resumenGlobal).map(
  ({ razon, ...p }) => {
    const { clase: _c, puesto: _p, ...pub } = p
    return { ...pub, analisis: analizar(pub, razon) }
  },
)

const COPY: Record<Formato, string[]> = {
  Reel: [
    'Mirá cómo cambia este look en diez segundos. Guardalo para tu próxima salida.',
    'Una prenda, tres formas de usarla. ¿Con cuál te quedás?',
    'Lo nuevo del local, puesto. Pasá a probártelo.',
  ],
  Carrusel: [
    'Cinco looks para la semana, uno por día. Deslizá y elegí tu favorito.',
    'Lo nuevo de la semana en una sola mirada. ¿Cuál te llevás?',
    'Combinaciones que funcionan. Guardá este posteo para cuando no sepas qué ponerte.',
  ],
  Foto: [
    'Looks simples para el día. Pasá a probártelo.',
    'Una prenda, un color. ¿La ves en tu placard?',
    'Ya está en el local. Escribinos por mensaje directo y te la reservamos.',
  ],
}

function porQue(formato: Formato, h: number): string[] {
  const r = resumenGlobal
  const f = r.medianaPorFormato[formato] ?? r.medianaAlcance
  const noche = r.medianaNoche ?? 0
  const resto = r.medianaResto ?? 0
  return [
    `Formato: tus publicaciones de este tipo tienen una mediana de ${fmtNum(f)} de alcance, ${fmtX(f / r.medianaAlcance)} veces tu mediana general.`,
    esNoche(h)
      ? `Horario: de 18 a 22 h tu mediana es ${fmtNum(noche)} de alcance, contra ${fmtNum(resto)} en el resto del día.`
      : `Horario: fuera de la franja de 18 a 22 h tu mediana es ${fmtNum(resto)}. Dentro de esa franja, ${fmtNum(noche)}.`,
    `Son ${r.cantidad} publicaciones en 4 semanas. Tomalo como una señal, no como una regla.`,
  ]
}

const IDEAS_RAW: [number, number, number, Formato, string][] = [
  [17, 19, 0, 'Carrusel', 'Cinco looks, uno por día. La primera imagen con la prenda más fuerte.'],
  [19, 20, 0, 'Reel', 'Mostrá la prenda puesta en los primeros 2 segundos.'],
  [22, 12, 0, 'Foto', 'Luz natural, prenda de cuerpo entero y un solo fondo liso.'],
]

export const IDEAS: Idea[] = IDEAS_RAW.map((r, i) => ({
  tipo: 'idea' as const,
  id: `idea-${i + 1}`,
  red: 'instagram' as const,
  fecha: aUtcDesdeBA(2026, 11, r[0], r[1], r[2]),
  formato: r[3],
  ideaPortada: r[4],
  copyPropuestas: COPY[r[3]],
  porQue: porQue(r[3], r[1]),
}))

export function calendarioDelMes(mes: string): CalendarioMes {
  return {
    mes,
    publicadas: PUBLICADAS.filter((p) => claveMes(p.fecha) === mes),
    ideas: IDEAS.filter((i) => claveMes(i.fecha) === mes),
    resumen: resumenGlobal,
  }
}

export function buscarItem(id: string) {
  return [...PUBLICADAS, ...IDEAS].find((x) => x.id === id) ?? null
}
