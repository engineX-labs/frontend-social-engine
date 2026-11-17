#!/usr/bin/env node
/**
 * Genera un JWT de desarrollo con el formato que valida el backend (HS256, `aud = authenticated`,
 * usuario en `sub`). Sirve para probar el front contra el backend local sin pantalla de login.
 *
 *   SUPABASE_JWT_SECRET=<el mismo del .env del backend> node scripts/token-dev.mjs <uuid del usuario>
 *
 * Imprime el token; se pega en `.env.local` como `VITE_DEV_TOKEN=...`. Vale 8 horas.
 * El secreto se lee del entorno (nunca por argumento) y el token solo se usa en `npm run dev`.
 */
import { createHmac } from 'node:crypto'

const secreto = process.env.SUPABASE_JWT_SECRET
const usuario = process.argv[2]
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

if (!secreto) {
  console.error('Falta SUPABASE_JWT_SECRET en el entorno.')
  process.exit(1)
}
if (!usuario || !UUID.test(usuario)) {
  console.error('Uso: node scripts/token-dev.mjs <uuid del usuario>')
  process.exit(1)
}

const b64 = (objeto) => Buffer.from(JSON.stringify(objeto)).toString('base64url')
const ahora = Math.floor(Date.now() / 1000)
const cuerpo = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({
  sub: usuario,
  aud: 'authenticated',
  role: 'authenticated',
  iat: ahora,
  exp: ahora + 8 * 3600,
})}`
const firma = createHmac('sha256', secreto).update(cuerpo).digest('base64url')
console.log(`${cuerpo}.${firma}`)
