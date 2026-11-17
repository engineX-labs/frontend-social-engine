/**
 * Único punto donde se obtiene el token con el que el front habla con la API.
 *
 * Hoy no hay login: en desarrollo (`npm run dev`) sale de `VITE_DEV_TOKEN`, un JWT firmado con el
 * secreto local de Supabase (ver `scripts/token-dev.mjs`). Con `import.meta.env.DEV` en falso Vite
 * elimina esa rama del build, así que el token nunca llega a producción. El login real con
 * supabase-js (ticket "Auth + onboarding de usuario") se enchufa acá, sin tocar el resto.
 */
export async function obtenerToken(): Promise<string | null> {
  if (import.meta.env.DEV) {
    const token = import.meta.env.VITE_DEV_TOKEN as string | undefined
    return token?.trim() || null
  }
  return null
}
