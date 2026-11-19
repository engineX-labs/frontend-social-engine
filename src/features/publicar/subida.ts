import { pedirSubida } from '@/api/publicacion'
import type { Medio, TipoPieza } from '@/domain/types'

/**
 * Subida de un archivo para publicar: el backend firma una URL (`POST /api/medios`) y el navegador
 * sube el archivo directo al almacenamiento de Zernio con un `PUT`. Es la única llamada del front que
 * no va a nuestra API (ver «Única excepción» en `AGENTS.md`): por eso el `PUT` no lleva token.
 */

export const TIPOS_ADMITIDOS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
] as const

/** Límite de Zernio y del backend (`MAX_MEDIO`): 5 GB. */
export const MAX_ARCHIVO = 5 * 1024 ** 3

export type TipoDeMedio = Medio['tipo']

export function tipoDeMedio(contentType: string): TipoDeMedio {
  return contentType.startsWith('video/') ? 'video' : 'imagen'
}

const LIMITE: Record<TipoPieza, number> = {
  foto: 1,
  historia: 1,
  reel: 1,
  video: 1,
  carrusel: 20,
  fotos: 35,
}

/** Cuántos archivos lleva como máximo cada tipo de pieza (el backend lo exige en `reglas.py`). */
export function limiteDeMedios(tipo: TipoPieza): number {
  return LIMITE[tipo]
}

/** El atributo `accept` del input según lo que admite cada tipo. */
export function aceptarDe(tipo: TipoPieza): string {
  const soloImagen = tipo === 'foto' || tipo === 'fotos'
  const soloVideo = tipo === 'reel' || tipo === 'video'
  return TIPOS_ADMITIDOS.filter((t) =>
    soloImagen ? t.startsWith('image/') : soloVideo ? t.startsWith('video/') : true,
  ).join(',')
}

const SOLO_IMAGEN: Partial<Record<TipoPieza, string>> = {
  foto: 'La foto lleva una imagen',
  fotos: 'Las fotos de TikTok llevan imágenes',
}
const SOLO_VIDEO: Partial<Record<TipoPieza, string>> = {
  reel: 'El reel lleva un video',
  video: 'El video de TikTok lleva un video',
}

/** Una pista corta de qué archivos van en cada tipo, para mostrar en la zona de subida. */
export function ayudaDeMedios(tipo: TipoPieza): string {
  const n = limiteDeMedios(tipo)
  if (tipo === 'foto') return 'Una imagen JPG, PNG o WebP.'
  if (tipo === 'fotos') return `De 1 a ${n} imágenes JPG, PNG o WebP.`
  if (tipo === 'reel' || tipo === 'video') return 'Un video MP4 o MOV.'
  if (tipo === 'historia') return 'Una imagen (JPG, PNG o WebP) o un video (MP4 o MOV).'
  return `De 2 a ${n} imágenes o videos (JPG, PNG, WebP, MP4 o MOV).`
}

/** El problema en castellano, o `null` si el archivo se puede subir para ese tipo de pieza. */
export function validarArchivo(
  archivo: { name: string; type: string; size: number },
  tipo: TipoPieza,
): string | null {
  const { name, type, size } = archivo
  if (!(TIPOS_ADMITIDOS as readonly string[]).includes(type))
    return `«${name}» no es un tipo de archivo admitido. Usá JPG, PNG, WebP, MP4 o MOV.`
  if (size <= 0) return `«${name}» está vacío.`
  if (size > MAX_ARCHIVO) return `«${name}» pesa más de 5 GB.`
  const medio = tipoDeMedio(type)
  const soloImagen = SOLO_IMAGEN[tipo]
  if (soloImagen && medio === 'video') return `«${name}» es un video. ${soloImagen}.`
  const soloVideo = SOLO_VIDEO[tipo]
  if (soloVideo && medio === 'imagen') return `«${name}» es una imagen. ${soloVideo}.`
  return null
}

/** El usuario canceló la subida. No es un fallo: no se muestra como error. */
export class SubidaCancelada extends Error {
  constructor() {
    super('Subida cancelada')
    this.name = 'SubidaCancelada'
  }
}

/**
 * El `PUT` al almacenamiento no salió bien (se cortó la red o respondió con un error).
 * No incluye la URL firmada: es de un solo uso y no tiene por qué quedar en un log.
 */
export class ErrorDeSubida extends Error {
  /** `null` si ni siquiera hubo respuesta (red caída, tiempo agotado, bloqueo de CORS). */
  status: number | null
  constructor(status: number | null) {
    super(
      status === null
        ? 'No se pudo subir el archivo. Revisá tu conexión.'
        : `No se pudo subir el archivo (error ${status}).`,
    )
    this.name = 'ErrorDeSubida'
    this.status = status
  }
}

export interface OpcionesDeSubida {
  /** Avance de 0 a 1 mientras se sube el archivo. */
  alProgreso?: (fraccion: number) => void
  /** Cancela el pedido de la URL o el `PUT` en curso. */
  senal?: AbortSignal
}

/** Rechaza con `SubidaCancelada` apenas se cancela, aunque `promesa` todavía no haya terminado. */
function conCancelacion<T>(promesa: Promise<T>, senal?: AbortSignal): Promise<T> {
  if (!senal) return promesa
  return new Promise<T>((resolver, rechazar) => {
    if (senal.aborted) {
      promesa.catch(() => {}) // ya no importa cómo termine: que no quede como error sin atender
      return rechazar(new SubidaCancelada())
    }
    const cancelar = () => rechazar(new SubidaCancelada())
    senal.addEventListener('abort', cancelar, { once: true })
    promesa.then(
      (v) => {
        senal.removeEventListener('abort', cancelar)
        resolver(v)
      },
      (e: unknown) => {
        senal.removeEventListener('abort', cancelar)
        rechazar(e)
      },
    )
  })
}

/** `PUT` del archivo a la URL firmada. XHR y no `fetch`: `fetch` no informa el progreso de subida. */
function subirConPut(
  uploadUrl: string,
  archivo: File,
  { alProgreso, senal }: OpcionesDeSubida,
): Promise<void> {
  return new Promise<void>((resolver, rechazar) => {
    if (senal?.aborted) return rechazar(new SubidaCancelada())
    const xhr = new XMLHttpRequest()
    const cancelar = () => xhr.abort()
    const limpiar = () => senal?.removeEventListener('abort', cancelar)
    xhr.open('PUT', uploadUrl)
    // Directo al almacenamiento de Zernio: sin `Authorization` ni cookies (el token es de nuestra API).
    xhr.withCredentials = false
    if (archivo.type) xhr.setRequestHeader('Content-Type', archivo.type)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) alProgreso?.(Math.min(1, e.loaded / e.total))
    }
    xhr.onload = () => {
      limpiar()
      if (xhr.status >= 200 && xhr.status < 300) {
        alProgreso?.(1)
        resolver()
      } else rechazar(new ErrorDeSubida(xhr.status))
    }
    xhr.onerror = () => {
      limpiar()
      rechazar(new ErrorDeSubida(null))
    }
    xhr.ontimeout = xhr.onerror
    xhr.onabort = () => {
      limpiar()
      rechazar(new SubidaCancelada())
    }
    senal?.addEventListener('abort', cancelar, { once: true })
    xhr.send(archivo)
  })
}

/**
 * Pide la URL firmada y sube el archivo. Resuelve con el medio listo para `medios[]` de la pieza.
 * Rechaza con `ApiError` si el backend no firma (422 tipo o tamaño, 404 con la publicación apagada),
 * con `ErrorDeSubida` si falla el `PUT`, o con `SubidaCancelada` si se cancela.
 */
export async function subirArchivo(archivo: File, opciones: OpcionesDeSubida = {}): Promise<Medio> {
  if (opciones.senal?.aborted) throw new SubidaCancelada() // ni siquiera se pide la URL
  const subida = await conCancelacion(
    pedirSubida({ nombre: archivo.name, contentType: archivo.type, tamanio: archivo.size }),
    opciones.senal,
  )
  await subirConPut(subida.uploadUrl, archivo, opciones)
  return { url: subida.publicUrl, tipo: tipoDeMedio(archivo.type) }
}
