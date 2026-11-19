/**
 * Cómo se entra por primera vez (decisión de `plans/registro-abierto.md`, tiene que coincidir con
 * el modo de registro del panel de Clerk; el front no lo cambia):
 * - `invitacion`: solo ingreso, sin registro (el modo de hoy, Invite-only).
 * - `lista_de_espera`: además se ofrece anotarse (`<Waitlist />`); nosotros aprobamos desde Clerk.
 * - `abierto`: además se ofrece crear la cuenta (`<SignUp />`).
 */
export type ModoDeRegistro = 'invitacion' | 'lista_de_espera' | 'abierto'

export const MODO_DE_REGISTRO: ModoDeRegistro =
  import.meta.env.VITE_REGISTRO === 'lista_de_espera' || import.meta.env.VITE_REGISTRO === 'abierto'
    ? import.meta.env.VITE_REGISTRO
    : 'invitacion'
