/** Parser de Server-Sent Events (https://html.spec.whatwg.org/multipage/server-sent-events.html). */
export interface EventoSse {
  /** Nombre del evento (`event:`); `message` si no vino. */
  evento: string
  /** Líneas `data:` unidas con salto de línea. */
  datos: string
}

export interface ParserSse {
  /** Procesa un trozo de texto (puede cortar líneas y eventos a la mitad) y devuelve los eventos completos. */
  alimentar(trozo: string): EventoSse[]
  /** Fin del stream: emite el evento pendiente, si lo hay. */
  cerrar(): EventoSse[]
}

export function crearParserSse(): ParserSse {
  let resto = ''
  let evento = ''
  let datos: string[] = []
  // Un "\r" al final del trozo puede ser la mitad de un "\r\n"; se resuelve con el trozo siguiente.
  let cortePendiente = false

  function despachar(salida: EventoSse[]) {
    if (datos.length) salida.push({ evento: evento || 'message', datos: datos.join('\n') })
    evento = ''
    datos = []
  }

  function linea(texto: string, salida: EventoSse[]) {
    if (texto === '') return despachar(salida)
    if (texto.startsWith(':')) return // comentario / keep-alive
    const i = texto.indexOf(':')
    const campo = i === -1 ? texto : texto.slice(0, i)
    let valor = i === -1 ? '' : texto.slice(i + 1)
    if (valor.startsWith(' ')) valor = valor.slice(1)
    if (campo === 'event') evento = valor
    else if (campo === 'data') datos.push(valor)
    // `id` y `retry` no se usan.
  }

  return {
    alimentar(trozo) {
      const salida: EventoSse[] = []
      let texto = resto + trozo
      if (cortePendiente && texto.startsWith('\n')) texto = texto.slice(1)
      cortePendiente = false
      let desde = 0
      for (let i = 0; i < texto.length; i++) {
        const c = texto[i]
        if (c !== '\n' && c !== '\r') continue
        if (c === '\r') {
          if (i + 1 === texto.length) cortePendiente = true
          else if (texto[i + 1] === '\n') {
            linea(texto.slice(desde, i), salida)
            i++
            desde = i + 1
            continue
          }
        }
        linea(texto.slice(desde, i), salida)
        desde = i + 1
      }
      resto = texto.slice(desde)
      return salida
    },
    cerrar() {
      const salida: EventoSse[] = []
      if (resto) linea(resto, salida)
      resto = ''
      despachar(salida)
      return salida
    },
  }
}

/** Lee un `ReadableStream` de bytes y emite los eventos SSE a medida que llegan. */
export async function* leerEventosSse(
  cuerpo: ReadableStream<Uint8Array>,
): AsyncGenerator<EventoSse> {
  const parser = crearParserSse()
  const decodificador = new TextDecoder()
  const lector = cuerpo.getReader()
  try {
    for (;;) {
      const { done, value } = await lector.read()
      if (done) break
      yield* parser.alimentar(decodificador.decode(value, { stream: true }))
    }
    yield* parser.alimentar(decodificador.decode())
    yield* parser.cerrar()
  } finally {
    await lector.cancel().catch(() => {})
    lector.releaseLock()
  }
}
