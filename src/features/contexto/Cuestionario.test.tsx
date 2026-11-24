import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { vi } from 'vitest'
import type { Contexto } from '@/domain/contexto'
import { PREGUNTAS_MOCK } from '@/mocks/contexto'
import { server } from '@/mocks/server'
import { Cuestionario } from './Cuestionario'

function montar(onTerminar = vi.fn()) {
  const ui = () => (
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <Cuestionario onTerminar={onTerminar} />
    </QueryClientProvider>
  )
  const r = render(ui())
  return { onTerminar, ...r, remontar: () => r.rerender(ui()) }
}

const titulo = (texto: RegExp | string) => screen.findByRole('heading', { name: texto })
const siguiente = () => userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))

async function contestarObligatorias() {
  await titulo(/rubro/)
  await userEvent.click(screen.getByRole('radio', { name: 'Gastronomía' }))
  await siguiente()
  await titulo(/querés lograr/)
  await userEvent.click(screen.getByRole('radio', { name: 'Ganar seguidores' }))
  await siguiente()
}

/** Contesta de la 3 a la 8 (texto, zona, público, quién publica, qué produce, tono). */
async function contestarHastaLaUltima() {
  await contestarObligatorias()
  await titulo(/producto o servicio estrella/)
  await userEvent.type(screen.getByRole('textbox'), 'Ramos')
  await siguiente()
  await titulo(/zona o ciudad/)
  await userEvent.type(screen.getByRole('textbox'), 'Rosario')
  await siguiente()
  await titulo(/A quién le hablás/)
  await userEvent.type(screen.getByRole('textbox'), 'Familias')
  await siguiente()
  await titulo(/Quién publica/)
  await userEvent.click(screen.getByRole('radio', { name: 'Yo' }))
  await siguiente()
  await titulo(/Qué podés producir/)
  await userEvent.click(screen.getByRole('checkbox', { name: 'Fotos de producto' }))
  await siguiente()
  await titulo(/tono/)
  await userEvent.click(screen.getByRole('radio', { name: 'Cercano' }))
  await siguiente()
  await titulo(/evitar/)
  await userEvent.type(screen.getByRole('textbox'), 'Política')
}

describe('Cuestionario', () => {
  it('dibuja las preguntas del catálogo, todas obligatorias y sin «Saltear»', async () => {
    montar()
    expect(await titulo(/rubro/)).toBeInTheDocument()
    expect(screen.getByText('Pregunta 1 de 9')).toBeInTheDocument()
    expect(screen.queryByText('Obligatoria')).toBeNull()
    expect(screen.queryByText('Opcional')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Saltear' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Saltear el resto' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Atrás' })).toBeDisabled()
  })

  it('no avanza sin responder una obligatoria y lo explica en su pregunta', async () => {
    montar()
    await titulo(/rubro/)
    await siguiente()
    expect(await screen.findByRole('alert')).toHaveTextContent('Elegí una opción')
    expect(screen.getByText(/Pregunta 1 de 9/)).toBeInTheDocument()
  })

  it('una pregunta que el catálogo marca como opcional tampoco se puede dejar vacía', async () => {
    montar()
    await contestarObligatorias()
    await titulo(/producto o servicio estrella/)
    expect(screen.queryByRole('button', { name: /Saltear/ })).toBeNull()
    await siguiente()
    expect(await screen.findByRole('alert')).toHaveTextContent('Esta pregunta es obligatoria')
    expect(screen.getByText(/Pregunta 3 de 9/)).toBeInTheDocument()
  })

  it('completa las nueve preguntas (con «Otro» y varias opciones) y termina como completo', async () => {
    let cuerpo: { saltear?: boolean; respuestas: Record<string, unknown> } | undefined
    server.use(
      http.put('*/api/contexto', async ({ request }) => {
        cuerpo = (await request.clone().json()) as typeof cuerpo
        return HttpResponse.json({
          version: 1,
          estado: 'completo',
          preguntas: PREGUNTAS_MOCK,
          respuestas: cuerpo!.respuestas,
        })
      }),
    )
    const { onTerminar } = montar()
    await titulo(/rubro/)
    await userEvent.click(screen.getByRole('radio', { name: 'Otro' }))
    await userEvent.type(
      screen.getByRole('textbox', { name: /Otro: ¿Cuál es el rubro/ }),
      'Florería',
    )
    await siguiente()
    await titulo(/querés lograr/)
    await userEvent.click(screen.getByRole('radio', { name: 'Vender online' }))
    await siguiente()
    await titulo(/producto o servicio estrella/)
    await userEvent.type(screen.getByRole('textbox'), 'Ramos de estación')
    await siguiente()
    await titulo(/zona o ciudad/)
    await userEvent.type(screen.getByRole('textbox'), 'Rosario')
    await siguiente()
    await titulo(/A quién le hablás/)
    await userEvent.type(screen.getByRole('textbox'), 'Familias')
    await siguiente()
    await titulo(/Quién publica/)
    await userEvent.click(screen.getByRole('radio', { name: 'Yo' }))
    await siguiente()
    await titulo(/Qué podés producir/)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Fotos de producto' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Carruseles con texto' }))
    await siguiente()
    await titulo(/tono/)
    await userEvent.click(screen.getByRole('radio', { name: 'Divertido' }))
    await siguiente()
    await titulo(/evitar/)
    await userEvent.type(screen.getByRole('textbox'), 'Política')
    await userEvent.click(screen.getByRole('button', { name: 'Terminar' }))
    await waitFor(() => expect(onTerminar).toHaveBeenCalledWith('completo'))
    expect(cuerpo).toEqual({
      respuestas: {
        rubro: 'Florería',
        objetivo: 'venta_online',
        producto_estrella: 'Ramos de estación',
        zona: 'Rosario',
        publico: 'Familias',
        quien_publica: 'yo',
        que_puede_producir: ['fotos_producto', 'carruseles'],
        tono: 'divertido',
        evitar: 'Política',
      },
    })
  })

  it('un 422 muestra cada mensaje en su pregunta y lleva a la primera con problema', async () => {
    server.use(
      http.put('*/api/contexto', () =>
        HttpResponse.json(
          {
            detalle: 'Hay respuestas inválidas',
            problemas: { zona: 'Máximo 80 caracteres', publico: 'Máximo 200 caracteres' },
          },
          { status: 422 },
        ),
      ),
    )
    const { onTerminar } = montar()
    await contestarHastaLaUltima()
    await userEvent.click(screen.getByRole('button', { name: 'Terminar' }))
    expect(await titulo(/zona o ciudad/)).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent('Máximo 80 caracteres')
    await siguiente()
    expect(await titulo(/A quién le hablás/)).toBeInTheDocument()
    expect(onTerminar).not.toHaveBeenCalled()
  })

  it('un error del servidor se informa y se puede reintentar sin perder las respuestas', async () => {
    server.use(http.put('*/api/contexto', () => new HttpResponse(null, { status: 500 })))
    const { onTerminar } = montar()
    await contestarHastaLaUltima()
    await userEvent.click(screen.getByRole('button', { name: 'Terminar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos guardar')
    expect(onTerminar).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Terminar' })).toBeEnabled()
    expect(screen.getByRole('textbox')).toHaveValue('Política')
  })

  it('mientras guarda muestra la ruedita en lugar del formulario', async () => {
    let soltar: () => void = () => {}
    const espera = new Promise<void>((r) => (soltar = r))
    server.use(
      http.put('*/api/contexto', async ({ request }) => {
        const cuerpo = (await request.json()) as { respuestas: Record<string, unknown> }
        await espera
        return HttpResponse.json({
          version: 1,
          estado: 'completo',
          preguntas: PREGUNTAS_MOCK,
          respuestas: cuerpo.respuestas,
        })
      }),
    )
    const { onTerminar } = montar()
    await contestarHastaLaUltima()
    await userEvent.click(screen.getByRole('button', { name: 'Terminar' }))
    expect(await screen.findByRole('status', { name: 'Guardando tus respuestas' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Terminar' })).toBeNull()
    soltar()
    await waitFor(() => expect(onTerminar).toHaveBeenCalledWith('completo'))
  })

  it('al recargar a mitad no pierde lo escrito ni el paso', async () => {
    const { unmount } = montar()
    await titulo(/rubro/)
    await userEvent.click(screen.getByRole('radio', { name: 'Belleza y cuidado personal' }))
    await siguiente()
    await titulo(/querés lograr/)
    await userEvent.click(screen.getByRole('radio', { name: 'Que vengan al local' }))
    unmount()

    montar()
    expect(await titulo(/querés lograr/)).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Que vengan al local' })).toBeChecked()
    await userEvent.click(screen.getByRole('button', { name: 'Atrás' }))
    await titulo(/rubro/)
    expect(screen.getByRole('radio', { name: 'Belleza y cuidado personal' })).toBeChecked()
  })

  it('descarta el borrador si cambió la versión del catálogo', async () => {
    sessionStorage.setItem(
      'contexto:borrador',
      JSON.stringify({ version: 0, paso: 1, valores: { rubro: 'gastronomia' } }),
    )
    montar()
    expect(await titulo(/rubro/)).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Gastronomía' })).not.toBeChecked()
  })

  it('sin sessionStorage el cuestionario funciona igual', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    montar()
    await titulo(/rubro/)
    await userEvent.click(screen.getByRole('radio', { name: 'Gastronomía' }))
    await siguiente()
    expect(await titulo(/querés lograr/)).toBeInTheDocument()
    vi.restoreAllMocks()
  })

  it('cambiar el catálogo no exige tocar el front', async () => {
    server.use(
      http.get('*/api/contexto', () =>
        HttpResponse.json({
          version: 2,
          estado: 'pendiente',
          respuestas: {},
          preguntas: [
            {
              id: 'ticket',
              texto: '¿Cuál es tu ticket promedio?',
              tipo: 'texto',
              obligatoria: true,
            },
          ],
        } satisfies Contexto),
      ),
    )
    montar()
    expect(await titulo('¿Cuál es tu ticket promedio?')).toBeInTheDocument()
    expect(screen.getByText('Pregunta 1 de 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Terminar' })).toBeInTheDocument()
  })

  it('muestra un error con «Reintentar» si no carga el catálogo', async () => {
    server.use(http.get('*/api/contexto', () => new HttpResponse(null, { status: 500 })))
    montar()
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar las preguntas')
    expect(screen.getByRole('button', { name: /Reintentar/ })).toBeInTheDocument()
  })

  it('el foco pasa al título de cada pregunta', async () => {
    montar()
    await titulo(/rubro/)
    await userEvent.click(screen.getByRole('radio', { name: 'Gastronomía' }))
    await siguiente()
    expect(await titulo(/querés lograr/)).toHaveFocus()
  })
})
