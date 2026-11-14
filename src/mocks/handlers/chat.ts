import { http, HttpResponse } from 'msw'
import { calcularResumen } from '@/domain/metrics'
import type { Item } from '@/domain/types'
import type { PeticionChat } from '@/features/chat/tipos'
import { claveMes, diaLargo, partesBA } from '@/lib/fecha'
import { buscarItem, PUBLICADAS } from '../datos'

/** Pausas del stream simulado. Los tests las ponen en 0. */
export const chatMock = { retardoMs: 35, palabrasPorTrozo: 2 }

const num = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
const enlace = (texto: string, id: string, fecha: string) =>
  `[${texto}](/?item=${id}&mes=${claveMes(fecha)})`

function respuestaDeItem(item: Item): string {
  const f = item.formato.toLowerCase()
  if (item.tipo === 'idea')
    return `Esta idea es un ${f} para el ${diaLargo(item.fecha)} a las ${partesBA(item.fecha).hora} h. ${item.porQue[0] ?? ''} Lo vemos en el calendario: ${enlace('abrir la idea', item.id, item.fecha)}.`
  const r = calcularResumen(PUBLICADAS)
  const vs = item.alcance / r.medianaAlcance
  const comparacion =
    vs >= 1.1
      ? `quedó ${vs.toFixed(1).replace('.', ',')} veces sobre tu mediana`
      : vs <= 0.9
        ? `quedó por debajo de tu mediana`
        : 'rindió en línea con tu mediana'
  return `Ese ${f} del ${diaLargo(item.fecha)} llegó a ${num(item.alcance)} cuentas con ${num(item.interacciones)} interacciones y ${comparacion} (${num(r.medianaAlcance)}). ${item.analisis} ${enlace('Ver la publicación', item.id, item.fecha)}.`
}

function respuestaGenerica(pregunta: string): string {
  const r = calcularResumen(PUBLICADAS)
  const q = pregunta.toLowerCase()
  const mejor = [...PUBLICADAS].sort((a, b) => b.alcance - a.alcance)[0]!
  if (/(mejor|mejores|rindi|funcion)/.test(q) && /(public|mes|post)/.test(q))
    return `Lo que mejor te fue este mes: un ${mejor.formato.toLowerCase()} del ${diaLargo(mejor.fecha)} con ${num(mejor.alcance)} de alcance, contra una mediana de ${num(r.medianaAlcance)}. ${enlace('Mirala acá', mejor.id, mejor.fecha)}. Son ${r.cantidad} publicaciones, tomalo como una señal y no como una regla.`
  if (/(hora|horario|cuándo|cuando|momento)/.test(q))
    return `De 18 a 22 h tu mediana de alcance es ${num(r.medianaNoche ?? 0)}, contra ${num(r.medianaResto ?? 0)} en el resto del día. Tu mejor publicación salió a las ${r.mejorHora} h. Si tenés que elegir, la noche.`
  if (/(formato|reel|carrusel|foto)/.test(q)) {
    const [mejorF, med] = Object.entries(r.medianaPorFormato).sort((a, b) => b[1] - a[1])[0]!
    return `El formato que mejor te rinde es ${mejorF === 'Reel' ? 'el reel' : mejorF === 'Foto' ? 'la foto' : 'el carrusel'}, con una mediana de ${num(med)} de alcance (${(med / r.medianaAlcance).toFixed(1).replace('.', ',')} veces tu mediana general). Después van los otros dos formatos, bastante más abajo.`
  }
  return `Puedo mirar tus publicaciones y decirte qué te rindió mejor, a qué hora conviene publicar o qué formato funciona más. Probá con alguna de esas preguntas. Por ahora tu mediana de alcance es ${num(r.medianaAlcance)}. Ojo: yo analizo y sugiero, no publico ni programo nada.`
}

export function respuestaMock(p: PeticionChat): string {
  const pregunta = p.mensajes.findLast((m) => m.rol === 'usuario')?.texto ?? ''
  const item = p.itemId ? buscarItem(p.itemId) : null
  if (item) return respuestaDeItem(item)
  if (p.itemId) return 'No encuentro esa publicación en el calendario. ¿Probás abrirla de nuevo?'
  return respuestaGenerica(pregunta)
}

const esperar = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (ms <= 0 || signal.aborted) return resolve()
    const t = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => (clearTimeout(t), resolve()), { once: true })
  })

/** Mensajes con "/error" fallan la primera vez que se preguntan, así se prueba "Reintentar". */
const yaFallaron = new Set<string>()

export const chatHandlers = [
  http.post('*/api/chat', async ({ request }) => {
    const peticion = (await request.json().catch(() => null)) as PeticionChat | null
    if (!peticion?.mensajes?.length)
      return HttpResponse.json({ detalle: 'Falta el historial de mensajes' }, { status: 422 })

    const pregunta = peticion.mensajes.findLast((m) => m.rol === 'usuario')?.texto ?? ''
    const fallar = pregunta.includes('/error') && !yaFallaron.has(pregunta)
    if (fallar) yaFallaron.add(pregunta)

    const palabras = respuestaMock(peticion).split(/(?<=\s)/)
    const codificador = new TextEncoder()
    const evento = (datos: string, nombre?: string) =>
      codificador.encode(`${nombre ? `event: ${nombre}\n` : ''}data: ${datos}\n\n`)

    const cuerpo = new ReadableStream<Uint8Array>({
      async start(control) {
        const { signal } = request
        try {
          await esperar(chatMock.retardoMs * 4, signal)
          const trozos: string[] = []
          for (let i = 0; i < palabras.length; i += chatMock.palabrasPorTrozo)
            trozos.push(palabras.slice(i, i + chatMock.palabrasPorTrozo).join(''))
          const hasta = fallar ? Math.min(3, trozos.length) : trozos.length
          for (const t of trozos.slice(0, hasta)) {
            if (signal.aborted) return control.close()
            control.enqueue(evento(JSON.stringify({ delta: t })))
            await esperar(chatMock.retardoMs, signal)
          }
          if (fallar)
            control.enqueue(
              evento(JSON.stringify({ detalle: 'Fidel se cortó. Probá de nuevo.' }), 'error'),
            )
          else control.enqueue(evento('[DONE]'))
          control.close()
        } catch {
          // El consumidor canceló el stream: no hay a quién avisarle.
        }
      },
    })
    return new HttpResponse(cuerpo, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    })
  }),
]
