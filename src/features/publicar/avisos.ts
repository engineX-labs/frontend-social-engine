import { toast } from 'sonner'
import { ETIQUETA_TIPO, situacionDe, type SituacionProgramada } from '@/domain/publicacion'
import type { Programada } from '@/domain/types'
import { diaLargo, hora } from '@/lib/fecha'
import { NOMBRE_RED } from '@/lib/redes'

/** Lo último que se vio de cada pieza (por id) en esta sesión del navegador. */
export type Vistas = Record<string, SituacionProgramada>
type Resultado = 'publicada' | 'fallida' | 'no-se-publico'
export interface Aviso {
  pieza: Programada
  resultado: Resultado
}

const PENDIENTES: readonly SituacionProgramada[] = ['programada', 'publicando', 'confirmando']
const RESULTADOS: readonly SituacionProgramada[] = ['publicada', 'fallida', 'no-se-publico']
const MAX_VISTAS = 300
const CLAVE = 'social-engine.publicacion.vistas'

/**
 * Qué piezas acaban de resolverse. Solo se avisa de una **transición observada**: una pieza que estaba
 * pendiente (programada, publicándose o «Confirmando…») y ahora salió bien o mal. Lo que ya estaba
 * terminado cuando se abrió la app no se avisa, ni se repite al refrescar: lo último visto se guarda.
 * «Confirmando…» no es un resultado.
 */
export function detectarAvisos(
  previas: Vistas,
  piezas: readonly Programada[],
): { avisos: Aviso[]; vistas: Vistas } {
  const vistas: Vistas = { ...previas }
  const avisos: Aviso[] = []
  for (const pieza of piezas) {
    const ahora = situacionDe(pieza)
    const antes = previas[pieza.id]
    if (antes && PENDIENTES.includes(antes) && RESULTADOS.includes(ahora))
      avisos.push({ pieza, resultado: ahora as Resultado })
    vistas[pieza.id] = ahora
  }
  // Un tope para que la memoria de la sesión no crezca sin límite: se descartan las más viejas.
  const ids = Object.keys(vistas)
  for (const id of ids.slice(0, Math.max(0, ids.length - MAX_VISTAS))) delete vistas[id]
  return { avisos, vistas }
}

export function textoDeAviso({ pieza, resultado }: Aviso): { titulo: string; descripcion: string } {
  const que = `${ETIQUETA_TIPO[pieza.formato]} en ${NOMBRE_RED[pieza.red]}`
  const cuando = pieza.fecha ? ` del ${diaLargo(pieza.fecha)} a las ${hora(pieza.fecha)}` : ''
  if (resultado === 'publicada')
    return { titulo: `Se publicó en ${NOMBRE_RED[pieza.red]}`, descripcion: `${que}${cuando}.` }
  if (resultado === 'no-se-publico')
    return {
      titulo: 'No se publicó',
      descripcion: `${que}${cuando} no llegó a publicarse. Podés crearla de nuevo.`,
    }
  return {
    titulo: 'No se pudo publicar',
    descripcion: `${que}${cuando}: ${pieza.error ?? 'falló la publicación'}.`,
  }
}

/** Más de esto juntos se agrupan: Sonner muestra 3 a la vez y no tiene sentido tapar la pantalla. */
export const MAX_INDIVIDUALES = 3

/** Un aviso por pieza; si se resuelven más de 3 a la vez, uno solo por resultado. */
export function mostrarAvisos(avisos: readonly Aviso[], abrir: (pieza: Programada) => void): void {
  const bien = avisos.filter((a) => a.resultado === 'publicada')
  const mal = avisos.filter((a) => a.resultado !== 'publicada')
  const grupos: [readonly Aviso[], boolean][] = [
    [bien, true],
    [mal, false],
  ]
  for (const [grupo, esBien] of grupos) {
    if (!grupo.length) continue
    if (grupo.length > MAX_INDIVIDUALES) {
      const primera = grupo[0]!.pieza
      const titulo = esBien
        ? `Se publicaron ${grupo.length} piezas`
        : `${grupo.length} piezas no se pudieron publicar`
      const opciones = {
        id: `publicar-grupo-${esBien ? 'bien' : 'mal'}`,
        action: { label: 'Ver', onClick: () => abrir(primera) },
      }
      if (esBien) toast(titulo, opciones)
      else toast.error(titulo, opciones)
      continue
    }
    for (const aviso of grupo) {
      const { titulo, descripcion } = textoDeAviso(aviso)
      const opciones = {
        id: `publicar-${aviso.pieza.id}-${aviso.resultado}`,
        description: descripcion,
        action: { label: 'Ver', onClick: () => abrir(aviso.pieza) },
      }
      if (esBien) toast(titulo, opciones)
      else toast.error(titulo, opciones)
    }
  }
}

// --- Memoria de la sesión ---------------------------------------------------------------------
// `sessionStorage` puede no estar (modo privado, datos bloqueados): se guarda también en memoria, así
// dentro de la misma pestaña no se repite nada aunque falle, y sin ninguno de los dos no se avisa de
// más (lo que no se recuerda se toma como «ya estaba»).
let memoria: Vistas = {}

export function leerVistas(): Vistas {
  try {
    const crudo = sessionStorage.getItem(CLAVE)
    if (crudo) {
      const v: unknown = JSON.parse(crudo)
      if (v && typeof v === 'object' && !Array.isArray(v)) return v as Vistas
    }
  } catch {
    // Se sigue con lo que hay en memoria.
  }
  return memoria
}

export function guardarVistas(vistas: Vistas): void {
  memoria = vistas
  try {
    sessionStorage.setItem(CLAVE, JSON.stringify(vistas))
  } catch {
    // Solo en memoria.
  }
}

/** Para los tests: olvida todo lo visto. */
export function olvidarVistas(): void {
  memoria = {}
  try {
    sessionStorage.removeItem(CLAVE)
  } catch {
    // Nada que borrar.
  }
}
