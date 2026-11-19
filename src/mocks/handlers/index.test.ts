import { calendarioHandlers } from './calendario'
import { chatHandlers } from './chat'
import { contextoHandlers } from './contexto'
import { publicacionHandlers } from './publicacion'
import { registroHandlers } from './registro'
import { handlersPara } from './index'

describe('handlersPara', () => {
  it('"todo" simula calendario, publicar, alta, contexto y chat (demo y tests)', () => {
    expect(handlersPara('todo')).toEqual([
      ...calendarioHandlers,
      ...publicacionHandlers,
      ...registroHandlers,
      ...contextoHandlers,
      ...chatHandlers,
    ])
  })

  it('"chat" simula solo el chat: el calendario va al backend real', () => {
    expect(handlersPara('chat')).toEqual(chatHandlers)
  })

  it('"ninguno" no simula nada', () => {
    expect(handlersPara('ninguno')).toEqual([])
  })
})
