const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'

/** Trampa de foco para un diálogo modal: con Tab el foco no sale del contenedor. */
export function atraparTab(e: KeyboardEvent, contenedor: HTMLElement | null) {
  if (e.key !== 'Tab' || !contenedor) return
  const foco = Array.from(contenedor.querySelectorAll<HTMLElement>(ENFOCABLES)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  )
  const primero = foco[0]
  const ultimo = foco[foco.length - 1]
  if (!primero || !ultimo) return
  const activo = document.activeElement
  if (!contenedor.contains(activo)) {
    e.preventDefault()
    primero.focus()
  } else if (e.shiftKey && activo === primero) {
    e.preventDefault()
    ultimo.focus()
  } else if (!e.shiftKey && activo === ultimo) {
    e.preventDefault()
    primero.focus()
  }
}
