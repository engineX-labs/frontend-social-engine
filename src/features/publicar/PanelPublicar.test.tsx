import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { ErrorMock, mockPublicacion, todasLasProgramadas } from '@/mocks/programadas'
import { server } from '@/mocks/server'
import { claveDia } from '@/lib/fecha'
import { crearRouter } from '@/router'

const DIA = 24 * 60 * 60 * 1000
const enDias = (n: number) => claveDia(new Date(Date.now() + n * DIA))

async function montar(ruta: string) {
  const history = createMemoryHistory({ initialEntries: [ruta] })
  const router = crearRouter(history)
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  await router.load()
  return { router }
}

const archivo = (nombre: string, tipo = 'image/jpeg') =>
  new File(['contenido'], nombre, { type: tipo })
const panel = () => screen.findByRole('dialog', { name: 'Nueva publicación' })
const nuevas = () => todasLasProgramadas().filter((p) => !/^prog-\d$/.test(p.id))

async function elegirRed(nombre: RegExp) {
  const usuario = userEvent.setup()
  await usuario.click(await screen.findByRole('radio', { name: nombre }))
  return usuario
}

/** Completa lo mínimo de una foto de Instagram y espera a que termine de subirse. */
async function prepararFotoDeInstagram(opciones: { fecha?: string; hora?: string } = {}) {
  const usuario = await elegirRed(/Instagram/)
  await usuario.click(screen.getByRole('radio', { name: 'Foto' }))
  await usuario.upload(screen.getByLabelText('Elegir archivo'), archivo('look.jpg'))
  await screen.findByText('Subido')
  await usuario.type(screen.getByLabelText('Texto'), 'Nuevo look')
  fireEvent.change(screen.getByLabelText('Fecha'), {
    target: { value: opciones.fecha ?? enDias(3) },
  })
  fireEvent.change(screen.getByLabelText('Hora'), { target: { value: opciones.hora ?? '20:00' } })
  return usuario
}

describe('con la bandera apagada', () => {
  it('no hay botón ni panel, aunque la URL pida abrirlo', async () => {
    await montar('/?nueva=true')
    await screen.findByRole('heading', { name: 'Calendario' })
    expect(screen.queryByRole('button', { name: 'Nueva publicación' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('con la bandera prendida', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_PUBLICACION_HABILITADA', 'true')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('el botón abre el panel y la URL lo recuerda; la X lo cierra sin pedir confirmación', async () => {
    const { router } = await montar('/')
    const usuario = userEvent.setup()
    await usuario.click(await screen.findByRole('button', { name: 'Nueva publicación' }))
    const d = within(await panel())
    expect(router.state.location.search).toMatchObject({ nueva: true })
    expect(await d.findByRole('radio', { name: /Instagram/ })).toBeInTheDocument()
    await usuario.click(d.getByRole('button', { name: 'Cerrar nueva publicación' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(router.state.location.search).not.toHaveProperty('nueva')
  })

  it('con ?dia= la fecha arranca en ese día; un día pasado se ignora', async () => {
    const dia = enDias(2)
    await montar(`/?nueva=true&dia=${dia}`)
    await panel()
    await elegirRed(/Instagram/).then((u) => u.click(screen.getByRole('radio', { name: 'Foto' })))
    expect(screen.getByLabelText('Fecha')).toHaveValue(dia)
  })

  it('programa una foto: sube el archivo, manda la fecha en UTC y lleva el calendario a ese día', async () => {
    const fecha = enDias(3)
    const { router } = await montar('/?nueva=true')
    await panel()
    const usuario = await prepararFotoDeInstagram({ fecha, hora: '20:00' })
    await usuario.click(screen.getByRole('button', { name: 'Programar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const [pieza] = nuevas()
    expect(pieza).toMatchObject({
      estado: 'programada',
      red: 'instagram',
      formato: 'foto',
      texto: 'Nuevo look',
    })
    expect(pieza?.medios).toHaveLength(1)
    expect(Date.parse(pieza!.fecha!)).toBe(Date.parse(`${fecha}T23:00:00.000Z`))
    expect(router.state.location.search).toMatchObject({ dia: fecha })
    expect(router.state.location.search).not.toHaveProperty('nueva')
  })

  it('un borrador solo pide red y tipo', async () => {
    await montar('/?nueva=true')
    await panel()
    const usuario = await elegirRed(/Instagram/)
    await usuario.click(screen.getByRole('radio', { name: 'Reel' }))
    await usuario.click(screen.getByRole('button', { name: 'Guardar borrador' }))
    await waitFor(() => expect(nuevas()).toHaveLength(1))
    expect(nuevas()[0]).toMatchObject({ estado: 'borrador', formato: 'reel', fecha: null })
  })

  it('programar sin archivos ni fecha lista lo que falta y no llama al backend', async () => {
    await montar('/?nueva=true')
    await panel()
    const usuario = await elegirRed(/Instagram/)
    await usuario.click(screen.getByRole('radio', { name: 'Foto' }))
    await usuario.click(screen.getByRole('button', { name: 'Programar' }))
    const alerta = await screen.findByText('Revisá esto antes de seguir:')
    expect(alerta.closest('[role="alert"]')).toHaveTextContent('La foto lleva exactamente 1 imagen')
    expect(alerta.closest('[role="alert"]')).toHaveTextContent(
      'Elegí la fecha y la hora para programar',
    )
    expect(nuevas()).toHaveLength(0)
  })

  it('una fecha a menos de 5 minutos se avisa antes de enviar', async () => {
    await montar('/?nueva=true')
    await panel()
    const usuario = await prepararFotoDeInstagram({ fecha: claveDia(new Date()), hora: '00:00' })
    await usuario.click(screen.getByRole('button', { name: 'Programar' }))
    expect(
      await screen.findByText('La fecha tiene que ser al menos 5 minutos en el futuro'),
    ).toBeInTheDocument()
    expect(nuevas()).toHaveLength(0)
  })

  it('un doble clic en Programar crea una sola pieza', async () => {
    await montar('/?nueva=true')
    await panel()
    const usuario = await prepararFotoDeInstagram()
    const boton = screen.getByRole('button', { name: 'Programar' })
    await Promise.all([usuario.click(boton), usuario.click(boton)])
    await waitFor(() => expect(nuevas()).toHaveLength(1))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(nuevas()).toHaveLength(1)
  })

  it('publicar ahora pide confirmación: cancelar no crea nada, confirmar publica', async () => {
    await montar('/?nueva=true')
    await panel()
    const usuario = await prepararFotoDeInstagram()
    await usuario.click(screen.getByRole('button', { name: 'Publicar ahora' }))
    const confirmar = await screen.findByRole('alertdialog', { name: '¿Publicar ahora?' })
    expect(confirmar).toHaveTextContent('@casa.alamo')
    expect(confirmar).toHaveTextContent('no se puede deshacer')
    await usuario.click(within(confirmar).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(nuevas()).toHaveLength(0)
    await usuario.click(screen.getByRole('button', { name: 'Publicar ahora' }))
    await usuario.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Publicar ahora',
      }),
    )
    await waitFor(() => expect(nuevas()).toHaveLength(1))
    expect(nuevas()[0]?.estado).toBe('publicando')
  })

  it('un 422 del backend muestra sus problemas y conserva lo escrito', async () => {
    server.use(
      http.post('*/api/programadas', () =>
        HttpResponse.json(
          { detalle: 'Pedido inválido', problemas: ['Zernio rechazó el medio', 'Otro problema'] },
          { status: 422 },
        ),
      ),
    )
    await montar('/?nueva=true')
    await panel()
    const usuario = await prepararFotoDeInstagram()
    await usuario.click(screen.getByRole('button', { name: 'Programar' }))
    expect(await screen.findByText('Zernio rechazó el medio')).toBeInTheDocument()
    expect(screen.getByText('Otro problema')).toBeInTheDocument()
    expect(screen.getByLabelText('Texto')).toHaveValue('Nuevo look')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('un 409 de permiso explica que hay que reconectar y un reintento funciona', async () => {
    mockPublicacion.forzar = new ErrorMock(
      409,
      'Hay que reconectar la red con permiso para publicar',
    )
    await montar('/?nueva=true')
    await panel()
    const usuario = await prepararFotoDeInstagram()
    await usuario.click(screen.getByRole('button', { name: 'Programar' }))
    expect(
      await screen.findByText('Hay que reconectar la red con permiso para publicar.'),
    ).toBeInTheDocument()
    expect(nuevas()).toHaveLength(0)
    await usuario.click(screen.getByRole('button', { name: 'Programar' }))
    await waitFor(() => expect(nuevas()).toHaveLength(1))
  })

  it('un corte de red se reintenta con el mismo id, así no duplica', async () => {
    const ids: string[] = []
    server.use(
      http.post(
        '*/api/programadas',
        async ({ request }) => {
          ids.push(((await request.clone().json()) as { id: string }).id)
          return HttpResponse.json({ detalle: 'caído' }, { status: 503 })
        },
        { once: true },
      ),
    )
    await montar('/?nueva=true')
    await panel()
    const usuario = await prepararFotoDeInstagram()
    await usuario.click(screen.getByRole('button', { name: 'Programar' }))
    expect(await screen.findByText(/No se pudo publicar ahora/)).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Programar' }))
    await waitFor(() => expect(nuevas()).toHaveLength(1))
    expect(ids).toHaveLength(1)
    expect(nuevas()[0]?.id).toBe(ids[0])
  })

  it('con cambios sin guardar, Escape pide confirmar antes de descartar', async () => {
    await montar('/?nueva=true')
    await panel()
    const usuario = await prepararFotoDeInstagram()
    await usuario.keyboard('{Escape}')
    const descartar = await screen.findByRole('alertdialog', { name: '¿Descartar los cambios?' })
    // Un Escape dentro del aviso solo cierra el aviso, no el panel.
    await usuario.keyboard('{Escape}')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Nueva publicación' })).toBeInTheDocument()
    await usuario.keyboard('{Escape}')
    await usuario.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Descartar' }),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(descartar).not.toBeInTheDocument()
    expect(nuevas()).toHaveLength(0)
  })

  it('sin cambios, Escape cierra directo', async () => {
    await montar('/?nueva=true')
    await panel()
    await userEvent.setup().keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('una historia no pide texto; cambiar de red quita un tipo que no existe', async () => {
    await montar('/?nueva=true')
    await panel()
    const usuario = await elegirRed(/Instagram/)
    await usuario.click(screen.getByRole('radio', { name: 'Historia' }))
    expect(screen.getByText('Las historias no llevan texto.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Texto')).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('radio', { name: /TikTok/ }))
    expect(screen.queryByRole('radio', { name: 'Historia' })).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Video' })).not.toBeChecked()
  })

  it('TikTok: un video con privacidad y consentimiento se programa con sus opciones', async () => {
    const fecha = enDias(4)
    await montar('/?nueva=true')
    await panel()
    const usuario = await elegirRed(/TikTok/)
    await usuario.click(screen.getByRole('radio', { name: 'Video' }))
    await usuario.upload(screen.getByLabelText('Elegir archivo'), archivo('local.mp4', 'video/mp4'))
    await screen.findByText('Subido')
    await usuario.click(await screen.findByRole('radio', { name: /Público/ }))
    await usuario.click(screen.getByRole('checkbox', { name: /Revisé la vista previa/ }))
    await usuario.click(screen.getByRole('checkbox', { name: /consentimiento expreso/ }))
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: fecha } })
    fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '19:30' } })
    await usuario.click(screen.getByRole('button', { name: 'Programar' }))
    await waitFor(() => expect(nuevas()).toHaveLength(1))
    expect(nuevas()[0]).toMatchObject({ red: 'tiktok', formato: 'video', estado: 'programada' })
  })

  it('TikTok: sin el consentimiento no se puede programar', async () => {
    await montar('/?nueva=true')
    await panel()
    const usuario = await elegirRed(/TikTok/)
    await usuario.click(screen.getByRole('radio', { name: 'Video' }))
    await usuario.upload(screen.getByLabelText('Elegir archivo'), archivo('local.mp4', 'video/mp4'))
    await screen.findByText('Subido')
    await usuario.click(await screen.findByRole('radio', { name: /Público/ }))
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: enDias(4) } })
    fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '19:30' } })
    await usuario.click(screen.getByRole('button', { name: 'Programar' }))
    const alerta = (await screen.findByText('Revisá esto antes de seguir:')).closest(
      '[role="alert"]',
    )
    expect(alerta).toHaveTextContent('Falta confirmar la vista previa del contenido')
    expect(alerta).toHaveTextContent('Falta el consentimiento expreso para publicar en TikTok')
    expect(nuevas()).toHaveLength(0)
  })

  it('el aviso de que el video de TikTok queda público sale al confirmar publicar ahora', async () => {
    await montar('/?nueva=true')
    await panel()
    const usuario = await elegirRed(/TikTok/)
    await usuario.click(screen.getByRole('radio', { name: 'Video' }))
    await usuario.upload(screen.getByLabelText('Elegir archivo'), archivo('local.mp4', 'video/mp4'))
    await screen.findByText('Subido')
    await usuario.click(await screen.findByRole('radio', { name: /Público/ }))
    await usuario.click(screen.getByRole('checkbox', { name: /Revisé la vista previa/ }))
    await usuario.click(screen.getByRole('checkbox', { name: /consentimiento expreso/ }))
    await usuario.click(screen.getByRole('button', { name: 'Publicar ahora' }))
    expect(await screen.findByRole('alertdialog')).toHaveTextContent(
      'El video de TikTok queda público',
    )
  })
})
