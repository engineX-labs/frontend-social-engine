import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { chatMock } from '@/mocks/handlers/chat'
import { server } from '@/mocks/server'
import { crearRouter } from '@/router'
import type { PeticionChat } from './tipos'

const enc = new TextEncoder()
const delta = (t: string) => enc.encode(`data: ${JSON.stringify({ delta: t })}\n\n`)
const FIN = enc.encode('data: [DONE]\n\n')
const SSE = { 'Content-Type': 'text/event-stream' }

function montar(ruta = '/chat') {
  const router = crearRouter(createMemoryHistory({ initialEntries: [ruta] }))
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

/** Stream que el test avanza a mano. */
function streamControlado() {
  let c!: ReadableStreamDefaultController<Uint8Array>
  const cuerpo = new ReadableStream<Uint8Array>({ start: (x) => void (c = x) })
  return { cuerpo, enviar: (b: Uint8Array) => c.enqueue(b), cerrar: () => c.close() }
}

beforeEach(() => {
  chatMock.retardoMs = 0
})

describe('chat con Fidel', () => {
  it('muestra bienvenida y sugerencias; una sugerencia envía la pregunta', async () => {
    montar()
    expect(await screen.findByText('Hola, soy Fidel')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '¿A qué hora me conviene publicar?' }))
    expect(await screen.findByText(/De 18 a 22 h tu mediana/)).toBeInTheDocument()
    expect(screen.queryByText('Hola, soy Fidel')).not.toBeInTheDocument()
  })

  it('Enter envía y Shift+Enter hace salto de línea', async () => {
    let peticion: PeticionChat | undefined
    server.use(
      http.post('*/api/chat', async ({ request }) => {
        peticion = (await request.json()) as PeticionChat
        return new HttpResponse(
          new ReadableStream({
            start(c) {
              c.enqueue(delta('Dale'))
              c.enqueue(FIN)
              c.close()
            },
          }),
          { headers: SSE },
        )
      }),
    )
    montar()
    const caja = await screen.findByRole('textbox', { name: 'Escribile a Fidel' })
    await userEvent.type(caja, 'línea uno{Shift>}{Enter}{/Shift}línea dos')
    expect(caja).toHaveValue('línea uno\nlínea dos')
    expect(peticion).toBeUndefined()
    await userEvent.keyboard('{Enter}')
    expect(await screen.findByText('Dale')).toBeInTheDocument()
    expect(peticion).toEqual({ mensajes: [{ rol: 'usuario', texto: 'línea uno\nlínea dos' }] })
    expect(caja).toHaveValue('')
  })

  it('el botón enviar está deshabilitado con texto vacío', async () => {
    montar()
    const enviar = await screen.findByRole('button', { name: 'Enviar' })
    expect(enviar).toBeDisabled()
    await userEvent.type(screen.getByRole('textbox'), '   ')
    expect(enviar).toBeDisabled()
    await userEvent.type(screen.getByRole('textbox'), 'hola')
    expect(enviar).toBeEnabled()
  })

  it('pinta el texto de a poco, muestra "escribiendo" y bloquea el envío hasta terminar', async () => {
    const s = streamControlado()
    server.use(http.post('*/api/chat', () => new HttpResponse(s.cuerpo, { headers: SSE })))
    montar()
    await userEvent.type(await screen.findByRole('textbox'), 'hola{Enter}')
    expect(await screen.findByText('Fidel está escribiendo…')).toBeInTheDocument()
    expect(screen.getByRole('log')).toHaveAttribute('aria-busy', 'true')

    s.enviar(delta('Tu mejor '))
    expect(await screen.findByText('Tu mejor')).toBeInTheDocument()
    expect(screen.queryByText('Fidel está escribiendo…')).not.toBeInTheDocument()
    s.enviar(delta('reel fue el del martes.'))
    expect(await screen.findByText('Tu mejor reel fue el del martes.')).toBeInTheDocument()

    // Mientras responde se puede escribir pero no enviar.
    await userEvent.type(screen.getByRole('textbox'), 'otra{Enter}')
    expect(screen.getByRole('textbox')).toHaveValue('otra')
    expect(screen.getByRole('button', { name: 'Detener respuesta' })).toBeInTheDocument()

    s.enviar(FIN)
    s.cerrar()
    expect(await screen.findByRole('button', { name: 'Enviar' })).toBeEnabled()
    expect(screen.getByRole('log')).toHaveAttribute('aria-busy', 'false')
  })

  it('detener corta la respuesta y conserva lo que ya llegó', async () => {
    const s = streamControlado()
    server.use(http.post('*/api/chat', () => new HttpResponse(s.cuerpo, { headers: SSE })))
    montar()
    await userEvent.type(await screen.findByRole('textbox'), 'hola{Enter}')
    s.enviar(delta('Empiezo a contarte'))
    await screen.findByText('Empiezo a contarte')
    await userEvent.click(screen.getByRole('button', { name: 'Detener respuesta' }))
    expect(await screen.findByText('Detuviste la respuesta.')).toBeInTheDocument()
    expect(screen.getByText('Empiezo a contarte')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeInTheDocument()
  })

  it('si falla muestra el error y "Reintentar" vuelve a preguntar', async () => {
    let llamadas = 0
    const cuerpos: PeticionChat[] = []
    server.use(
      http.post('*/api/chat', async ({ request }) => {
        cuerpos.push((await request.json()) as PeticionChat)
        llamadas++
        const falla = llamadas === 1
        return new HttpResponse(
          new ReadableStream({
            start(c) {
              if (falla) {
                c.enqueue(delta('Parcial'))
                c.enqueue(enc.encode('event: error\ndata: {"detalle":"Se cortó todo."}\n\n'))
              } else {
                c.enqueue(delta('Ahora sí.'))
                c.enqueue(FIN)
              }
              c.close()
            },
          }),
          { headers: SSE },
        )
      }),
    )
    montar()
    await userEvent.type(await screen.findByRole('textbox'), 'hola{Enter}')
    const alerta = await screen.findByRole('alert')
    expect(within(alerta).getByText('Se cortó todo.')).toBeInTheDocument()
    await userEvent.click(within(alerta).getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Ahora sí.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText('Parcial')).not.toBeInTheDocument()
    // La respuesta fallida no viaja en el historial del reintento.
    expect(cuerpos[1]).toEqual({ mensajes: [{ rol: 'usuario', texto: 'hola' }] })
  })

  it('un error HTTP también ofrece reintentar', async () => {
    server.use(
      http.post('*/api/chat', () =>
        HttpResponse.json({ detalle: 'Servicio caído' }, { status: 503 }),
      ),
    )
    montar()
    await userEvent.type(await screen.findByRole('textbox'), 'hola{Enter}')
    expect(await screen.findByText('Servicio caído')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('un stream que se corta sin [DONE] es un error', async () => {
    server.use(
      http.post(
        '*/api/chat',
        () =>
          new HttpResponse(
            new ReadableStream({ start: (c) => (c.enqueue(delta('Hola')), c.close()) }),
            { headers: SSE },
          ),
      ),
    )
    montar()
    await userEvent.type(await screen.findByRole('textbox'), 'hola{Enter}')
    expect(await screen.findByText('Se cortó la conexión con Fidel.')).toBeInTheDocument()
  })

  it('el mock simula el error con "/error" y se recupera al reintentar', async () => {
    montar()
    await userEvent.type(await screen.findByRole('textbox'), 'qué hora /error-test{Enter}')
    await userEvent.click(await screen.findByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText(/De 18 a 22 h tu mediana/)).toBeInTheDocument()
  })

  it('con ?item= muestra el chip de contexto y lo manda en la pregunta', async () => {
    let peticion: PeticionChat | undefined
    server.use(
      http.post('*/api/chat', async ({ request }) => {
        peticion = (await request.json()) as PeticionChat
        return new HttpResponse(
          new ReadableStream({
            start(c) {
              c.enqueue(delta('Ok'))
              c.enqueue(FIN)
              c.close()
            },
          }),
          { headers: SSE },
        )
      }),
    )
    montar('/chat?item=pub-1')
    expect(await screen.findByText(/Reel del 5 nov/)).toBeInTheDocument()
    await userEvent.type(screen.getByRole('textbox'), 'qué onda{Enter}')
    await waitFor(() => expect(peticion?.itemId).toBe('pub-1'))
    await userEvent.click(screen.getByRole('button', { name: /Quitar el contexto/ }))
    expect(screen.queryByTestId('contexto-texto')).not.toBeInTheDocument()
  })

  it('las respuestas del mock sobre una publicación enlazan al calendario', async () => {
    montar('/chat?item=pub-1')
    await userEvent.type(await screen.findByRole('textbox'), 'contame{Enter}')
    const enlace = await screen.findByRole('link', { name: 'Ver la publicación' })
    expect(enlace).toHaveAttribute('href', expect.stringContaining('item=pub-1'))
    expect(enlace).toHaveAttribute('href', expect.stringContaining('mes=2026-11'))
  })
})
