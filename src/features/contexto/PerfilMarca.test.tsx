import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { configurarPerfilMock, MENSAJE_LIMITE, perfilListoMock } from '@/mocks/contexto'
import { server } from '@/mocks/server'
import { PerfilMarca } from './PerfilMarca'

const INTERVALO = 15

function montar() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <PerfilMarca intervaloMs={INTERVALO} />
    </QueryClientProvider>,
  )
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('PerfilMarca', () => {
  it('listo: separa lo calculado (cifras, sin editar) de lo interpretado (texto editable)', async () => {
    configurarPerfilMock({ perfil: perfilListoMock() })
    montar()
    expect(
      await screen.findByRole('heading', { name: 'Esto es lo que vimos en tus publicaciones' }),
    ).toBeInTheDocument()
    const calculado = await screen.findByRole('article', { name: 'Lo que contamos' })
    expect(within(calculado).getByText(/24 publicaciones/)).toBeInTheDocument()
    const formatos = within(within(calculado).getByRole('list', { name: 'Formatos' }))
    expect(formatos.getByText('Reels')).toBeInTheDocument()
    expect(within(calculado).getByText('Formato que mejor rindió')).toBeInTheDocument()
    expect(within(calculado).getByText('12 · 50%')).toBeInTheDocument()
    expect(within(calculado).getByText('2,8 publicaciones por semana')).toBeInTheDocument()
    expect(within(calculado).getByText('Martes, Jueves, Sábado')).toBeInTheDocument()
    expect(within(calculado).getByText('12 h, 19 h, 21 h')).toBeInTheDocument()
    expect(within(calculado).getByText('#palermo')).toBeInTheDocument()
    expect(within(calculado).queryByRole('textbox')).toBeNull()

    const interpretado = screen.getByRole('form', { name: 'Lo que interpretamos' })
    expect(within(interpretado).getByLabelText('Temas')).toHaveValue(
      'café de especialidad, recetas y preparaciones, vida de barrio',
    )
    expect(within(interpretado).getByLabelText('Tono')).toHaveValue(
      'Cercano y cálido, con humor suave',
    )
    expect(
      screen.getByText(/Generado el miércoles 18 de noviembre a las 14:05/),
    ).toBeInTheDocument()
  })

  it('edita y confirma: manda lo corregido y queda confirmado', async () => {
    configurarPerfilMock({ perfil: perfilListoMock() })
    let cuerpo: unknown
    server.use(
      http.put('*/api/perfil-marca', async ({ request }) => {
        cuerpo = await request.json()
        const { confirmado } = cuerpo as { confirmado: unknown }
        return HttpResponse.json({ ...perfilListoMock(), confirmado })
      }),
    )
    montar()
    const tono = await screen.findByLabelText('Tono')
    expect(screen.queryByText('Confirmado')).toBeNull()
    await userEvent.clear(tono)
    await userEvent.type(tono, 'Directo')
    const temas = screen.getByLabelText('Temas')
    await userEvent.clear(temas)
    await userEvent.type(temas, 'café, café, pastelería , ')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(await screen.findByText('Confirmado')).toBeInTheDocument()
    expect(cuerpo).toEqual({
      confirmado: {
        temas: ['café', 'pastelería'],
        tono: 'Directo',
        estiloVisual: 'Fotos luminosas con tonos tierra y primeros planos de las preparaciones',
        publico: 'Vecinos y amantes del café que buscan un lugar tranquilo',
      },
    })
    expect(screen.getByRole('status', { name: '' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled()
  })

  it('un campo vacío se marca en su lugar y no se envía nada', async () => {
    configurarPerfilMock({ perfil: perfilListoMock() })
    let pedidos = 0
    server.use(
      http.put('*/api/perfil-marca', () => {
        pedidos += 1
        return HttpResponse.json(perfilListoMock())
      }),
    )
    montar()
    await userEvent.clear(await screen.findByLabelText('Tono'))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Contanos el tono')
    expect(screen.getByLabelText('Tono')).toBeInvalid()
    expect(pedidos).toBe(0)
  })

  it('un perfil ya confirmado muestra lo confirmado, no lo del modelo', async () => {
    configurarPerfilMock({
      perfil: {
        ...perfilListoMock(),
        confirmado: { temas: ['pan'], tono: 'Íntimo', estiloVisual: 'Claro', publico: 'Barrio' },
      },
    })
    montar()
    expect(await screen.findByLabelText('Tono')).toHaveValue('Íntimo')
    expect(screen.getByText('Confirmado')).toBeInTheDocument()
  })

  it('ninguno: ofrece armarlo; mientras se genera avisa y consulta hasta que termina, y ahí corta', async () => {
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Armar mi perfil' }))
    const estado = await screen.findByText('Estamos armando tu perfil…')
    expect(estado.closest('[aria-live="polite"]')).not.toBeNull()
    expect(await screen.findByLabelText('Tono')).toBeInTheDocument()
    expect(screen.queryByText('Estamos armando tu perfil…')).toBeNull()
  })

  it('la consulta se repite mientras genera y se corta al terminar', async () => {
    let consultas = 0
    server.use(
      http.get('*/api/perfil-marca', () => {
        consultas += 1
        return HttpResponse.json(
          consultas < 3 ? { ...perfilListoMock(), estado: 'generando' } : perfilListoMock(),
        )
      }),
    )
    montar()
    await screen.findByLabelText('Tono')
    expect(consultas).toBe(3)
    await esperar(INTERVALO * 6)
    expect(consultas).toBe(3)
  })

  it('al desmontarse deja de consultar', async () => {
    let consultas = 0
    server.use(
      http.get('*/api/perfil-marca', () => {
        consultas += 1
        return HttpResponse.json({ ...perfilListoMock(), estado: 'generando' })
      }),
    )
    const { unmount } = montar()
    await waitFor(() => expect(consultas).toBeGreaterThanOrEqual(3))
    unmount()
    await esperar(INTERVALO * 2)
    const alDesmontar = consultas
    await esperar(INTERVALO * 6)
    expect(consultas).toBe(alDesmontar)
  })

  it('error: lo dice y deja volver a generar', async () => {
    configurarPerfilMock({
      perfil: { ...perfilListoMock(), estado: 'error', interpretado: null, error: 'boom técnico' },
      resultado: 'listo',
    })
    montar()
    expect(await screen.findByText('No pudimos armar tu perfil.')).toBeInTheDocument()
    expect(screen.queryByText(/boom técnico/)).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Volver a generar' }))
    expect(await screen.findByLabelText('Tono')).toBeInTheDocument()
  })

  it('un error al terminar de generar se muestra', async () => {
    configurarPerfilMock({ resultado: 'error' })
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Armar mi perfil' }))
    expect(await screen.findByText('No pudimos armar tu perfil.')).toBeInTheDocument()
  })

  it('sin_datos: «lo armamos cuando tengas más publicaciones»', async () => {
    configurarPerfilMock({
      perfil: { ...perfilListoMock(), estado: 'sin_datos', calculado: null, interpretado: null },
    })
    montar()
    expect(
      await screen.findByText(/Lo armamos cuando tengas más publicaciones/),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Tono')).toBeNull()
  })

  it('el límite diario (429) muestra el detalle del backend', async () => {
    server.use(
      http.post('*/api/perfil-marca/generar', () =>
        HttpResponse.json({ detalle: MENSAJE_LIMITE }, { status: 429 }),
      ),
    )
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Armar mi perfil' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(MENSAJE_LIMITE)
  })

  it('«Volver a generar» con cambios sin confirmar pide confirmación', async () => {
    configurarPerfilMock({ perfil: perfilListoMock() })
    montar()
    await userEvent.type(await screen.findByLabelText('Tono'), ' y más')
    await userEvent.click(screen.getByRole('button', { name: 'Volver a generar' }))
    const dialogo = await screen.findByText(/Tenés cambios sin confirmar/)
    expect(dialogo).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByText(/Tenés cambios sin confirmar/)).toBeNull()
    expect(screen.getByLabelText('Tono')).toHaveValue('Cercano y cálido, con humor suave y más')
  })

  it('«Volver a generar» sin cambios genera de una', async () => {
    configurarPerfilMock({ perfil: perfilListoMock() })
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Volver a generar' }))
    expect(await screen.findByText('Estamos armando tu perfil…')).toBeInTheDocument()
    expect(await screen.findByLabelText('Tono')).toBeInTheDocument()
  })

  it('si no carga, muestra el error con «Reintentar»', async () => {
    server.use(http.get('*/api/perfil-marca', () => new HttpResponse(null, { status: 500 })))
    montar()
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar tu perfil')
    expect(screen.getByRole('button', { name: /Reintentar/ })).toBeInTheDocument()
  })
})
