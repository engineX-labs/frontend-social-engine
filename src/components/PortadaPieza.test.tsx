import { render } from '@testing-library/react'
import { PortadaPieza } from './PortadaPieza'

const foto = { url: 'https://mock.zernio.test/a.jpg', tipo: 'imagen' as const }
const video = { url: 'https://mock.zernio.test/a.mp4', tipo: 'video' as const }

describe('PortadaPieza', () => {
  it('usa la portada elegida', () => {
    const { container } = render(
      <PortadaPieza pieza={{ portadaUrl: 'https://mock.zernio.test/p.jpg', medios: [video] }} />,
    )
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://mock.zernio.test/p.jpg')
  })

  it('sin portada usa la primera imagen', () => {
    const { container } = render(<PortadaPieza pieza={{ medios: [foto] }} />)
    expect(container.querySelector('img')).toHaveAttribute('src', foto.url)
  })

  it('un video sin portada muestra un fotograma del video', () => {
    const { container } = render(<PortadaPieza pieza={{ portadaUrl: null, medios: [video] }} />)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('video')?.getAttribute('src')).toContain(video.url)
  })

  it('sin nada que mostrar deja un ícono, no un hueco', () => {
    const { container } = render(<PortadaPieza pieza={{ portadaUrl: null, medios: [] }} />)
    expect(container.querySelector('svg')).not.toBeNull()
  })
})
