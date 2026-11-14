import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { ArrowDown } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { EstadoError } from '@/components/estados'
import { Composer } from './Composer'
import { ContextoChip } from './ContextoChip'
import { TextoFidel } from './TextoFidel'
import { useChat } from './useChat'
import type { MensajeChat } from './tipos'

const ruta = getRouteApi('/chat')

const SUGERENCIAS = [
  '¿Qué publiqué mejor este mes?',
  '¿A qué hora me conviene publicar?',
  '¿Qué formato me rinde más?',
]

const AVATAR =
  'grid size-7 shrink-0 place-items-center rounded-full bg-[image:var(--brand-gradient)] text-xs font-extrabold text-on-accent'

function Escribiendo() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted" role="status">
      <span className="flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 animate-bounce rounded-full bg-muted motion-reduce:animate-none"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </span>
      Fidel está escribiendo…
    </div>
  )
}

function Burbuja({ m, enCurso }: { m: MensajeChat; enCurso: boolean }) {
  if (m.rol === 'usuario')
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-xl rounded-br-sm border border-line bg-raised px-4 py-2.5">
          {m.texto}
        </p>
      </div>
    )
  return (
    <div className="flex gap-3">
      <span className={AVATAR} aria-hidden="true">
        F
      </span>
      <div className="min-w-0 flex-1 space-y-2 pt-0.5">
        <span className="sr-only">Fidel: </span>
        {m.texto && <TextoFidel texto={m.texto} enCurso={enCurso} />}
        {m.estado === 'detenido' && <p className="text-xs text-muted">Detuviste la respuesta.</p>}
      </div>
    </div>
  )
}

export function ChatPage() {
  const { item } = ruta.useSearch()
  const navegar = useNavigate()
  // El chip se puede quitar; si llega otro `?item=`, vuelve a aparecer.
  const [quitado, setQuitado] = useState<string>()
  const conItem = item !== quitado ? item : undefined

  const { mensajes, estado, ocupado, enviar, detener, reintentar } = useChat({ itemId: conItem })
  const ultimo = mensajes.at(-1)
  const fallo = ultimo?.rol === 'fidel' && ultimo.estado === 'error' ? ultimo : null

  // Seguir al último mensaje solo si el usuario está al final; si subió a leer, no se lo pelea.
  const lista = useRef<HTMLDivElement>(null)
  const pegado = useRef(true)
  const [lejos, setLejos] = useState(false)
  const alFondo = useCallback(() => {
    const el = lista.current
    if (el) el.scrollTop = el.scrollHeight
    pegado.current = true
    setLejos(false)
  }, [])
  function alScrollear() {
    const el = lista.current
    if (!el) return
    const cerca = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    pegado.current = cerca
    setLejos(!cerca)
  }
  useEffect(() => {
    if (pegado.current) alFondo()
  }, [mensajes, estado, alFondo])

  function alEnviar(texto: string) {
    pegado.current = true
    return enviar(texto)
  }
  function quitarContexto() {
    setQuitado(item)
    void navegar({ to: '/chat', search: {}, replace: true })
  }

  return (
    <section
      aria-label="Chat con Fidel"
      className="mx-auto flex h-[calc(100dvh-11rem-env(safe-area-inset-bottom))] w-full max-w-3xl flex-col md:h-[calc(100dvh-8.5rem)]"
    >
      <h1 className="sr-only">Fidel</h1>
      <div className="relative min-h-0 flex-1">
        <div
          ref={lista}
          onScroll={alScrollear}
          role="log"
          aria-live="polite"
          aria-busy={ocupado}
          aria-label="Conversación con Fidel"
          tabIndex={0}
          className="h-full overflow-y-auto overscroll-contain px-1 py-4"
        >
          {mensajes.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
              <span className={`${AVATAR} size-12 text-xl`} aria-hidden="true">
                F
              </span>
              <div className="space-y-1">
                <h2 className="text-2xl font-extrabold tracking-tight">Hola, soy Fidel</h2>
                <p className="mx-auto max-w-sm text-muted">
                  Miro cómo te fue en Instagram y te cuento qué conviene repetir. No publico ni
                  cambio nada por vos.
                </p>
              </div>
              <ul className="flex flex-wrap justify-center gap-2" aria-label="Preguntas sugeridas">
                {SUGERENCIAS.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => enviar(s)}
                      className="rounded-full border border-line bg-raised px-4 py-2 text-sm font-semibold hover:border-line-strong"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="space-y-5">
              {mensajes.map((m) => (
                <Burbuja key={m.id} m={m} enCurso={m.estado === 'streaming'} />
              ))}
              {estado === 'esperando' && (
                <div className="pl-10">
                  <Escribiendo />
                </div>
              )}
              {fallo && (
                <div className="pl-10">
                  <EstadoError
                    mensaje={fallo.error ?? 'No pudimos hablar con Fidel.'}
                    onReintentar={reintentar}
                  />
                </div>
              )}
            </div>
          )}
        </div>
        {lejos && (
          <button
            type="button"
            onClick={alFondo}
            className="absolute bottom-2 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-line bg-raised px-3 py-1.5 text-xs font-semibold shadow-card"
          >
            <ArrowDown className="size-3.5" aria-hidden="true" />
            Ir al final
          </button>
        )}
      </div>
      <div className="space-y-2 pb-1 pt-2">
        {conItem && <ContextoChip itemId={conItem} onQuitar={quitarContexto} />}
        <Composer ocupado={ocupado} onEnviar={alEnviar} onDetener={detener} />
      </div>
    </section>
  )
}
