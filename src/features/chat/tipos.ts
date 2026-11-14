export type RolChat = 'usuario' | 'fidel'

/** Mensaje tal como viaja a la API. */
export interface MensajeApi {
  rol: RolChat
  texto: string
}

/** Cuerpo de `POST /api/chat`. */
export interface PeticionChat {
  mensajes: MensajeApi[]
  /** Publicación o idea sobre la que se pregunta. */
  itemId?: string
}

export interface MensajeChat {
  id: string
  rol: RolChat
  texto: string
  /** `streaming`: Fidel todavía escribe. `detenido`: lo cortó el usuario. */
  estado: 'listo' | 'streaming' | 'error' | 'detenido'
  /** Solo en mensajes del usuario: contexto con el que se preguntó. */
  itemId?: string
  error?: string
}

/** Máximo de caracteres de una pregunta. */
export const MAX_CARACTERES = 1000
