import { memo } from 'react'
import { AvatarFidel } from '@/components/ui/AvatarFidel'
import { TarjetaPublicacion } from './TarjetaPublicacion'
import { citasDe } from './citas'
import { TextoFidel } from './TextoFidel'
import type { MensajeChat } from './tipos'

/** Entra una sola vez, al montarse: los mensajes anteriores no se vuelven a animar. */
const ENTRADA = 'animate-aparecer [animation-duration:var(--dur-base)]'

/**
 * Un mensaje de la conversación. Memoizado: el objeto de un mensaje terminado no cambia,
 * así que cada delta del stream solo repinta la respuesta que está llegando.
 */
export const Mensaje = memo(function Mensaje({ m }: { m: MensajeChat }) {
  if (m.rol === 'usuario')
    return (
      <div className={`flex justify-end ${ENTRADA}`}>
        <p className="max-w-[85%] rounded-xl rounded-br-sm border border-accent/25 bg-accent-soft px-4 py-2.5 leading-6 break-words whitespace-pre-wrap sm:max-w-[75%]">
          <span className="sr-only">Vos: </span>
          {m.texto}
        </p>
      </div>
    )

  const enCurso = m.estado === 'streaming'
  const pensando = enCurso && !m.texto
  // Falló antes de decir nada: no queda un avatar suelto, el aviso de error va debajo.
  if (m.estado === 'error' && !m.texto) return null
  const citas = citasDe(m.texto, enCurso)
  return (
    <div className={`flex gap-3 ${ENTRADA}`}>
      <AvatarFidel tamano="sm" pensando={pensando} />
      <div className="max-w-[68ch] min-w-0 flex-1 space-y-3">
        <span className="sr-only">Fidel: </span>
        {pensando ? (
          <p role="status" className="leading-7 text-muted">
            Fidel está mirando tus datos…
          </p>
        ) : (
          m.texto && <TextoFidel texto={m.texto} enCurso={enCurso} />
        )}
        {citas.length > 0 && (
          <ul className="space-y-2" aria-label="Publicaciones citadas">
            {citas.map((c) => (
              <li key={c.item}>
                <TarjetaPublicacion cita={c} />
              </li>
            ))}
          </ul>
        )}
        {m.estado === 'detenido' && <p className="text-sm text-muted">Detuviste la respuesta.</p>}
      </div>
    </div>
  )
})
