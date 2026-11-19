import type { Formato } from '@/domain/types'

const PAL = [
  ['#d8cfc2', '#8d7b68'],
  ['#c9b8a6', '#5a4636'],
  ['#e6d9c8', '#b59a7a'],
  ['#bfc7c4', '#4f5f5c'],
  ['#d9c5bd', '#8a5a4a'],
  ['#cfd3da', '#5b6577'],
  ['#e2d6c3', '#7a6a4f'],
  ['#c8b6c0', '#6d4b5c'],
  ['#d4cdb8', '#6b6a45'],
  ['#bcc3b3', '#506049'],
  ['#e0cfc9', '#9a6b5e'],
  ['#c5cbd3', '#44505f'],
  ['#d5c9d6', '#6a5470'],
  ['#c4d3c8', '#41614d'],
  ['#e5d0c0', '#a8663f'],
] as const

/** Portada de ejemplo (4:5) como data URI SVG, sin pedir imágenes a ningún lado. */
export function portadaDemo(idx: number, formato: Formato): string {
  const c = PAL[idx % PAL.length] as readonly [string, string]
  const s = idx % 4
  const formas = [
    '<circle cx="110" cy="80" r="52" fill="#fff" opacity=".22"/><circle cx="50" cy="150" r="34" fill="#000" opacity=".12"/>',
    '<path d="M30 200V100a50 50 0 0 1 100 0v100z" fill="#fff" opacity=".24"/><rect x="100" y="140" width="50" height="50" fill="#000" opacity=".12"/>',
    '<rect x="20" y="0" width="34" height="200" fill="#fff" opacity=".2"/><rect x="70" y="30" width="34" height="170" fill="#000" opacity=".12"/><rect x="118" y="70" width="34" height="130" fill="#fff" opacity=".28"/>',
    '<path d="M0 200 90 0h50L50 200z" fill="#fff" opacity=".22"/><path d="M110 200 160 90v110z" fill="#000" opacity=".14"/>',
  ]
  let marca = ''
  if (formato === 'Reel')
    marca =
      '<circle cx="80" cy="100" r="20" fill="#fff" opacity=".9"/><path d="M74 88l20 12-20 12z" fill="#0E1116"/>'
  if (formato === 'Carrusel')
    marca =
      '<circle cx="68" cy="182" r="3.5" fill="#fff"/><circle cx="80" cy="182" r="3.5" fill="#fff" opacity=".6"/><circle cx="92" cy="182" r="3.5" fill="#fff" opacity=".6"/>'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 200" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient></defs><rect width="160" height="200" fill="url(#g)"/>${formas[s]}${marca}</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
