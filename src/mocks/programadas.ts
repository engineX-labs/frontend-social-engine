import {
  PRIVACIDAD_PUBLICA,
  situacionDe,
  validarFecha,
  validarPieza,
  TIPOS_POR_RED,
} from '@/domain/publicacion'
import type {
  Medio,
  OpcionesTikTok,
  OpcionesTikTokRed,
  Programada,
  RedConectada,
  TipoPieza,
} from '@/domain/types'
import { claveMes } from '@/lib/fecha'
import { fechaDemo } from './datos'
import { portadaDemo } from './portadas'

/**
 * Simula en memoria a `/api/programadas` del backend (`app/api/publicacion.py` y
 * `app/publicacion/servicio.py`): mismos estados, transiciones, reglas y mensajes. Si algo difiere,
 * manda el backend. Los tests y el demo de Vercel leen de acá.
 */

export const REDES_MOCK: RedConectada[] = [
  { id: 'red-ig', red: 'instagram', username: 'casa.alamo', salud: 'healthy' },
  { id: 'red-tt', red: 'tiktok', username: 'casa.alamo', salud: 'healthy' },
]

export const OPCIONES_TIKTOK_MOCK: OpcionesTikTokRed = {
  privacidades: [PRIVACIDAD_PUBLICA, 'MUTUAL_FOLLOW_FRIENDS', 'SELF_ONLY'],
  duracionMaximaSegundos: 600,
  puedePublicarMas: true,
  comentariosDeshabilitados: false,
  duetDeshabilitado: false,
  stitchDeshabilitado: false,
}

/** Un `id` que el mock trata como de otro comercio: crear con él da 409 «Id en uso». */
export const ID_DE_OTRO_COMERCIO = '00000000-0000-4000-8000-000000000000'

/** Un error de la API tal como lo mandaría el backend. */
export class ErrorMock extends Error {
  status: number
  cuerpo: { detalle: string; problemas?: string[]; codigo?: string }
  constructor(status: number, detalle: string, extra?: { problemas?: string[]; codigo?: string }) {
    super(detalle)
    this.status = status
    this.cuerpo = { detalle, ...extra }
  }
}

export const NO_ENCONTRADO = new ErrorMock(404, 'No encontrado')
const pedidoInvalido = (problemas: string[]) => new ErrorMock(422, 'Pedido inválido', { problemas })

export const mockPublicacion = {
  /** Como `PUBLICACION_HABILITADA` del backend: apagada, todas las rutas dan 404. */
  habilitada: true,
  ahora: () => Date.now(),
  /** Error que el próximo pedido que escribe devuelve (y se consume), para probar los 409 y 503. */
  forzar: null as ErrorMock | null,
}

const medio = (nombre: string, tipo: Medio['tipo'] = 'imagen'): Medio => ({
  url: `https://mock.zernio.test/medios/${nombre}`,
  tipo,
})

function sembrar(): Programada[] {
  return [
    {
      tipo: 'programada',
      id: 'prog-1',
      red: 'instagram',
      redId: 'red-ig',
      estado: 'borrador',
      formato: 'reel',
      texto: 'Idea de reel: la prenda puesta en los primeros 2 segundos.',
      medios: [medio('reel-borrador.mp4', 'video')],
      fecha: null,
      error: null,
      urlPublicada: null,
      itemId: null,
    },
    {
      tipo: 'programada',
      id: 'prog-2',
      red: 'instagram',
      redId: 'red-ig',
      estado: 'programada',
      formato: 'carrusel',
      texto: 'Cinco looks para la semana, uno por día. Deslizá.',
      medios: [medio('look-1.jpg'), medio('look-2.jpg'), medio('look-3.jpg')],
      fecha: fechaDemo(11, 19, 20, 0),
      error: null,
      urlPublicada: null,
      itemId: null,
    },
    {
      tipo: 'programada',
      id: 'prog-3',
      red: 'tiktok',
      redId: 'red-tt',
      estado: 'programada',
      formato: 'video',
      texto: 'Así llega la mercadería nueva al local.',
      medios: [medio('local.mp4', 'video')],
      fecha: fechaDemo(11, 21, 19, 0),
      error: null,
      urlPublicada: null,
      itemId: null,
    },
    {
      tipo: 'programada',
      id: 'prog-4',
      red: 'instagram',
      redId: 'red-ig',
      estado: 'publicada',
      formato: 'historia',
      texto: null,
      medios: [medio('historia.jpg')],
      fecha: fechaDemo(11, 12, 18, 30),
      error: null,
      urlPublicada: 'https://www.instagram.com/stories/casa.alamo/1/',
      itemId: null,
    },
    {
      tipo: 'programada',
      id: 'prog-5',
      red: 'instagram',
      redId: 'red-ig',
      estado: 'fallida',
      formato: 'foto',
      texto: 'Domingo de saco beige.',
      medios: [medio('saco.jpg')],
      fecha: fechaDemo(11, 13, 12, 0),
      error: 'Zernio rechazó la publicación; revisá el contenido',
      urlPublicada: null,
      itemId: null,
    },
    {
      tipo: 'programada',
      id: 'prog-6',
      red: 'tiktok',
      redId: 'red-tt',
      estado: 'fallida',
      formato: 'fotos',
      texto: 'Looks de fin de mes.',
      medios: [medio('a.jpg'), medio('b.jpg')],
      fecha: fechaDemo(11, 14, 10, 0),
      error: 'estado_desconocido',
      urlPublicada: null,
      itemId: null,
    },
  ]
}

/**
 * La portada que devuelve el backend: la elegida (solo reel y video) o, si no, la primera imagen de
 * `medios`. Un reel o video sin portada elegida da `null`. En el mock, las imágenes sembradas usan una
 * portada de ejemplo (data URI) para que se vean sin pedir nada a la red.
 */
function portadaDe(tipo: TipoPieza, medios: Medio[], elegida: string | null): string | null {
  if (tipo === 'reel' || tipo === 'video') return elegida
  return medios.find((m) => m.tipo === 'imagen')?.url ?? null
}

function conPortada(p: Programada, idx: number): Programada {
  const url = portadaDe(p.formato, p.medios, null)
  return { ...p, portadaUrl: url ? portadaDemo(idx, 'Foto') : null }
}

let piezas: Programada[] = sembrar().map(conPortada)

/** Vuelve al estado inicial (los tests lo llaman antes de cada caso). */
export function reiniciarProgramadas(): void {
  piezas = sembrar().map(conPortada)
  mockPublicacion.habilitada = true
  mockPublicacion.ahora = () => Date.now()
  mockPublicacion.forzar = null
}

export function todasLasProgramadas(): Programada[] {
  return piezas.map((p) => ({ ...p, medios: [...p.medios] }))
}

/** Lo que haría un webhook de Zernio o la conciliación: cambia el estado de una pieza. */
export function avanzarPieza(
  id: string,
  estado: Programada['estado'],
  extra: Partial<Pick<Programada, 'error' | 'urlPublicada' | 'itemId'>> = {},
): void {
  const i = piezas.findIndex((p) => p.id === id)
  if (i < 0) throw new Error(`No hay una pieza ${id}`)
  piezas[i] = { ...piezas[i]!, estado, error: null, ...extra }
}

export function exigirHabilitada(): void {
  if (!mockPublicacion.habilitada) throw NO_ENCONTRADO
}

function consumirForzado(): void {
  const e = mockPublicacion.forzar
  if (e) {
    mockPublicacion.forzar = null
    throw e
  }
}

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function redes(): RedConectada[] {
  return REDES_MOCK
}

export function opcionesTikTok(redId: string): OpcionesTikTokRed {
  const red = REDES_MOCK.find((r) => r.id === redId)
  if (!red || red.red !== 'tiktok') throw NO_ENCONTRADO
  return OPCIONES_TIKTOK_MOCK
}

export interface CuerpoCrear {
  id?: string
  redId: string
  accion: 'borrador' | 'programar' | 'publicar_ahora'
  tipo: TipoPieza
  texto?: string | null
  medios: Medio[]
  portadaUrl?: string | null
  programadaPara?: string | null
  opciones?: OpcionesTikTok | null
}

export interface CuerpoEditar {
  accion?: 'guardar' | 'programar' | 'publicar_ahora'
  tipo?: TipoPieza
  texto?: string | null
  medios?: Medio[]
  portadaUrl?: string | null
  programadaPara?: string | null
  opciones?: OpcionesTikTok | null
}

/** Estado interno: las opciones de TikTok se guardan aparte porque `Programada` no las expone. */
const opcionesPorPieza = new Map<string, OpcionesTikTok | null>()

function validarEnvio(
  red: RedConectada,
  campos: {
    tipo: TipoPieza
    texto: string | null
    medios: Medio[]
    opciones: OpcionesTikTok | null
  },
  fecha: string | null,
  publicarAhora: boolean,
): void {
  const problemas = validarPieza({ red: red.red, ...campos })
  if (!publicarAhora) {
    if (!fecha) problemas.push('Falta la fecha para programar')
    else {
      const p = validarFecha(fecha, mockPublicacion.ahora())
      if (p) problemas.push(p)
    }
  }
  if (problemas.length) throw pedidoInvalido(problemas)
}

export function crearPieza(c: CuerpoCrear): { pieza: Programada; estado: 200 | 201 } {
  exigirHabilitada()
  if (c.id !== undefined && !UUID_V4.test(c.id))
    throw pedidoInvalido(['El id tiene que ser un uuid v4'])
  if (c.id) {
    if (c.id === ID_DE_OTRO_COMERCIO) throw new ErrorMock(409, 'Id en uso')
    const previa = piezas.find((p) => p.id === c.id)
    // Mismo id: devuelve la pieza sin volver a validar ni a llamar a Zernio.
    if (previa) return { pieza: previa, estado: 200 }
  }
  const red = REDES_MOCK.find((r) => r.id === c.redId)
  if (!red) throw NO_ENCONTRADO
  const campos = {
    tipo: c.tipo,
    texto: c.texto ?? null,
    medios: c.medios ?? [],
    opciones: c.opciones ?? null,
  }
  if (!TIPOS_POR_RED[red.red].includes(c.tipo))
    throw pedidoInvalido([`El tipo «${c.tipo}» no existe en ${red.red}`])
  const ahora = new Date(mockPublicacion.ahora()).toISOString()
  let estado: Programada['estado'] = 'borrador'
  let fecha = c.programadaPara ?? null
  if (c.accion !== 'borrador') {
    consumirForzado()
    if (c.accion === 'publicar_ahora') fecha = ahora
    validarEnvio(red, campos, fecha, c.accion === 'publicar_ahora')
    estado = c.accion === 'programar' ? 'programada' : 'publicando'
  }
  const pieza: Programada = {
    tipo: 'programada',
    id: c.id ?? crypto.randomUUID(),
    red: red.red,
    redId: red.id,
    estado,
    formato: c.tipo,
    texto: campos.texto,
    medios: campos.medios,
    portadaUrl: portadaDe(c.tipo, campos.medios, c.portadaUrl ?? null),
    fecha,
    error: null,
    urlPublicada: null,
    itemId: null,
  }
  piezas.push(pieza)
  opcionesPorPieza.set(pieza.id, campos.opciones)
  return { pieza, estado: 201 }
}

export function verPieza(id: string): Programada {
  exigirHabilitada()
  const p = piezas.find((x) => x.id === id)
  if (!p) throw NO_ENCONTRADO
  return p
}

export function editarPieza(id: string, c: CuerpoEditar): Programada {
  exigirHabilitada()
  const i = piezas.findIndex((x) => x.id === id)
  if (i < 0) throw NO_ENCONTRADO
  const actual = piezas[i]!
  const accion = c.accion ?? 'guardar'
  const red = REDES_MOCK.find((r) => r.id === actual.redId)!
  const campos = {
    tipo: c.tipo ?? actual.formato,
    texto: 'texto' in c ? (c.texto ?? null) : actual.texto,
    medios: c.medios ?? actual.medios,
    opciones: 'opciones' in c ? (c.opciones ?? null) : (opcionesPorPieza.get(id) ?? null),
  }
  const fecha = 'programadaPara' in c ? (c.programadaPara ?? null) : actual.fecha
  if (actual.estado === 'borrador' && accion === 'guardar') {
    if (!TIPOS_POR_RED[red.red].includes(campos.tipo))
      throw pedidoInvalido([`El tipo «${campos.tipo}» no existe en ${red.red}`])
  } else if (actual.estado === 'borrador') {
    consumirForzado()
    validarEnvio(
      red,
      campos,
      accion === 'publicar_ahora' ? new Date(mockPublicacion.ahora()).toISOString() : fecha,
      accion === 'publicar_ahora',
    )
  } else if (actual.estado === 'programada' && accion === 'guardar') {
    consumirForzado()
    validarEnvio(red, campos, fecha, false)
  } else {
    throw new ErrorMock(409, `No se puede ${accion} una pieza en estado ${actual.estado}`)
  }
  const estado: Programada['estado'] =
    actual.estado === 'borrador' && accion === 'programar'
      ? 'programada'
      : actual.estado === 'borrador' && accion === 'publicar_ahora'
        ? 'publicando'
        : actual.estado
  const nueva: Programada = {
    ...actual,
    estado,
    formato: campos.tipo,
    texto: campos.texto,
    medios: campos.medios,
    portadaUrl: portadaDe(
      campos.tipo,
      campos.medios,
      'portadaUrl' in c ? (c.portadaUrl ?? null) : (actual.portadaUrl ?? null),
    ),
    fecha: accion === 'publicar_ahora' ? new Date(mockPublicacion.ahora()).toISOString() : fecha,
  }
  piezas[i] = nueva
  opcionesPorPieza.set(id, campos.opciones)
  return nueva
}

export function cancelarPieza(id: string): void {
  exigirHabilitada()
  const i = piezas.findIndex((x) => x.id === id)
  if (i < 0) throw NO_ENCONTRADO
  const actual = piezas[i]!
  if (actual.estado === 'borrador') {
    piezas.splice(i, 1)
    return
  }
  if (actual.estado !== 'programada')
    throw new ErrorMock(409, `No se puede cancelar una pieza en estado ${actual.estado}`)
  consumirForzado()
  piezas[i] = { ...actual, estado: 'cancelada', error: null }
}

export function reintentarPieza(id: string): Programada {
  exigirHabilitada()
  const i = piezas.findIndex((x) => x.id === id)
  if (i < 0) throw NO_ENCONTRADO
  const actual = piezas[i]!
  if (actual.estado !== 'fallida')
    throw new ErrorMock(409, 'Solo se puede reintentar una pieza fallida')
  // Igual que el backend hoy: «No se publicó» tampoco se reintenta (se crea de nuevo).
  if (situacionDe(actual) !== 'fallida')
    throw new ErrorMock(409, 'Todavía estamos confirmando con Zernio qué pasó con esta pieza')
  consumirForzado()
  const nueva: Programada = { ...actual, estado: 'publicando', error: null }
  piezas[i] = nueva
  return nueva
}

/** Piezas del mes en hora de Buenos Aires, todas menos las canceladas (también las publicadas). */
export function programadasDelMes(mes: string): Programada[] {
  exigirHabilitada()
  return piezas.filter((p) => p.estado !== 'cancelada' && p.fecha && claveMes(p.fecha) === mes)
}

/** Borradores sin fecha, los más nuevos primero. */
export function borradoresSinFecha(): Programada[] {
  exigirHabilitada()
  return piezas.filter((p) => p.estado === 'borrador' && !p.fecha).reverse()
}

/** Lo que `GET /api/calendario` suma en `programadas`; con la publicación apagada, vacío. */
export function programadasParaElCalendario(mes: string): Programada[] {
  if (!mockPublicacion.habilitada) return []
  return programadasDelMes(mes)
}
