/**
 * Manda al navegador a otra dirección (la `authUrl` de Zernio). Está aparte para que los tests
 * lo reemplacen: jsdom no navega.
 */
export function irA(url: string) {
  window.location.assign(url)
}
