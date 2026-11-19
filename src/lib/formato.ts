const NUM = new Intl.NumberFormat('es-AR')

/** Miles con punto (es-AR): 3980 → "3.980". */
export const num = (n: number) => NUM.format(Math.round(n))

/** Rendimiento contra la mediana: "2,3× tu mediana", "28% bajo tu mediana" o "en tu mediana". */
export function textoRazon(razon: number): string {
  if (razon >= 1.3) return `${razon.toFixed(1).replace(/\.0$/, '').replace('.', ',')}× tu mediana`
  if (razon < 0.7) return `${Math.round((1 - razon) * 100)}% bajo tu mediana`
  return 'en tu mediana'
}
