import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('muestra el nombre del producto', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('social engine')
  })
})
