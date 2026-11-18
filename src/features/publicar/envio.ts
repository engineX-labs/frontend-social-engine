import { z } from 'zod'
import type { NuevaProgramada } from '@/api/publicacion'
import { TIPOS_POR_RED, validarFecha, validarPieza } from '@/domain/publicacion'
import type { Medio, OpcionesTikTok, Red, TipoPieza } from '@/domain/types'
import { aUtcDesdeBA, claveDia } from '@/lib/fecha'

/** Lo que el formulario del compositor guarda. Fecha y hora van en hora de Buenos Aires. */
export interface ValoresPieza {
  redId: string
  tipo: TipoPieza | ''
  texto: string
  /** YYYY-MM-DD, o vacío. */
  fecha: string
  /** HH:mm, o vacío. */
  hora: string
  medios: Medio[]
  opciones: OpcionesTikTok
}

export type AccionDeEnvio = 'borrador' | 'programar' | 'publicar_ahora'

const TIPOS = ['foto', 'carrusel', 'reel', 'historia', 'video', 'fotos'] as const

function esDiaReal(v: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  if (!m) return false
  const [a, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const f = new Date(Date.UTC(a, mes - 1, d))
  return f.getUTCFullYear() === a && f.getUTCMonth() === mes - 1 && f.getUTCDate() === d
}

/**
 * Valida solo el formato de cada campo (para marcarlo en su lugar). Las reglas de la pieza dependen de
 * la acción —un borrador casi no tiene— y las evalúa `armarCuerpo`.
 */
export const esquemaValores = z.object({
  redId: z.string(),
  tipo: z.union([z.literal(''), z.enum(TIPOS)]),
  texto: z.string(),
  fecha: z.string().refine((v) => v === '' || esDiaReal(v), 'La fecha no es válida'),
  hora: z
    .string()
    .refine((v) => v === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(v), 'La hora no es válida'),
  medios: z.array(z.object({ url: z.string(), tipo: z.enum(['imagen', 'video']) })),
  opciones: z.object({
    privacyLevel: z.string().optional(),
    allowComment: z.boolean().optional(),
    allowDuet: z.boolean().optional(),
    allowStitch: z.boolean().optional(),
    contentPreviewConfirmed: z.boolean().optional(),
    expressConsentGiven: z.boolean().optional(),
    commercialContentType: z.string().optional(),
    videoCoverTimestampMs: z.number().optional(),
  }),
})

export interface ResultadoEnvio {
  /** Sin `id`: lo agrega el compositor (uno por envío). `null` si hay problemas. */
  cuerpo: Omit<NuevaProgramada, 'id'> | null
  problemas: string[]
}

/** Fecha y hora de pared en Buenos Aires → ISO en UTC. */
export function fechaHoraAUtc(fecha: string, hora: string): string {
  const [a, m, d] = fecha.split('-').map(Number) as [number, number, number]
  const [h, min] = hora.split(':').map(Number) as [number, number]
  return aUtcDesdeBA(a, m, d, h, min)
}

/** ISO en UTC → `{ fecha, hora }` de pared en Buenos Aires, para completar el formulario al editar. */
export function utcAFechaHora(iso: string): { fecha: string; hora: string } {
  const fecha = claveDia(iso)
  const partes = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso))
  return { fecha, hora: partes }
}

/**
 * Arma el cuerpo de `POST /api/programadas` y avisa de lo que falta antes de molestar al backend. Las
 * reglas copian las del backend (`domain/publicacion.ts`); la que manda es la del backend.
 *
 * - `borrador`: solo hace falta la red y el tipo; la fecha es opcional pero tiene que venir completa.
 * - `programar`: la pieza completa y una fecha entre 5 minutos y 180 días.
 * - `publicar_ahora`: la pieza completa; no se manda fecha (el backend usa la de ahora).
 */
export function armarCuerpo(
  v: ValoresPieza,
  red: Red | undefined,
  accion: AccionDeEnvio,
  ahora: number,
): ResultadoEnvio {
  if (!red || !v.redId) return { cuerpo: null, problemas: ['Elegí en qué red publicar'] }
  if (!v.tipo) return { cuerpo: null, problemas: ['Elegí qué vas a publicar'] }
  if (!TIPOS_POR_RED[red].includes(v.tipo))
    return { cuerpo: null, problemas: [`El tipo «${v.tipo}» no existe en ${red}`] }

  const problemas: string[] = []
  // Las historias no llevan texto: el compositor no lo pide y no se manda aunque quede escrito.
  const texto = v.tipo === 'historia' ? null : v.texto.trim() || null
  const opciones = red === 'tiktok' ? v.opciones : null
  const hayFecha = v.fecha !== '' && v.hora !== ''
  if ((v.fecha !== '') !== (v.hora !== '') && accion !== 'publicar_ahora')
    problemas.push('Completá la fecha y la hora, o dejá las dos vacías')
  const programadaPara =
    hayFecha && accion !== 'publicar_ahora' ? fechaHoraAUtc(v.fecha, v.hora) : null

  if (accion !== 'borrador') {
    problemas.push(...validarPieza({ red, tipo: v.tipo, texto, medios: v.medios, opciones }))
    if (accion === 'programar') {
      if (!hayFecha) {
        if (v.fecha === '' && v.hora === '')
          problemas.push('Elegí la fecha y la hora para programar')
      } else {
        const p = validarFecha(programadaPara!, ahora)
        if (p) problemas.push(p)
      }
    }
  }
  if (problemas.length) return { cuerpo: null, problemas }
  return {
    cuerpo: {
      redId: v.redId,
      accion,
      tipo: v.tipo,
      texto,
      medios: v.medios,
      ...(programadaPara ? { programadaPara } : {}),
      ...(opciones ? { opciones } : {}),
    },
    problemas: [],
  }
}
