import { render } from '@testing-library/react'
import { NOMBRE_RED } from '@/lib/redes'
import { IconoRed } from './IconoRed'

describe('IconoRed', () => {
  it('dibuja un ícono distinto por red y los dos son decorativos', () => {
    const ig = render(<IconoRed red="instagram" />).container.innerHTML
    const tt = render(<IconoRed red="tiktok" />).container.innerHTML
    expect(ig).not.toBe(tt)
    expect(ig).toContain('aria-hidden="true"')
    expect(tt).toContain('aria-hidden="true"')
  })
  it('tiene el nombre de cada red', () => {
    expect(NOMBRE_RED).toEqual({ instagram: 'Instagram', tiktok: 'TikTok' })
  })
})
