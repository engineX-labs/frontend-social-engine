import { urlApi } from './http'

describe('urlApi', () => {
  it('sin VITE_API_URL usa el origen actual', () => {
    expect(urlApi('/api/calendario').pathname).toBe('/api/calendario')
  })
})
