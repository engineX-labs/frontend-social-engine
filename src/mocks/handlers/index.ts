import type { ModoMocks } from '@/api/http'
import { calendarioHandlers } from './calendario'
import { chatHandlers } from './chat'
import { contextoHandlers } from './contexto'
import { publicacionHandlers } from './publicacion'
import { registroHandlers } from './registro'

export const handlers = [
  ...calendarioHandlers,
  ...publicacionHandlers,
  ...registroHandlers,
  ...contextoHandlers,
  ...chatHandlers,
]

/** Los handlers que corresponden al modo de mocks (ver `MODO_MOCKS` en `api/http.ts`). */
export function handlersPara(modo: ModoMocks) {
  if (modo === 'todo') return handlers
  if (modo === 'chat') return chatHandlers
  return []
}
