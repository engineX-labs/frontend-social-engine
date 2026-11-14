/** Todo se guarda en UTC y se muestra en hora de Buenos Aires (UTC-3, sin horario de verano). */
export const ZONA = 'America/Argentina/Buenos_Aires'

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export interface PartesBA {
  anio: number
  mes: number // 1-12
  dia: number
  hora: number
  minuto: number
  /** 0 = domingo. */
  diaSemana: number
}

export function partesBA(fecha: Date | string): PartesBA {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha
  const p: Record<string, string> = {}
  for (const x of fmt.formatToParts(d)) p[x.type] = x.value
  const anio = Number(p.year)
  const mes = Number(p.month)
  const dia = Number(p.day)
  return {
    anio,
    mes,
    dia,
    hora: Number(p.hour),
    minuto: Number(p.minute),
    diaSemana: new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay(),
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** YYYY-MM-DD en hora de Buenos Aires. */
export function claveDia(fecha: Date | string): string {
  const p = partesBA(fecha)
  return `${p.anio}-${pad(p.mes)}-${pad(p.dia)}`
}

/** YYYY-MM en hora de Buenos Aires. */
export function claveMes(fecha: Date | string): string {
  const p = partesBA(fecha)
  return `${p.anio}-${pad(p.mes)}`
}

export function hora(fecha: Date | string): string {
  const p = partesBA(fecha)
  return `${pad(p.hora)}:${pad(p.minuto)}`
}

export function nombreMes(mes: string): string {
  const [a, m] = mes.split('-').map(Number)
  const nombre = MESES[(m ?? 1) - 1] ?? ''
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${a}`
}

export function diaLargo(fecha: Date | string): string {
  const p = partesBA(fecha)
  return `${DIAS[p.diaSemana]} ${p.dia} de ${MESES[p.mes - 1]}`
}

export function diaCorto(fecha: Date | string): string {
  const p = partesBA(fecha)
  return `${p.dia} ${MESES[p.mes - 1]?.slice(0, 3)}`
}

/** Mes siguiente (+1) o anterior (-1) de un YYYY-MM. */
export function desplazarMes(mes: string, delta: number): string {
  const [a, m] = mes.split('-').map(Number)
  const d = new Date(Date.UTC(a ?? 1970, (m ?? 1) - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`
}

/** Fecha en UTC a partir de componentes en hora de Buenos Aires (UTC-3). */
export function aUtcDesdeBA(anio: number, mes: number, dia: number, h = 0, min = 0): string {
  return new Date(Date.UTC(anio, mes - 1, dia, h + 3, min)).toISOString()
}

/** Celdas (lunes a domingo) que cubren el mes, como YYYY-MM-DD. */
export function diasDeGrilla(mes: string): string[] {
  const [a, m] = mes.split('-').map(Number)
  const anio = a ?? 1970
  const mm = (m ?? 1) - 1
  const primero = new Date(Date.UTC(anio, mm, 1))
  const offset = (primero.getUTCDay() + 6) % 7
  const dias = new Date(Date.UTC(anio, mm + 1, 0)).getUTCDate()
  const filas = Math.ceil((offset + dias) / 7)
  const out: string[] = []
  for (let i = 0; i < filas * 7; i++) {
    const d = new Date(Date.UTC(anio, mm, 1 - offset + i))
    out.push(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`)
  }
  return out
}
