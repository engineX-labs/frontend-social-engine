import { z } from 'zod'

/** Contrato de `GET/PUT /api/contexto` (camelCase). El catálogo de preguntas lo manda el backend. */
export interface OpcionPregunta {
  valor: string
  etiqueta: string
}

export interface Pregunta {
  id: string
  texto: string
  tipo: 'opcion' | 'multiple' | 'texto'
  obligatoria: boolean
  opciones?: OpcionPregunta[]
  /** Con una lista de opciones, permite escribir otra: la respuesta es el texto escrito. */
  permiteOtro?: boolean
  maxLargo?: number
}

export type Respuesta = string | string[]
export type Respuestas = Record<string, Respuesta>
export type EstadoContexto = 'pendiente' | 'completo' | 'salteado'

export interface Contexto {
  version: number
  estado: EstadoContexto
  preguntas: Pregunta[]
  respuestas: Respuestas
}

export interface GuardarContexto {
  respuestas: Respuestas
  saltear?: boolean
}

/** Largo máximo por defecto de un texto libre si el catálogo no manda `maxLargo`. */
export const MAX_LARGO_DEFECTO = 200

export const largoMaximo = (p: Pregunta) => p.maxLargo ?? MAX_LARGO_DEFECTO

/** Las obligatorias primero (se pueden contestar de entrada); el resto, en el orden del catálogo. */
export function ordenarPreguntas(preguntas: Pregunta[]): Pregunta[] {
  return [...preguntas.filter((p) => p.obligatoria), ...preguntas.filter((p) => !p.obligatoria)]
}

/** Valores del formulario: texto u opción como string, varias opciones como arreglo. */
export type ValoresRespuestas = Record<string, string | string[]>

export function valoresIniciales(preguntas: Pregunta[], guardadas: Respuestas): ValoresRespuestas {
  return Object.fromEntries(
    preguntas.map((p) => {
      const v = guardadas[p.id]
      if (p.tipo === 'multiple') return [p.id, Array.isArray(v) ? v : v ? [v] : []]
      return [p.id, typeof v === 'string' ? v : (v?.[0] ?? '')]
    }),
  )
}

/** Zod armado desde el catálogo: cambiar las preguntas no exige tocar el front. */
export function esquemaDeRespuestas(preguntas: Pregunta[]) {
  const forma: Record<string, z.ZodType> = {}
  for (const p of preguntas) {
    const max = largoMaximo(p)
    const texto = z.string().trim().max(max, `Máximo ${max} caracteres`)
    if (p.tipo === 'multiple') {
      const validas = new Set((p.opciones ?? []).map((o) => o.valor))
      const lista = z
        .array(z.string())
        .refine((l) => l.every((v) => validas.has(v)), 'Elegí solo entre las opciones')
      forma[p.id] = p.obligatoria ? lista.min(1, 'Elegí al menos una opción') : lista
    } else if (p.tipo === 'opcion') {
      const validas = new Set((p.opciones ?? []).map((o) => o.valor))
      const base = p.permiteOtro
        ? texto
        : texto.refine((v) => v === '' || validas.has(v), 'Elegí una de las opciones')
      forma[p.id] = p.obligatoria ? base.min(1, 'Elegí una opción') : base
    } else {
      forma[p.id] = p.obligatoria ? texto.min(1, 'Esta pregunta es obligatoria') : texto
    }
  }
  return z.object(forma)
}

/** Quita lo vacío: una pregunta sin responder no se manda. */
export function respuestasParaEnviar(valores: ValoresRespuestas): Respuestas {
  const salida: Respuestas = {}
  for (const [id, v] of Object.entries(valores)) {
    if (Array.isArray(v)) {
      if (v.length > 0) salida[id] = v
    } else if (v.trim() !== '') salida[id] = v.trim()
  }
  return salida
}

/** Cómo se lee una respuesta guardada (la etiqueta de la opción, o «Otro: …»). */
export function textoDeRespuesta(p: Pregunta, r: Respuesta | undefined): string | null {
  if (r === undefined || (Array.isArray(r) ? r.length === 0 : r.trim() === '')) return null
  const etiqueta = (v: string) => p.opciones?.find((o) => o.valor === v)?.etiqueta
  if (Array.isArray(r)) return r.map((v) => etiqueta(v) ?? v).join(', ')
  if (p.opciones) return etiqueta(r) ?? r
  return r
}

/** ¿Falta contestar alguna obligatoria? */
export const faltanObligatorias = (preguntas: Pregunta[], r: Respuestas) =>
  preguntas.some((p) => p.obligatoria && textoDeRespuesta(p, r[p.id]) === null)
