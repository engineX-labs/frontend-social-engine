import type { ComercioPropio, EstadoComercio, RedDeConexion, Yo } from '@/api/registro'
import { NOMBRE_COMERCIO_MAX } from '@/domain/registro'
import { verContexto } from './contexto'
import type { Red } from '@/domain/types'

/**
 * El alta y la conexión de redes del backend, en memoria. Copia el contrato de
 * `plans/registro-abierto.md` (mismos estados, códigos y mensajes) para el demo y los tests.
 *
 * El `estado` del comercio se calcula como en el backend: sin cuenta de Zernio → `en_preparacion`;
 * con cuenta y sin redes conectadas → `sin_redes`; con alguna red → `activo` (también si una pide reconectar).
 */
export class ErrorRegistroMock extends Error {
  status: number
  cuerpo: { detalle: string }
  constructor(status: number, detalle: string) {
    super(detalle)
    this.status = status
    this.cuerpo = { detalle }
  }
}

export const PLATAFORMAS: readonly Red[] = ['instagram', 'tiktok']

interface Estado {
  comercio: { id: string; nombre: string } | null
  /** `true` cuando ya cargamos la cuenta de Zernio del comercio (opción A). */
  cuentaLista: boolean
  redes: RedDeConexion[]
  /** Lo que el usuario autorizó en Zernio y todavía no sincronizamos. */
  pendiente: { plataforma: Red; reconectarRedId: string | null } | null
}

const ID_COMERCIO = '5a1f6c3e-8d2b-4f0a-9c7e-1b2d3e4f5a6b'

/** Los cuatro puntos de partida de la pantalla de entrada (ver `VITE_MOCK_ESTADO`). */
export type PuntoDePartida = 'sin_comercio' | EstadoComercio

const REDES_DEMO: RedDeConexion[] = [
  { id: 'red-ig', plataforma: 'instagram', username: 'casaalamo', estado: 'conectada' },
]

function partida(punto: PuntoDePartida): Estado {
  const comercio = { id: ID_COMERCIO, nombre: 'Casa Álamo' }
  switch (punto) {
    case 'sin_comercio':
      return { comercio: null, cuentaLista: false, redes: [], pendiente: null }
    case 'en_preparacion':
      return { comercio, cuentaLista: false, redes: [], pendiente: null }
    case 'sin_redes':
      return { comercio, cuentaLista: true, redes: [], pendiente: null }
    case 'activo':
      return { comercio, cuentaLista: true, redes: structuredClone(REDES_DEMO), pendiente: null }
  }
}

function puntoInicial(): PuntoDePartida {
  const valor = import.meta.env.VITE_MOCK_ESTADO as string | undefined
  return valor === 'sin_comercio' ||
    valor === 'en_preparacion' ||
    valor === 'sin_redes' ||
    valor === 'activo'
    ? valor
    : 'activo'
}

let estado = partida(puntoInicial())

/** Para los tests: deja el mock en uno de los cuatro estados de partida. */
export function fijarRegistro(punto: PuntoDePartida) {
  estado = partida(punto)
}

/** Para los tests: el equipo carga la cuenta de Zernio (`cargar-cuenta`). */
export function cargarCuentaDeZernio() {
  estado.cuentaLista = true
}

export function reiniciarRegistro() {
  estado = partida(puntoInicial())
}

export function estadoDelComercio(): EstadoComercio {
  if (!estado.cuentaLista) return 'en_preparacion'
  // Como el backend: con alguna red (aunque pida reconectar) el comercio está activo.
  return estado.redes.length > 0 ? 'activo' : 'sin_redes'
}

function comercioActual(): ComercioPropio | null {
  return (
    estado.comercio && {
      ...estado.comercio,
      estado: estadoDelComercio(),
      contexto: verContexto().estado,
    }
  )
}

export function yo(): Yo {
  return { comercio: comercioActual() }
}

export function crearComercio(cuerpo: { nombre?: unknown }): {
  comercio: ComercioPropio
  estado: 200 | 201
} {
  if (estado.comercio) return { comercio: comercioActual()!, estado: 200 }
  const nombre = typeof cuerpo.nombre === 'string' ? cuerpo.nombre.trim() : ''
  if (nombre.length < 1 || nombre.length > NOMBRE_COMERCIO_MAX)
    throw new ErrorRegistroMock(
      422,
      `El nombre debe tener entre 1 y ${NOMBRE_COMERCIO_MAX} caracteres`,
    )
  estado.comercio = { id: ID_COMERCIO, nombre }
  return { comercio: comercioActual()!, estado: 201 }
}

function exigirComercio() {
  if (!estado.comercio)
    throw new ErrorRegistroMock(403, 'Tu usuario todavía no tiene un comercio asignado')
}

export function redesDeConexion() {
  exigirComercio()
  return {
    redes: estado.redes,
    plataformasFaltantes: PLATAFORMAS.filter((p) => !estado.redes.some((r) => r.plataforma === p)),
  }
}

/** Devuelve la `authUrl`. El «Zernio» del mock vuelve directo a la app, como el real. */
export function iniciarConexion(plataforma: string, reconectarRedId: string | null): string {
  exigirComercio()
  if (!PLATAFORMAS.includes(plataforma as Red))
    throw new ErrorRegistroMock(400, 'Plataforma no soportada')
  if (!estado.cuentaLista) throw new ErrorRegistroMock(409, 'Tu cuenta todavía se está preparando')
  if (reconectarRedId && !estado.redes.some((r) => r.id === reconectarRedId))
    throw new ErrorRegistroMock(404, 'Red no encontrada')
  estado.pendiente = { plataforma: plataforma as Red, reconectarRedId }
  return `${window.location.origin}/`
}

export function sincronizar(): { nuevas: number; redes: RedDeConexion[] } {
  exigirComercio()
  if (!estado.cuentaLista) throw new ErrorRegistroMock(409, 'Tu cuenta todavía se está preparando')
  const pendiente = estado.pendiente
  estado.pendiente = null
  let nuevas = 0
  if (pendiente) {
    const previa = estado.redes.find(
      (r) => r.id === pendiente.reconectarRedId || r.plataforma === pendiente.plataforma,
    )
    if (previa) previa.estado = 'conectada'
    else {
      estado.redes.push({
        id: `red-${pendiente.plataforma}`,
        plataforma: pendiente.plataforma,
        username: `${pendiente.plataforma}.demo`,
        estado: 'conectada',
      })
      nuevas = 1
    }
  }
  return { nuevas, redes: estado.redes }
}

/** Para los tests: una red que Zernio dejó con el permiso vencido. */
export function marcarParaReconectar(plataforma: Red) {
  const red = estado.redes.find((r) => r.plataforma === plataforma)
  if (red) red.estado = 'hay_que_reconectar'
}

export function agregarRedMock(red: RedDeConexion) {
  estado.redes.push(red)
}
