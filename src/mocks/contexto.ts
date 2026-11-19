import type { Contexto, Pregunta, Respuestas } from '@/domain/contexto'
import type { PerfilInterpretado, PerfilMarca } from '@/domain/perfilMarca'

/** El backend del cuestionario y del perfil de marca, en memoria y con las mismas reglas y mensajes. */
export class ErrorContexto extends Error {
  status: number
  cuerpo: Record<string, unknown>
  constructor(status: number, cuerpo: Record<string, unknown>) {
    super(String(cuerpo.detalle))
    this.status = status
    this.cuerpo = cuerpo
  }
}

export const PREGUNTAS_MOCK: Pregunta[] = [
  {
    id: 'rubro',
    texto: '¿Cuál es el rubro de tu negocio?',
    tipo: 'opcion',
    obligatoria: true,
    opciones: [
      { valor: 'gastronomia', etiqueta: 'Gastronomía' },
      { valor: 'indumentaria', etiqueta: 'Indumentaria y accesorios' },
      { valor: 'belleza', etiqueta: 'Belleza y cuidado personal' },
      { valor: 'servicios', etiqueta: 'Servicios profesionales' },
      { valor: 'productos', etiqueta: 'Productos para el hogar' },
    ],
    permiteOtro: true,
    maxLargo: 80,
  },
  {
    id: 'objetivo',
    texto: '¿Qué querés lograr principalmente con tus redes?',
    tipo: 'opcion',
    obligatoria: true,
    opciones: [
      { valor: 'visitas_local', etiqueta: 'Que vengan al local' },
      { valor: 'whatsapp', etiqueta: 'Pedidos o reservas por WhatsApp' },
      { valor: 'venta_online', etiqueta: 'Vender online' },
      { valor: 'seguidores', etiqueta: 'Ganar seguidores' },
      { valor: 'marca', etiqueta: 'Que conozcan la marca' },
    ],
  },
  {
    id: 'producto_estrella',
    texto: '¿Qué vendés y cuál es tu producto o servicio estrella?',
    tipo: 'texto',
    obligatoria: false,
    maxLargo: 200,
  },
  {
    id: 'zona',
    texto: '¿En qué zona o ciudad estás?',
    tipo: 'texto',
    obligatoria: false,
    maxLargo: 80,
  },
  { id: 'publico', texto: '¿A quién le hablás?', tipo: 'texto', obligatoria: false, maxLargo: 200 },
  {
    id: 'quien_publica',
    texto: '¿Quién publica en tus redes?',
    tipo: 'opcion',
    obligatoria: false,
    opciones: [
      { valor: 'yo', etiqueta: 'Yo' },
      { valor: 'equipo', etiqueta: 'Alguien de mi equipo' },
      { valor: 'agencia', etiqueta: 'Una agencia o community manager' },
    ],
  },
  {
    id: 'que_puede_producir',
    texto: '¿Qué podés producir?',
    tipo: 'multiple',
    obligatoria: false,
    opciones: [
      { valor: 'fotos_producto', etiqueta: 'Fotos de producto' },
      { valor: 'video_camara', etiqueta: 'Videos hablando a cámara' },
      { valor: 'video_proceso', etiqueta: 'Videos del proceso' },
      { valor: 'carruseles', etiqueta: 'Carruseles con texto' },
      { valor: 'nada_video', etiqueta: 'Nada de video' },
    ],
  },
  {
    id: 'tono',
    texto: '¿Con qué tono querés que hablemos?',
    tipo: 'opcion',
    obligatoria: false,
    opciones: [
      { valor: 'cercano', etiqueta: 'Cercano' },
      { valor: 'profesional', etiqueta: 'Profesional' },
      { valor: 'divertido', etiqueta: 'Divertido' },
    ],
    permiteOtro: true,
    maxLargo: 80,
  },
  {
    id: 'evitar',
    texto: '¿Hay temas o palabras que prefieras evitar?',
    tipo: 'texto',
    obligatoria: false,
    maxLargo: 200,
  },
]

export const LIMITE_GENERACIONES_POR_DIA = 3
export const MENSAJE_LIMITE = 'Ya generaste tu perfil 3 veces hoy. Probá de nuevo mañana.'

export interface ConfigPerfilMock {
  /** Cómo termina la próxima generación. */
  resultado: 'listo' | 'error' | 'sin_datos'
  /** Cuántas consultas (GET) pasan en `generando` antes de terminar. */
  consultasHastaTerminar: number
}

const CALCULADO = {
  publicacionesUsadas: 24,
  formatos: [
    { formato: 'reel', cantidad: 12, porcentaje: 50 },
    { formato: 'carrusel', cantidad: 7, porcentaje: 29 },
    { formato: 'foto', cantidad: 5, porcentaje: 21 },
  ],
  porSemana: 2.8,
  diasHabituales: ['martes', 'jueves', 'sábado'],
  horasHabituales: [12, 19, 21],
  hashtagsTop: ['#cafedeespecialidad', '#palermo', '#barista'],
  mejorFormato: 'reel',
}
const INTERPRETADO: PerfilInterpretado = {
  temas: ['café de especialidad', 'recetas y preparaciones', 'vida de barrio'],
  tono: 'Cercano y cálido, con humor suave',
  estiloVisual: 'Fotos luminosas con tonos tierra y primeros planos de las preparaciones',
  publico: 'Vecinos y amantes del café que buscan un lugar tranquilo',
}

let contexto: Contexto
let perfil: PerfilMarca
let config: ConfigPerfilMock
let generadosHoy: number
let consultasEnGeneracion: number

export function reiniciarContexto() {
  contexto = { version: 1, estado: 'pendiente', preguntas: PREGUNTAS_MOCK, respuestas: {} }
  perfil = {
    estado: 'ninguno',
    calculado: null,
    interpretado: null,
    confirmado: null,
    generadoEn: null,
    error: null,
  }
  config = { resultado: 'listo', consultasHastaTerminar: 2 }
  generadosHoy = 0
  consultasEnGeneracion = 0
}
reiniciarContexto()

/** Para tests y para armar escenarios: estado inicial del perfil y de la próxima generación. */
export function configurarPerfilMock(
  cambios: Partial<ConfigPerfilMock> & { perfil?: PerfilMarca },
) {
  const { perfil: nuevo, ...resto } = cambios
  config = { ...config, ...resto }
  if (nuevo) perfil = nuevo
}

export const perfilListoMock = (): PerfilMarca => ({
  estado: 'listo',
  calculado: CALCULADO,
  interpretado: INTERPRETADO,
  confirmado: null,
  generadoEn: '2026-11-18T17:05:00.000Z',
  error: null,
})

export function verContexto(): Contexto {
  return contexto
}

/** Valida contra el catálogo como el backend: 422 con `problemas` por pregunta. */
export function guardarContexto(cuerpo: { respuestas?: Respuestas; saltear?: boolean }): Contexto {
  const entrada = cuerpo.respuestas ?? {}
  const problemas: Record<string, string> = {}
  const limpias: Respuestas = {}
  for (const id of Object.keys(entrada))
    if (!PREGUNTAS_MOCK.some((p) => p.id === id)) problemas[id] = 'Pregunta desconocida'
  for (const p of PREGUNTAS_MOCK) {
    const v = entrada[p.id]
    const vacia = v === undefined || (Array.isArray(v) ? v.length === 0 : v.trim() === '')
    if (vacia) {
      if (p.obligatoria) problemas[p.id] = 'Esta pregunta es obligatoria'
      continue
    }
    const validas = (p.opciones ?? []).map((o) => o.valor)
    const max = p.maxLargo ?? 200
    if (p.tipo === 'multiple') {
      if (!Array.isArray(v) || v.some((x) => !validas.includes(x)))
        problemas[p.id] = 'Elegí solo entre las opciones'
      else limpias[p.id] = v
    } else if (typeof v !== 'string') problemas[p.id] = 'Respuesta inválida'
    else if (v.trim().length > max) problemas[p.id] = `Máximo ${max} caracteres`
    else if (p.tipo === 'opcion' && !p.permiteOtro && !validas.includes(v.trim()))
      problemas[p.id] = 'Elegí una de las opciones'
    else limpias[p.id] = v.trim()
  }
  if (Object.keys(problemas).length > 0)
    throw new ErrorContexto(422, { detalle: 'Hay respuestas inválidas', problemas })
  contexto = { ...contexto, respuestas: limpias, estado: cuerpo.saltear ? 'salteado' : 'completo' }
  return contexto
}

export function verPerfil(): PerfilMarca {
  if (perfil.estado === 'generando') {
    consultasEnGeneracion += 1
    if (consultasEnGeneracion >= config.consultasHastaTerminar) {
      const generadoEn = new Date().toISOString()
      perfil =
        config.resultado === 'listo'
          ? { ...perfilListoMock(), generadoEn }
          : config.resultado === 'sin_datos'
            ? { ...perfil, estado: 'sin_datos', generadoEn }
            : {
                ...perfil,
                estado: 'error',
                generadoEn,
                error: 'No pudimos interpretar tus publicaciones',
              }
    }
  }
  return perfil
}

export function generarPerfil(): PerfilMarca {
  if (perfil.estado === 'generando') return perfil
  if (generadosHoy >= LIMITE_GENERACIONES_POR_DIA)
    throw new ErrorContexto(429, { detalle: MENSAJE_LIMITE })
  generadosHoy += 1
  consultasEnGeneracion = 0
  perfil = { ...perfil, estado: 'generando', error: null, interpretado: null, generadoEn: null }
  return perfil
}

export function confirmarPerfil(confirmado: Partial<PerfilInterpretado> | undefined): PerfilMarca {
  if (perfil.estado !== 'listo')
    throw new ErrorContexto(409, { detalle: 'Todavía no hay un perfil para confirmar' })
  const c = confirmado
  if (
    !c ||
    !Array.isArray(c.temas) ||
    c.temas.length === 0 ||
    !c.tono?.trim() ||
    !c.estiloVisual?.trim() ||
    !c.publico?.trim()
  )
    throw new ErrorContexto(422, { detalle: 'Completá los temas, el tono, el estilo y el público' })
  perfil = { ...perfil, confirmado: c as PerfilInterpretado }
  return perfil
}
