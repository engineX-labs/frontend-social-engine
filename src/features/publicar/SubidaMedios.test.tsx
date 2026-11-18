import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { http, HttpResponse } from 'msw'
import type { Medio, TipoPieza } from '@/domain/types'
import { server } from '@/mocks/server'
import { SubidaMedios } from './SubidaMedios'

/**
 * Doble de XMLHttpRequest: jsdom no emite eventos de progreso de subida y acá hace falta controlar
 * cuándo avanza, termina o falla cada PUT. El pedido de la URL firmada (`POST /api/medios`) sí pasa por
 * el mock MSW; con el XHR real contra MSW se prueba `subirArchivo` en `subida.test.ts`.
 */
class FakeXHR {
  static instancias: FakeXHR[] = []
  upload: { onprogress: ((e: unknown) => void) | null } = { onprogress: null }
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  ontimeout: (() => void) | null = null
  onabort: (() => void) | null = null
  status = 0
  withCredentials = false
  url = ''
  metodo = ''
  cabeceras: Record<string, string> = {}
  cuerpo: unknown = null
  abortado = false
  constructor() {
    FakeXHR.instancias.push(this)
  }
  open(metodo: string, url: string) {
    this.metodo = metodo
    this.url = url
  }
  setRequestHeader(k: string, v: string) {
    this.cabeceras[k] = v
  }
  send(cuerpo: unknown) {
    this.cuerpo = cuerpo
  }
  abort() {
    this.abortado = true
    this.onabort?.()
  }
  progreso(loaded: number, total: number) {
    this.upload.onprogress?.({ lengthComputable: true, loaded, total })
  }
  terminar(status = 200) {
    this.status = status
    this.onload?.()
  }
  fallarRed() {
    this.onerror?.()
  }
}

const archivo = (nombre = 'a.jpg', tipo = 'image/jpeg') => new File(['x'], nombre, { type: tipo })
const medio = (nombre: string, tipo: Medio['tipo'] = 'imagen'): Medio => ({
  url: `https://mock.zernio.test/medios/${nombre}`,
  tipo,
})
const ultimoXhr = () => FakeXHR.instancias.at(-1)!
const esperarXhr = (n: number) => waitFor(() => expect(FakeXHR.instancias).toHaveLength(n))

function montar(props: Partial<Parameters<typeof SubidaMedios>[0]> = {}) {
  const onChange = vi.fn()
  const onOcupado = vi.fn()
  const tipo: TipoPieza = props.tipo ?? 'foto'
  const vista = render(
    <SubidaMedios tipo={tipo} valor={[]} onChange={onChange} onOcupado={onOcupado} {...props} />,
  )
  return { onChange, onOcupado, ...vista }
}

/** Como lo usa el formulario: el estado vive afuera y vuelve como `valor`. */
function Controlado({ tipo, inicial = [] }: { tipo: TipoPieza; inicial?: Medio[] }) {
  const [medios, setMedios] = useState(inicial)
  return (
    <>
      <button type="button" onClick={() => setMedios([])}>
        Limpiar el formulario
      </button>
      <SubidaMedios tipo={tipo} valor={medios} onChange={setMedios} />
      <output aria-label="en el formulario">
        {medios.map((m) => m.url.split('/').pop()).join(',')}
      </output>
    </>
  )
}

const usuario = () => userEvent.setup({ applyAccept: false })
const entrada = (nombre: RegExp = /elegir archivo/i) =>
  screen.getByLabelText(nombre) as HTMLInputElement

beforeEach(() => {
  FakeXHR.instancias = []
  vi.stubGlobal('XMLHttpRequest', FakeXHR)
  URL.createObjectURL = vi.fn(() => 'blob:vista-previa')
  URL.revokeObjectURL = vi.fn()
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('SubidaMedios · elegir y subir', () => {
  it('sube el archivo elegido, muestra el avance y al terminar avisa con el medio', async () => {
    const { onChange, onOcupado } = montar({ tipo: 'foto' })
    await usuario().upload(entrada(), archivo('look.jpg'))
    await esperarXhr(1)

    const barra = screen.getByRole('progressbar', { name: 'Subiendo look.jpg' })
    expect(barra).toHaveAttribute('aria-valuenow', '0')
    expect(barra).toHaveAttribute('aria-valuemin', '0')
    expect(barra).toHaveAttribute('aria-valuemax', '100')
    expect(onOcupado).toHaveBeenLastCalledWith(true)
    expect(onChange).not.toHaveBeenCalled()

    ultimoXhr().progreso(50, 100)
    await waitFor(() => expect(barra).toHaveAttribute('aria-valuenow', '50'))
    expect(screen.getByText('50%')).toBeInTheDocument()

    ultimoXhr().terminar(200)
    await screen.findByText('Subido')
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0]![0]).toEqual([
      {
        url: expect.stringMatching(/^https:\/\/mock\.zernio\.test\/medios\/.+look\.jpg$/),
        tipo: 'imagen',
      },
    ])
    expect(onOcupado).toHaveBeenLastCalledWith(false)
  })

  it('el PUT va a la URL firmada con el Content-Type del archivo y sin credenciales', async () => {
    montar({ tipo: 'reel' })
    await usuario().upload(entrada(), archivo('reel.mp4', 'video/mp4'))
    await esperarXhr(1)
    const xhr = ultimoXhr()
    expect(xhr.metodo).toBe('PUT')
    expect(xhr.url).toMatch(/^https:\/\/mock-subida\.zernio\.test\/put\//)
    expect(xhr.cabeceras).toEqual({ 'Content-Type': 'video/mp4' })
    expect(xhr.withCredentials).toBe(false)
  })

  it('el input acepta solo lo que lleva cada tipo y es múltiple solo cuando hay más de un archivo', () => {
    const a = montar({ tipo: 'foto' })
    expect(entrada()).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp')
    expect(entrada()).not.toHaveAttribute('multiple')
    a.unmount()
    montar({ tipo: 'carrusel' })
    expect(entrada(/elegir archivos/i)).toHaveAttribute('multiple')
    expect(entrada(/elegir archivos/i).getAttribute('accept')).toContain('video/mp4')
  })

  it('un carrusel sube varios archivos a la vez, cada uno con su avance', async () => {
    const { onChange } = montar({ tipo: 'carrusel' })
    await usuario().upload(entrada(/elegir archivos/i), [
      archivo('a.jpg'),
      archivo('b.mp4', 'video/mp4'),
    ])
    await esperarXhr(2)
    expect(screen.getAllByRole('progressbar')).toHaveLength(2)
    // Los pedidos de URL pueden resolverse en cualquier orden: se identifica cada PUT por su tipo.
    const deVideo = FakeXHR.instancias.find((x) => x.cabeceras['Content-Type'] === 'video/mp4')!
    const deImagen = FakeXHR.instancias.find((x) => x.cabeceras['Content-Type'] === 'image/jpeg')!
    deVideo.terminar(200) // termina primero el segundo
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1))
    expect(onChange.mock.calls[0]![0]).toEqual([
      { url: expect.stringContaining('b.mp4'), tipo: 'video' },
    ])
    deImagen.terminar(200)
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(2))
    // En el orden de la lista, no en el de llegada.
    expect(onChange.mock.calls[1]![0].map((m: Medio) => m.tipo)).toEqual(['imagen', 'video'])
  })

  it('arrastrar y soltar archivos también los sube', async () => {
    montar({ tipo: 'foto' })
    const zona = screen.getByText('Elegí un archivo').closest('label')!
    fireEvent.drop(zona, { dataTransfer: { files: [archivo('soltada.jpg')] } })
    await esperarXhr(1)
    expect(screen.getByRole('progressbar', { name: 'Subiendo soltada.jpg' })).toBeInTheDocument()
  })

  it('muestra una vista previa local de lo que se sube y la libera al quitarlo', async () => {
    montar({ tipo: 'foto' })
    await usuario().upload(entrada(), archivo('v.jpg'))
    await esperarXhr(1)
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    ultimoXhr().terminar()
    await screen.findByText('Subido')
    await usuario().click(screen.getByRole('button', { name: 'Quitar «v.jpg»' }))
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:vista-previa')
  })
})

describe('SubidaMedios · archivos que no valen y límites', () => {
  it('un archivo de un tipo que no corresponde no se sube y explica por qué', async () => {
    const { onChange } = montar({ tipo: 'foto' })
    await usuario().upload(entrada(), archivo('v.mp4', 'video/mp4'))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '«v.mp4» es un video. La foto lleva una imagen.',
    )
    expect(FakeXHR.instancias).toHaveLength(0)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('un tipo no admitido o vacío no se sube', async () => {
    montar({ tipo: 'carrusel' })
    const u = usuario()
    await u.upload(entrada(/elegir archivos/i), archivo('baile.gif', 'image/gif'))
    expect(await screen.findByRole('alert')).toHaveTextContent('no es un tipo de archivo admitido')
    await u.upload(entrada(/elegir archivos/i), new File([], 'vacio.jpg', { type: 'image/jpeg' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('«vacio.jpg» está vacío.')
    expect(FakeXHR.instancias).toHaveLength(0)
  })

  it('de varios archivos sube los válidos y avisa de los inválidos', async () => {
    montar({ tipo: 'fotos' })
    await usuario().upload(entrada(/elegir archivos/i), [
      archivo('ok.jpg'),
      archivo('v.mp4', 'video/mp4'),
    ])
    await esperarXhr(1)
    expect(screen.getByRole('alert')).toHaveTextContent('«v.mp4» es un video')
  })

  it('con el límite alcanzado el selector se bloquea y lo dice', () => {
    montar({ tipo: 'foto', valor: [medio('a.jpg')] })
    expect(entrada()).toBeDisabled()
    expect(screen.getByText('Ya está completo')).toBeInTheDocument()
  })

  it('si elige de más, sube los que entran y avisa cuántos sobraron', async () => {
    const llenos = Array.from({ length: 19 }, (_, i) => medio(`f${i}.jpg`))
    montar({ tipo: 'carrusel', valor: llenos })
    await usuario().upload(entrada(/elegir archivos/i), [
      archivo('1.jpg'),
      archivo('2.jpg'),
      archivo('3.jpg'),
    ])
    await esperarXhr(1)
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Podés subir hasta 20 archivos. Sobraron 2 y no se subieron.',
    )
    expect(screen.getByText('Ya está completo')).toBeInTheDocument()
  })

  it('un tipo de un solo archivo explica que hay que quitar el actual', async () => {
    montar({ tipo: 'foto' })
    // El input no es múltiple, pero se pueden soltar varios archivos encima.
    const zona = screen.getByText('Elegí un archivo').closest('label')!
    fireEvent.drop(zona, { dataTransfer: { files: [archivo('1.jpg'), archivo('2.jpg')] } })
    await esperarXhr(1)
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Esta pieza lleva un solo archivo. Quitá el actual para subir otro.',
    )
  })

  it('mientras sube también cuenta para el límite', async () => {
    montar({ tipo: 'foto' })
    await usuario().upload(entrada(), archivo())
    await esperarXhr(1)
    expect(entrada()).toBeDisabled()
  })
})

describe('SubidaMedios · cancelar, reintentar y quitar', () => {
  it('cancelar corta la subida, saca el archivo y no avisa un medio', async () => {
    const { onChange, onOcupado } = montar({ tipo: 'foto' })
    await usuario().upload(entrada(), archivo('lento.jpg'))
    await esperarXhr(1)
    await usuario().click(screen.getByRole('button', { name: 'Cancelar la subida de «lento.jpg»' }))
    expect(ultimoXhr().abortado).toBe(true)
    expect(screen.queryByText('lento.jpg')).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
    expect(onOcupado).toHaveBeenLastCalledWith(false)
    expect(entrada()).toBeEnabled() // se puede volver a elegir
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('si el PUT falla muestra el error y se puede reintentar', async () => {
    const { onChange, onOcupado } = montar({ tipo: 'foto' })
    await usuario().upload(entrada(), archivo('mala.jpg'))
    await esperarXhr(1)
    ultimoXhr().terminar(500)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo subir el archivo (error 500).',
    )
    expect(onOcupado).toHaveBeenLastCalledWith(false)
    expect(onChange).not.toHaveBeenCalled()

    await usuario().click(screen.getByRole('button', { name: 'Reintentar «mala.jpg»' }))
    await esperarXhr(2)
    expect(onOcupado).toHaveBeenLastCalledWith(true)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    ultimoXhr().terminar(200)
    await screen.findByText('Subido')
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('una red caída o un bloqueo de CORS se explica como problema de conexión', async () => {
    montar({ tipo: 'foto' })
    await usuario().upload(entrada(), archivo())
    await esperarXhr(1)
    ultimoXhr().fallarRed()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo subir el archivo. Revisá tu conexión.',
    )
  })

  it('si el backend no firma la subida (422) muestra su motivo y se puede reintentar', async () => {
    server.use(
      http.post('*/api/medios', () =>
        HttpResponse.json({ detalle: 'Tamaño de archivo no admitido' }, { status: 422 }),
      ),
    )
    montar({ tipo: 'foto' })
    await usuario().upload(entrada(), archivo('a.jpg'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Tamaño de archivo no admitido')
    expect(FakeXHR.instancias).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Reintentar «a.jpg»' })).toBeInTheDocument()
  })

  it('con la publicación apagada (404) pide probar de nuevo, sin detalles técnicos', async () => {
    server.use(
      http.post('*/api/medios', () =>
        HttpResponse.json({ detalle: 'No encontrado' }, { status: 404 }),
      ),
    )
    montar({ tipo: 'foto' })
    await usuario().upload(entrada(), archivo())
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo preparar la subida. Probá de nuevo.',
    )
  })

  it('quitar un archivo ya subido avisa la lista sin ese medio', async () => {
    const { onChange } = montar({ tipo: 'foto' })
    await usuario().upload(entrada(), archivo('q.jpg'))
    await esperarXhr(1)
    ultimoXhr().terminar()
    await screen.findByText('Subido')
    onChange.mockClear()
    await usuario().click(screen.getByRole('button', { name: 'Quitar «q.jpg»' }))
    expect(onChange).toHaveBeenCalledWith([])
    expect(screen.queryByText('q.jpg')).not.toBeInTheDocument()
  })

  it('un archivo cancelado o quitado que sigue en vuelo no cambia nada cuando termina', async () => {
    const { onChange } = montar({ tipo: 'foto' })
    await usuario().upload(entrada(), archivo('x.jpg'))
    await esperarXhr(1)
    const xhr = ultimoXhr()
    await usuario().click(screen.getByRole('button', { name: /Cancelar la subida/ }))
    xhr.terminar(200) // una respuesta que llega tarde
    await new Promise((r) => setTimeout(r, 20))
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByText('x.jpg')).not.toBeInTheDocument()
  })

  it('al desmontar cancela lo que sigue subiendo y libera las vistas previas', async () => {
    const { unmount } = montar({ tipo: 'foto' })
    await usuario().upload(entrada(), archivo())
    await esperarXhr(1)
    unmount()
    expect(ultimoXhr().abortado).toBe(true)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:vista-previa')
  })
})

describe('SubidaMedios · ordenar', () => {
  const tres = [medio('a.jpg'), medio('b.jpg'), medio('c.jpg')]

  it('en un carrusel se sube y se baja cada archivo, y los extremos no se pueden pasar', async () => {
    const { onChange } = montar({ tipo: 'carrusel', valor: tres })
    const nombres = () =>
      within(screen.getByRole('list', { name: 'Archivos de la pieza' }))
        .getAllByRole('listitem')
        .map((li) => li.querySelector('p')!.textContent)
    expect(nombres()).toEqual(['a.jpg', 'b.jpg', 'c.jpg'])
    expect(screen.getByRole('button', { name: 'Subir «a.jpg»' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Bajar «c.jpg»' })).toBeDisabled()

    await usuario().click(screen.getByRole('button', { name: 'Subir «b.jpg»' }))
    expect(nombres()).toEqual(['b.jpg', 'a.jpg', 'c.jpg'])
    expect(onChange).toHaveBeenLastCalledWith([tres[1], tres[0], tres[2]])

    await usuario().click(screen.getByRole('button', { name: 'Bajar «b.jpg»' }))
    expect(nombres()).toEqual(['a.jpg', 'b.jpg', 'c.jpg'])
    expect(onChange).toHaveBeenLastCalledWith(tres)
  })

  it('con un solo archivo permitido no hay botones de orden', () => {
    montar({ tipo: 'foto', valor: [medio('a.jpg')] })
    expect(screen.queryByRole('button', { name: /^Subir «/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Bajar «/ })).not.toBeInTheDocument()
  })

  it('con un solo archivo en un carrusel tampoco hay nada para ordenar', () => {
    montar({ tipo: 'carrusel', valor: [medio('a.jpg')] })
    expect(screen.queryByRole('button', { name: /^Subir «/ })).not.toBeInTheDocument()
  })

  it('también se ordenan las fotos de TikTok', () => {
    montar({ tipo: 'fotos', valor: [medio('a.jpg'), medio('b.jpg')] })
    expect(screen.getByRole('button', { name: 'Bajar «a.jpg»' })).toBeEnabled()
  })
})

describe('SubidaMedios · medios que ya vienen del formulario', () => {
  it('muestra los medios de un borrador con el nombre del archivo y como subidos', () => {
    montar({ tipo: 'carrusel', valor: [medio('look-1.jpg'), medio('clip.mp4', 'video')] })
    expect(screen.getByText('look-1.jpg')).toBeInTheDocument()
    expect(screen.getByText('clip.mp4')).toBeInTheDocument()
    expect(screen.getAllByText('Subido')).toHaveLength(2)
    expect(document.querySelector('video')).not.toBeNull()
  })

  it('no vuelve a avisar un cambio que el formulario ya conoce', () => {
    const { onChange, onOcupado } = montar({
      tipo: 'carrusel',
      valor: [medio('a.jpg'), medio('b.jpg')],
    })
    expect(onChange).not.toHaveBeenCalled()
    expect(onOcupado).not.toHaveBeenCalled()
  })

  it('sigue al formulario cuando este cambia los medios por su cuenta', () => {
    const { rerender } = montar({ tipo: 'carrusel', valor: [medio('a.jpg'), medio('b.jpg')] })
    rerender(
      <SubidaMedios
        tipo="carrusel"
        valor={[medio('c.jpg'), medio('d.jpg'), medio('e.jpg')]}
        onChange={vi.fn()}
      />,
    )
    expect(screen.queryByText('a.jpg')).not.toBeInTheDocument()
    expect(screen.getByText('c.jpg')).toBeInTheDocument()
    expect(screen.getByText('e.jpg')).toBeInTheDocument()
    rerender(<SubidaMedios tipo="carrusel" valor={[]} onChange={vi.fn()} />)
    expect(screen.queryByText('c.jpg')).not.toBeInTheDocument()
  })

  it('un `valor` nuevo pero igual (por ejemplo `[]` en cada render) no borra lo que se está subiendo', async () => {
    const { rerender } = montar({ tipo: 'foto' })
    await usuario().upload(entrada(), archivo('en-curso.jpg'))
    await esperarXhr(1)
    rerender(<SubidaMedios tipo="foto" valor={[]} onChange={vi.fn()} />)
    rerender(<SubidaMedios tipo="foto" valor={[]} onChange={vi.fn()} />)
    expect(screen.getByRole('progressbar', { name: 'Subiendo en-curso.jpg' })).toBeInTheDocument()
  })

  it('con el estado en el formulario, lo subido vuelve como `valor` sin duplicarse ni perderse', async () => {
    render(<Controlado tipo="carrusel" inicial={[medio('previo.jpg')]} />)
    await usuario().upload(entrada(/elegir archivos/i), [archivo('nuevo.jpg')])
    await esperarXhr(1)
    ultimoXhr().terminar()
    await waitFor(() =>
      expect(screen.getByLabelText('en el formulario')).toHaveTextContent(
        /^previo\.jpg,.+nuevo\.jpg$/,
      ),
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    await usuario().click(screen.getByRole('button', { name: 'Quitar «previo.jpg»' }))
    expect(screen.getByLabelText('en el formulario')).toHaveTextContent(/^.+nuevo\.jpg$/)
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })
})

describe('SubidaMedios · eco del formulario', () => {
  it('un eco viejo del formulario (solo la primera subida) no reconstruye la lista ni pierde la segunda', async () => {
    const { onChange, rerender } = montar({ tipo: 'carrusel' })
    await usuario().upload(entrada(/elegir archivos/i), [archivo('uno.jpg'), archivo('dos.jpg')])
    await esperarXhr(2)
    const xhrDe = (nombre: string) => FakeXHR.instancias.find((x) => x.url.includes(`-${nombre}`))!
    xhrDe('uno.jpg').terminar(200)
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1))
    xhrDe('dos.jpg').terminar(200)
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(2))
    const primero: Medio[] = onChange.mock.calls[0]![0]
    const ambos: Medio[] = onChange.mock.calls[1]![0]
    expect(ambos).toHaveLength(2)

    // El formulario todavía renderiza con lo primero que se le avisó…
    rerender(<SubidaMedios tipo="carrusel" valor={primero} onChange={onChange} />)
    // …y la lista no se reconstruye: siguen los dos, con el nombre del archivo y su vista previa local.
    expect(screen.getByText('uno.jpg')).toBeInTheDocument()
    expect(screen.getByText('dos.jpg')).toBeInTheDocument()
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    // Después llega el eco de lo último: tampoco cambia nada.
    rerender(<SubidaMedios tipo="carrusel" valor={ambos} onChange={onChange} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('uno.jpg')).toBeInTheDocument()
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('si el formulario se limpia por su cuenta, la lista se vacía', async () => {
    render(<Controlado tipo="carrusel" inicial={[medio('a.jpg'), medio('b.jpg')]} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    await usuario().click(screen.getByRole('button', { name: 'Limpiar el formulario' }))
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    // …y se puede subir de nuevo después.
    await usuario().upload(entrada(/elegir archivos/i), archivo('otra.jpg'))
    await esperarXhr(1)
    ultimoXhr().terminar()
    await waitFor(() =>
      expect(screen.getByLabelText('en el formulario')).toHaveTextContent(/otra\.jpg$/),
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })

  it('si el formulario cambia a otros medios a mitad de una subida, esa subida sigue en la lista', async () => {
    const { rerender } = montar({ tipo: 'carrusel', valor: [medio('a.jpg')] })
    await usuario().upload(entrada(/elegir archivos/i), archivo('nueva.jpg'))
    await esperarXhr(1)
    rerender(
      <SubidaMedios tipo="carrusel" valor={[medio('x.jpg'), medio('y.jpg')]} onChange={vi.fn()} />,
    )
    expect(screen.getByText('x.jpg')).toBeInTheDocument()
    expect(screen.queryByText('a.jpg')).not.toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Subiendo nueva.jpg' })).toBeInTheDocument()
  })
})

describe('SubidaMedios · desactivado', () => {
  it('con `disabled` no se puede elegir, quitar, ordenar ni reintentar', () => {
    montar({ tipo: 'carrusel', valor: [medio('a.jpg'), medio('b.jpg')], disabled: true })
    expect(entrada(/elegir archivos/i)).toBeDisabled()
    for (const b of screen.getAllByRole('button')) expect(b).toBeDisabled()
  })
})
