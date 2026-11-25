/**
 * Alta de prueba (decisión 0007 de `social-engine/decisiones/`): en «Estamos preparando tu cuenta» la
 * persona puede pegar la key de su cuenta de Zernio. Solo para probar el flujo de alta: apagada, la app se
 * ve igual que antes. El backend tiene la suya (`ALTA_CON_KEY_HABILITADA`; apagada, la ruta responde 404).
 */
export function altaConKeyHabilitada(): boolean {
  return import.meta.env.VITE_ALTA_CON_KEY === 'true'
}
