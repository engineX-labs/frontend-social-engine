/**
 * Bandera de publicar y programar. Con la bandera apagada la app se ve igual que antes. El backend
 * tiene la suya (`PUBLICACION_HABILITADA`): si está apagada, `GET /api/redes` responde 404 y el front
 * también esconde todo (ver `useRedes` en `api/publicacion.ts`).
 */
export function publicacionHabilitada(): boolean {
  return import.meta.env.VITE_PUBLICACION_HABILITADA === 'true'
}
