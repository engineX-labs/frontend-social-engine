import { crearParserSse, leerEventosSse } from './sse'

describe('parser SSE', () => {
  it('lee un evento con data', () => {
    const p = crearParserSse()
    expect(p.alimentar('data: {"delta":"Hola"}\n\n')).toEqual([
      { evento: 'message', datos: '{"delta":"Hola"}' },
    ])
  })
  it('junta trozos cortados a mitad de línea y de evento', () => {
    const p = crearParserSse()
    expect(p.alimentar('da')).toEqual([])
    expect(p.alimentar('ta: {"delta":"Ho')).toEqual([])
    expect(p.alimentar('la"}\n')).toEqual([])
    expect(p.alimentar('\ndata: [DONE]\n\n')).toEqual([
      { evento: 'message', datos: '{"delta":"Hola"}' },
      { evento: 'message', datos: '[DONE]' },
    ])
  })
  it('acepta \\r\\n, incluso partido entre chunks', () => {
    const p = crearParserSse()
    expect(p.alimentar('data: a\r')).toEqual([])
    expect(p.alimentar('\n\r\ndata: b\r\n\r\n')).toEqual([
      { evento: 'message', datos: 'a' },
      { evento: 'message', datos: 'b' },
    ])
  })
  it('une varias líneas data, ignora comentarios y toma el nombre del evento', () => {
    const p = crearParserSse()
    expect(p.alimentar(': keep-alive\nevent: error\ndata: uno\ndata:dos\n\n')).toEqual([
      { evento: 'error', datos: 'uno\ndos' },
    ])
  })
  it('emite el evento pendiente al cerrar', () => {
    const p = crearParserSse()
    p.alimentar('data: final')
    expect(p.cerrar()).toEqual([{ evento: 'message', datos: 'final' }])
  })
  it('lee un ReadableStream con caracteres multibyte partidos', async () => {
    const bytes = new TextEncoder().encode('data: {"delta":"ñandú"}\n\ndata: [DONE]\n\n')
    const corte = bytes.indexOf(0xc3) + 1 // en medio de la "ñ"
    const cuerpo = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(bytes.slice(0, corte))
        c.enqueue(bytes.slice(corte))
        c.close()
      },
    })
    const eventos = []
    for await (const e of leerEventosSse(cuerpo)) eventos.push(e.datos)
    expect(eventos).toEqual(['{"delta":"ñandú"}', '[DONE]'])
  })
})
