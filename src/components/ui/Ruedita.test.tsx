import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Ruedita } from './Ruedita'

describe('Ruedita', () => {
  it('se anuncia como estado con su etiqueta', () => {
    render(<Ruedita etiqueta="Guardando" />)
    expect(screen.getByRole('status', { name: 'Guardando' })).toBeInTheDocument()
  })
})
