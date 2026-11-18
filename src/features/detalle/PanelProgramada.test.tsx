import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { crearProgramada } from '@/api/publicacion'
import type { Medio, Programada } from '@/domain/types'
import { claveDia } from '@/lib/fecha'
import { avanzarPieza, ErrorMock, mockPublicacion, todasLasProgramadas } from '@/mocks/programadas'
import { server } from '@/mocks/server'
import { crearRouter } from '@/router'

const DIA = 24 * 60 * 60 * 1000
const enDias = (n: number) => new Date(Date.now() + n * DIA).toISOString()
const foto: Medio = { url: 'https://mock.zernio.test/medios/f.jpg', tipo: 'imagen' }

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

const pieza = (id: string) => todasLasProgramadas().find((p) => p.id === id)
const programadaNueva = (extra: Partial<Parameters<typeof crearProgramada>[0]> = {}) =>
  crearProgramada({
    redId: 'red-ig',
    accion: 'programar',
    tipo: 'foto',
    texto: 'Hola desde el test',
    medios: [foto],
    programadaPara: enDias(3),
    ...extra,
  })
/** Los botones con texto del panel (la X de cerrar solo tiene nombre accesible, y el calendario de atrás no cuenta). */
const botonesDelPie = () =>
  within(screen.getByRole('dialog'))
    .queryAllByRole('button')
    .map((b) => b.textContent?.trim())
    .filter((t) => t)

/** Los botones de acción del detalle (sin la X de cerrar, que solo tiene nombre accesible). */
async function acciones() {
  await screen.findByText(/Texto$/)
  return botonesDelPie()
}

beforeEach(() => vi.stubEnv('VITE_PUBLICACION_HABILITADA', 'true'))
afterEach(() => vi.unstubAllEnvs())

describe('detalle de una pieza guardada: qué acciones ofrece cada estado', () => {
  it('borrador: editar, programar, publicar ahora y borrar', async () => {
    await montar('/?item=prog-1')
    expect(
      await screen.findByText('Idea de reel: la prenda puesta en los primeros 2 segundos.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Borrador')).toBeInTheDocument()
    const lista = await acciones()
    for (const nombre of ['Editar', 'Programar', 'Publicar ahora', 'Borrar borrador'])
      expect(lista).toContain(nombre)
    for (const nombre of ['Reprogramar', 'Cancelar publicación', 'Reintentar', 'Crear de nuevo'])
      expect(lista).not.toContain(nombre)
  })

  it('programada: editar, reprogramar y cancelar', async () => {
    const p = await programadaNueva()
    await montar(`/?item=${p.id}`)
    expect(await screen.findByText('Hola desde el test')).toBeInTheDocument()
    const lista = await acciones()
    for (const nombre of ['Editar', 'Reprogramar', 'Cancelar publicación'])
      expect(lista).toContain(nombre)
    for (const nombre of ['Programar', 'Publicar ahora', 'Borrar borrador', 'Reintentar'])
      expect(lista).not.toContain(nombre)
  })

  it('publicando: solo lectura', async () => {
    const p = await programadaNueva({ accion: 'publicar_ahora', programadaPara: null })
    await montar(`/?item=${p.id}`)
    expect(await screen.findByText(/Se está publicando/)).toBeInTheDocument()
    expect(await acciones()).toEqual([])
  })

  it('«Confirmando…» (fallida con estado desconocido): sin reintentar ni cancelar', async () => {
    await montar('/?item=prog-6')
    expect(await screen.findByText(/Estamos confirmando si se publicó/)).toBeInTheDocument()
    expect(within(screen.getByRole('dialog')).getByText('Confirmando…')).toBeInTheDocument()
    expect(await acciones()).toEqual([])
  })

  it('fallida: muestra el motivo y ofrece solo reintentar', async () => {
    await montar('/?item=prog-5')
    expect(
      await screen.findByText('Zernio rechazó la publicación; revisá el contenido'),
    ).toBeInTheDocument()
    expect(await acciones()).toEqual(['Reintentar'])
  })

  it('«No se publicó» es final: solo crear de nuevo', async () => {
    avanzarPieza('prog-5', 'fallida', { error: 'No se publicó' })
    await montar('/?item=prog-5')
    expect(await screen.findByText(/No se publicó\. Podés crearla de nuevo/)).toBeInTheDocument()
    expect(await acciones()).toEqual(['Crear de nuevo'])
  })

  it('publicada: enlace a la red que se abre aparte y sin acciones', async () => {
    await montar('/?item=prog-4')
    const enlace = await screen.findByRole('link', { name: /Ver en Instagram/ })
    expect(enlace).toHaveAttribute('href', 'https://www.instagram.com/stories/casa.alamo/1/')
    expect(enlace).toHaveAttribute('target', '_blank')
    expect(enlace).toHaveAttribute('rel', 'noopener noreferrer')
    expect(await acciones()).toEqual([])
    expect(screen.queryByRole('button', { name: 'Ver las métricas' })).not.toBeInTheDocument()
  })

  it('publicada con itemId: lleva al detalle de la publicación con sus métricas', async () => {
    avanzarPieza('prog-4', 'publicada', { itemId: 'pub-1' })
    const { router } = await montar('/?item=prog-4')
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Ver las métricas' }))
    await waitFor(() => expect(router.state.location.search).toMatchObject({ item: 'pub-1' }))
    expect(await screen.findByText('Alcance')).toBeInTheDocument()
    expect(screen.getByText('Análisis de Fidel')).toBeInTheDocument()
  })
})

describe('transiciones', () => {
  it('borrar un borrador pide confirmación y cierra el panel', async () => {
    const { router } = await montar('/?item=prog-1')
    const usuario = userEvent.setup()
    await usuario.click(await screen.findByRole('button', { name: 'Borrar borrador' }))
    const confirmar = await screen.findByRole('alertdialog', { name: '¿Borrar el borrador?' })
    await usuario.click(within(confirmar).getByRole('button', { name: 'Volver' }))
    expect(pieza('prog-1')).toBeDefined()
    await usuario.click(screen.getByRole('button', { name: 'Borrar borrador' }))
    await usuario.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Borrar' }),
    )
    await waitFor(() => expect(pieza('prog-1')).toBeUndefined())
    await waitFor(() => expect(router.state.location.search).not.toHaveProperty('item'))
  })

  it('cancelar una programada pide confirmación, dice la fecha y la deja cancelada', async () => {
    const p = await programadaNueva()
    const { router } = await montar(`/?item=${p.id}`)
    const usuario = userEvent.setup()
    await usuario.click(await screen.findByRole('button', { name: 'Cancelar publicación' }))
    const confirmar = await screen.findByRole('alertdialog', {
      name: '¿Cancelar la publicación programada?',
    })
    expect(confirmar).toHaveTextContent('Deja de estar programada para el')
    await usuario.click(within(confirmar).getByRole('button', { name: 'Volver' }))
    expect(pieza(p.id)?.estado).toBe('programada')
    await usuario.click(screen.getByRole('button', { name: 'Cancelar publicación' }))
    await usuario.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Cancelar publicación',
      }),
    )
    await waitFor(() => expect(pieza(p.id)?.estado).toBe('cancelada'))
    await waitFor(() => expect(router.state.location.search).not.toHaveProperty('item'))
  })

  it('reintentar una fallida la pasa a publicando', async () => {
    await montar('/?item=prog-5')
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Reintentar' }))
    await waitFor(() =>
      expect(pieza('prog-5')).toMatchObject({ estado: 'publicando', error: null }),
    )
    expect(await within(screen.getByRole('dialog')).findByText('Publicando')).toBeInTheDocument()
    expect(botonesDelPie()).not.toContain('Reintentar')
  })

  it('reprogramar manda `guardar` con la fecha nueva en UTC; menos de 5 minutos se rechaza', async () => {
    const p = await programadaNueva()
    await montar(`/?item=${p.id}`)
    const usuario = userEvent.setup()
    await usuario.click(await screen.findByRole('button', { name: 'Reprogramar' }))
    const nueva = claveDia(new Date(Date.now() + 6 * DIA))
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: nueva } })
    fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '21:15' } })
    await usuario.click(screen.getByRole('button', { name: 'Guardar fecha' }))
    await waitFor(() =>
      expect(Date.parse(pieza(p.id)!.fecha!)).toBe(Date.parse(`${nueva}T21:15:00-03:00`)),
    )
    expect(pieza(p.id)?.estado).toBe('programada')

    await usuario.click(await screen.findByRole('button', { name: 'Reprogramar' }))
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: claveDia(new Date()) } })
    fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '00:00' } })
    await usuario.click(screen.getByRole('button', { name: 'Guardar fecha' }))
    expect(
      await screen.findByText('La fecha tiene que ser al menos 5 minutos en el futuro'),
    ).toBeInTheDocument()
  })

  it('programar un borrador incompleto lista lo que falta y no llama al backend', async () => {
    await montar('/?item=prog-1')
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Programar' }))
    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('Elegí la fecha y la hora para programar')
    expect(alerta).toHaveTextContent('Editá la publicación para completarlo.')
    expect(pieza('prog-1')?.estado).toBe('borrador')
  })

  it('publicar ahora un borrador completo pide confirmación', async () => {
    const borrador = await programadaNueva({ accion: 'borrador', programadaPara: null })
    await montar(`/?item=${borrador.id}`)
    const usuario = userEvent.setup()
    await usuario.click(await screen.findByRole('button', { name: 'Publicar ahora' }))
    const confirmar = await screen.findByRole('alertdialog', { name: '¿Publicar ahora?' })
    expect(confirmar).toHaveTextContent('no se puede deshacer')
    await usuario.click(within(confirmar).getByRole('button', { name: 'Volver' }))
    expect(pieza(borrador.id)?.estado).toBe('borrador')
    await usuario.click(screen.getByRole('button', { name: 'Publicar ahora' }))
    await usuario.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Publicar ahora',
      }),
    )
    await waitFor(() => expect(pieza(borrador.id)?.estado).toBe('publicando'))
  })

  it('crear de nuevo abre «Nueva publicación» con los datos copiados y sin fecha', async () => {
    avanzarPieza('prog-5', 'fallida', { error: 'No se publicó' })
    const { router } = await montar('/?item=prog-5')
    const usuario = userEvent.setup()
    await usuario.click(await screen.findByRole('button', { name: 'Crear de nuevo' }))
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({ nueva: true, copiar: 'prog-5' }),
    )
    expect(await screen.findByRole('dialog', { name: 'Nueva publicación' })).toBeInTheDocument()
    expect(await screen.findByLabelText('Texto')).toHaveValue('Domingo de saco beige.')
    expect(screen.getByRole('radio', { name: 'Foto' })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Instagram/ })).toBeChecked()
    expect(screen.getByLabelText('Fecha')).toHaveValue('')
    expect(screen.getByText(/Partimos de una publicación anterior/)).toBeInTheDocument()
    const antes = todasLasProgramadas().length
    fireEvent.change(screen.getByLabelText('Fecha'), {
      target: { value: claveDia(new Date(Date.now() + 2 * DIA)) },
    })
    fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '20:00' } })
    await usuario.click(screen.getByRole('button', { name: 'Programar' }))
    await waitFor(() => expect(todasLasProgramadas()).toHaveLength(antes + 1))
    const nueva = todasLasProgramadas().at(-1) as Programada
    expect(nueva.id).not.toBe('prog-5')
    expect(nueva).toMatchObject({ estado: 'programada', texto: 'Domingo de saco beige.' })
    await waitFor(() => expect(router.state.location.search).not.toHaveProperty('copiar'))
  })
})

describe('editar', () => {
  it('guarda solo lo que cambió y avisa si no cambió nada', async () => {
    const p = await programadaNueva()
    await montar(`/?item=${p.id}`)
    const usuario = userEvent.setup()
    await usuario.click(await screen.findByRole('button', { name: 'Editar' }))
    const texto = await screen.findByLabelText('Texto')
    expect(texto).toHaveValue('Hola desde el test')
    // Un borrador/programada no cambia de red.
    expect(screen.getByRole('radio', { name: /Instagram/ })).toBeDisabled()
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByText('No cambiaste nada.')).toBeInTheDocument()

    let cuerpo: Record<string, unknown> | null = null
    server.use(
      http.patch('*/api/programadas/:id', async ({ request, params }) => {
        cuerpo = (await request.clone().json()) as Record<string, unknown>
        // Sigue al mock real.
        const { editarPieza } = await import('@/mocks/programadas')
        return HttpResponse.json(editarPieza(String(params.id), cuerpo))
      }),
    )
    await usuario.clear(texto)
    await usuario.type(texto, 'Texto corregido')
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(pieza(p.id)?.texto).toBe('Texto corregido'))
    expect(cuerpo).toEqual({ texto: 'Texto corregido' })
    // Vuelve al detalle con el texto nuevo.
    expect(await screen.findByText('Texto corregido')).toBeInTheDocument()
    expect(screen.queryByRole('form', { name: 'Editar publicación' })).not.toBeInTheDocument()
  })

  it('un borrador se completa y se programa desde la edición', async () => {
    await montar('/?item=prog-1')
    const usuario = userEvent.setup()
    await usuario.click(await screen.findByRole('button', { name: 'Editar' }))
    expect(await screen.findByRole('button', { name: 'Programar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Publicar ahora' })).toBeInTheDocument()
    fireEvent.change(await screen.findByLabelText('Fecha'), {
      target: { value: claveDia(new Date(Date.now() + 5 * DIA)) },
    })
    fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '19:00' } })
    await usuario.click(screen.getByRole('button', { name: 'Programar' }))
    await waitFor(() => expect(pieza('prog-1')?.estado).toBe('programada'))
  })

  it('una programada solo ofrece «Guardar cambios» al editarla', async () => {
    const p = await programadaNueva()
    await montar(`/?item=${p.id}`)
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Editar' }))
    await screen.findByLabelText('Texto')
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Programar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Publicar ahora' })).not.toBeInTheDocument()
  })

  it('con cambios sin guardar, Escape pide confirmar; sin cambios cierra directo', async () => {
    const p = await programadaNueva()
    const { router } = await montar(`/?item=${p.id}`)
    const usuario = userEvent.setup()
    await usuario.click(await screen.findByRole('button', { name: 'Editar' }))
    await usuario.type(await screen.findByLabelText('Texto'), ' más')
    await usuario.keyboard('{Escape}')
    const descartar = await screen.findByRole('alertdialog', { name: '¿Descartar los cambios?' })
    await usuario.click(within(descartar).getByRole('button', { name: 'Seguir editando' }))
    expect(screen.getByLabelText('Texto')).toHaveValue('Hola desde el test más')
    await usuario.keyboard('{Escape}')
    await usuario.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Descartar' }),
    )
    await waitFor(() => expect(router.state.location.search).not.toHaveProperty('item'))
    expect(pieza(p.id)?.texto).toBe('Hola desde el test')
  })

  it('en el detalle, sin edición, Escape cierra directo', async () => {
    const { router } = await montar('/?item=prog-1')
    await screen.findByRole('button', { name: 'Editar' })
    await userEvent.setup().keyboard('{Escape}')
    await waitFor(() => expect(router.state.location.search).not.toHaveProperty('item'))
  })
})

describe('409 al escribir', () => {
  it('«se está procesando»: reintenta una vez solo y guarda', async () => {
    const p = await programadaNueva()
    await montar(`/?item=${p.id}`)
    const usuario = userEvent.setup()
    await usuario.click(await screen.findByRole('button', { name: 'Editar' }))
    const texto = await screen.findByLabelText('Texto')
    await usuario.type(texto, '!')
    mockPublicacion.forzar = new ErrorMock(
      409,
      'Se está procesando, probá de nuevo en unos segundos',
    )
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(pieza(p.id)?.texto).toBe('Hola desde el test!'))
    expect(mockPublicacion.forzar).toBeNull()
  })

  it('«se está procesando» que sigue: muestra el mensaje y no pierde lo escrito', async () => {
    const p = await programadaNueva()
    await montar(`/?item=${p.id}`)
    const usuario = userEvent.setup()
    await usuario.click(await screen.findByRole('button', { name: 'Editar' }))
    await usuario.type(await screen.findByLabelText('Texto'), '!')
    let llamadas = 0
    server.use(
      http.patch('*/api/programadas/:id', () => {
        llamadas++
        return HttpResponse.json(
          { detalle: 'Se está procesando, probá de nuevo en unos segundos' },
          { status: 409 },
        )
      }),
    )
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(
      await screen.findByText('Se está procesando. Probá de nuevo en unos segundos.'),
    ).toBeInTheDocument()
    expect(llamadas).toBe(2)
    expect(screen.getByLabelText('Texto')).toHaveValue('Hola desde el test!')
  })

  it('«reconectar»: explica y deja reintentar', async () => {
    const p = await programadaNueva()
    await montar(`/?item=${p.id}`)
    const usuario = userEvent.setup()
    await usuario.click(await screen.findByRole('button', { name: 'Editar' }))
    await usuario.type(await screen.findByLabelText('Texto'), '!')
    mockPublicacion.forzar = new ErrorMock(
      409,
      'Hay que reconectar la red con permiso para publicar',
    )
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(
      await screen.findByText('Hay que reconectar la red con permiso para publicar.'),
    ).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(pieza(p.id)?.texto).toBe('Hola desde el test!'))
  })

  it('la pieza cambió mientras se editaba: se vuelve a leer y lo escrito se conserva', async () => {
    const p = await programadaNueva()
    await montar(`/?item=${p.id}`)
    const usuario = userEvent.setup()
    await usuario.click(await screen.findByRole('button', { name: 'Editar' }))
    await usuario.type(await screen.findByLabelText('Texto'), ' y más')
    // Mientras tanto, Zernio la publicó.
    avanzarPieza(p.id, 'publicada', { urlPublicada: 'https://www.instagram.com/p/x/' })
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(
      await screen.findByText(/No se puede guardar una pieza en estado publicada/),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Texto')).toHaveValue('Hola desde el test y más')
    expect(
      await screen.findByText(/Esta publicación ya no se puede editar: está «publicada»/),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument()
    expect(pieza(p.id)?.texto).toBe('Hola desde el test')
  })

  it('cancelar con un 409 de estado muestra el mensaje y vuelve a leer la pieza', async () => {
    const p = await programadaNueva()
    await montar(`/?item=${p.id}`)
    const usuario = userEvent.setup()
    await usuario.click(await screen.findByRole('button', { name: 'Cancelar publicación' }))
    avanzarPieza(p.id, 'publicando')
    await usuario.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Cancelar publicación',
      }),
    )
    expect(
      await screen.findByText('No se puede cancelar una pieza en estado publicando'),
    ).toBeInTheDocument()
    expect(await within(screen.getByRole('dialog')).findByText('Publicando')).toBeInTheDocument()
    expect(pieza(p.id)?.estado).toBe('publicando')
  })
})

describe('cómo se resuelve qué abre ?item=', () => {
  it('sin la bandera no pregunta por piezas: una programada es un elemento que no existe', async () => {
    vi.stubEnv('VITE_PUBLICACION_HABILITADA', '')
    let preguntas = 0
    server.use(
      http.get('*/api/programadas/:id', () => {
        preguntas++
        return HttpResponse.json({ detalle: 'No encontrado' }, { status: 404 })
      }),
    )
    await montar('/?item=prog-2')
    const dialogo = await screen.findByRole('dialog')
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
      /No encontramos este elemento/,
    )
    expect(preguntas).toBe(0)
  })

  it('con la bandera, una publicada abierta desde un enlace directo sigue funcionando', async () => {
    await montar('/?item=pub-1')
    expect(await screen.findByText('Alcance')).toBeInTheDocument()
    expect(screen.getByText('Análisis de Fidel')).toBeInTheDocument()
  })

  it('un id que no es ni pieza ni publicación muestra «no encontramos» sin dejar un panel vacío', async () => {
    await montar('/?item=nada')
    expect(await screen.findByText(/No encontramos este elemento/)).toBeInTheDocument()
  })
})
