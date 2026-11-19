import { calendarioHandlers } from './calendario'
import { chatHandlers } from './chat'
import { publicacionHandlers } from './publicacion'
import { handlersPara } from './index'

describe('handlersPara', () => {
  it('"todo" simula calendario, publicar y chat (demo y tests)', () => {
    expect(handlersPara('todo')).toEqual([
      ...calendarioHandlers,
      ...publicacionHandlers,
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
