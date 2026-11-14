import { API_URL, ApiError } from '@/api/http'
import { leerEventosSse } from './sse'
import type { PeticionChat } from './tipos'

/** El stream falló a mitad de camino o el servidor mandó `event: error`. */
export class ChatStreamError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ChatStreamError'
  }
}

function mensajeDeError(datos: string): string {
  try {
    const v = JSON.parse(datos) as { detalle?: unknown; mensaje?: unknown }
    if (typeof v.detalle === 'string') return v.detalle
    if (typeof v.mensaje === 'string') return v.mensaje
  } catch {
    if (datos) return datos
  }
  return 'Fidel tuvo un problema.'
}

/**
 * `POST /api/chat` con respuesta `text/event-stream`. Emite cada `delta` de texto.
 * Termina con `data: [DONE]`; si el stream se corta antes, lanza `ChatStreamError`.
 * Cancelar con `signal` corta la conexión (lanza `AbortError`).
 */
export async function* streamChat(
  peticion: PeticionChat,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const url = new URL('/api/chat', API_URL || window.location.origin)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(peticion),
    signal,
  })
  if (!res.ok) {
    const cuerpo = (await res.json().catch(() => null)) as { detalle?: string } | null
    throw new ApiError(res.status, cuerpo?.detalle ?? `Error ${res.status}`)
  }
  if (!res.body) throw new ChatStreamError('La respuesta no trae contenido.')

  for await (const ev of leerEventosSse(res.body)) {
    if (ev.evento === 'error') throw new ChatStreamError(mensajeDeError(ev.datos))
    if (ev.datos === '[DONE]') return
    let delta: unknown
    try {
      delta = (JSON.parse(ev.datos) as { delta?: unknown }).delta
    } catch {
      throw new ChatStreamError('Fidel mandó una respuesta ilegible.')
    }
    if (typeof delta === 'string' && delta) yield delta
  }
  throw new ChatStreamError('Se cortó la conexión con Fidel.')
}
