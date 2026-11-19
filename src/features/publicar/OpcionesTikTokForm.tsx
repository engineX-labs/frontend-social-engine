import { Clock, TriangleAlert } from 'lucide-react'
import { useEffect, useId } from 'react'
import { esErrorDeAcceso, mensajeDeApi } from '@/api/errores'
import { useOpcionesTiktok } from '@/api/publicacion'
import { EstadoError } from '@/components/estados'
import { Esqueleto } from '@/components/ui/Esqueleto'
import { PRIVACIDAD_PUBLICA } from '@/domain/publicacion'
import type { OpcionesTikTok, OpcionesTikTokRed } from '@/domain/types'
import { cn } from '@/lib/utils'
import { Interruptor } from './Interruptor'
import { etiquetaPrivacidad, formatearDuracion } from './opcionesTiktok'

const CLASES_TARJETA =
  'flex min-h-11 items-center gap-3 rounded-md border bg-raised px-3 py-2 transition-colors duration-(--dur-fast) ease-brand has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--focus-ring)'

/**
 * Deja el valor consistente con lo que la cuenta permite, para que nunca quede un estado inválido que
 * la pantalla no muestra: una privacidad que no corresponde se quita (el usuario la elige de nuevo) y
 * los interruptores apagados por la cuenta quedan en `false`.
 */
function normalizar(
  valor: OpcionesTikTok,
  tipo: 'video' | 'fotos',
  cuenta: OpcionesTikTokRed,
): OpcionesTikTok {
  const n: OpcionesTikTok = { ...valor }
  const noValida =
    n.privacyLevel !== undefined &&
    (!cuenta.privacidades.includes(n.privacyLevel) ||
      (tipo === 'video' && n.privacyLevel !== PRIVACIDAD_PUBLICA))
  if (noValida) delete n.privacyLevel
  n.allowComment = cuenta.comentariosDeshabilitados ? false : (n.allowComment ?? false)
  if (tipo === 'video') {
    n.allowDuet = cuenta.duetDeshabilitado ? false : (n.allowDuet ?? false)
    n.allowStitch = cuenta.stitchDeshabilitado ? false : (n.allowStitch ?? false)
  }
  n.contentPreviewConfirmed = n.contentPreviewConfirmed ?? false
  n.expressConsentGiven = n.expressConsentGiven ?? false
  return n
}

function iguales(a: OpcionesTikTok, b: OpcionesTikTok): boolean {
  const claves = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof OpcionesTikTok>
  return [...claves].every((k) => a[k] === b[k])
}

/** Opciones obligatorias de TikTok para publicar un video o fotos con la cuenta elegida. */
export function OpcionesTikTokForm({
  tipo,
  redId,
  valor,
  onChange,
}: {
  tipo: 'video' | 'fotos'
  redId: string
  valor: OpcionesTikTok
  onChange: (valor: OpcionesTikTok) => void
}) {
  const opciones = useOpcionesTiktok(redId, tipo)
  const id = useId()
  const cuenta = opciones.data

  useEffect(() => {
    if (!cuenta) return
    const n = normalizar(valor, tipo, cuenta)
    if (!iguales(valor, n)) onChange(n)
  }, [cuenta, tipo, valor, onChange])

  if (opciones.isPending)
    return (
      <div role="status" aria-label="Cargando opciones de TikTok" className="grid gap-3">
        <Esqueleto className="h-11" />
        <Esqueleto className="h-11" />
        <Esqueleto className="h-11" />
      </div>
    )

  if (opciones.isError)
    return (
      <EstadoError
        mensaje={mensajeDeApi(opciones.error, 'No pudimos cargar las opciones de TikTok.')}
        onReintentar={esErrorDeAcceso(opciones.error) ? undefined : () => void opciones.refetch()}
      />
    )

  if (!cuenta) return null

  const cambiar = (cambios: Partial<OpcionesTikTok>) => onChange({ ...valor, ...cambios })
  const esVideo = tipo === 'video'
  const sinPublico = esVideo && !cuenta.privacidades.includes(PRIVACIDAD_PUBLICA)
  const ayudaVideo = `${id}-ayuda-video`

  return (
    <div className="grid gap-5">
      {cuenta.puedePublicarMas === false && (
        <p
          role="alert"
          className="m-0 flex items-start gap-2 rounded-lg border border-line bg-raised p-3 text-sm"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
          TikTok no deja publicar más contenido con esta cuenta por ahora. Probá de nuevo más tarde.
        </p>
      )}

      <div role="radiogroup" aria-labelledby={`${id}-privacidad`} className="grid gap-2">
        <span id={`${id}-privacidad`} className="text-sm font-bold">
          ¿Quién puede ver la publicación?
        </span>
        {cuenta.privacidades.map((nivel) => {
          const bloqueada = esVideo && nivel !== PRIVACIDAD_PUBLICA
          return (
            <label
              key={nivel}
              className={cn(
                CLASES_TARJETA,
                valor.privacyLevel === nivel
                  ? 'border-accent bg-accent-soft'
                  : 'border-line hover:border-line-strong',
                bloqueada ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
              )}
            >
              <input
                type="radio"
                name={`${id}-privacidad`}
                value={nivel}
                checked={valor.privacyLevel === nivel}
                disabled={bloqueada}
                onChange={() => cambiar({ privacyLevel: nivel })}
                aria-describedby={bloqueada ? ayudaVideo : undefined}
                className="size-5 shrink-0 accent-(--accent)"
              />
              <span className="text-sm font-semibold">{etiquetaPrivacidad(nivel)}</span>
            </label>
          )
        })}
        {esVideo && (
          <p id={ayudaVideo} className="m-0 text-xs text-muted">
            Los videos de TikTok se publican como públicos.
          </p>
        )}
        {sinPublico && (
          <p role="alert" className="m-0 text-xs text-danger">
            Esta cuenta no permite publicar videos públicos, así que ahora no se puede publicar un
            video.
          </p>
        )}
      </div>

      <div role="group" aria-labelledby={`${id}-interacciones`} className="grid gap-2">
        <span id={`${id}-interacciones`} className="text-sm font-bold">
          Interacciones
        </span>
        <Interruptor
          etiqueta="Permitir comentarios"
          ayuda={
            cuenta.comentariosDeshabilitados
              ? 'La cuenta lo tiene desactivado en TikTok.'
              : undefined
          }
          activado={valor.allowComment === true}
          disabled={cuenta.comentariosDeshabilitados === true}
          onChange={(v) => cambiar({ allowComment: v })}
        />
        {esVideo && (
          <>
            <Interruptor
              etiqueta="Permitir dúos"
              ayuda={
                cuenta.duetDeshabilitado ? 'La cuenta lo tiene desactivado en TikTok.' : undefined
              }
              activado={valor.allowDuet === true}
              disabled={cuenta.duetDeshabilitado === true}
              onChange={(v) => cambiar({ allowDuet: v })}
            />
            <Interruptor
              etiqueta="Permitir stitch"
              ayuda={
                cuenta.stitchDeshabilitado ? 'La cuenta lo tiene desactivado en TikTok.' : undefined
              }
              activado={valor.allowStitch === true}
              disabled={cuenta.stitchDeshabilitado === true}
              onChange={(v) => cambiar({ allowStitch: v })}
            />
          </>
        )}
      </div>

      <div role="group" aria-labelledby={`${id}-confirmaciones`} className="grid gap-2">
        <span id={`${id}-confirmaciones`} className="text-sm font-bold">
          Confirmaciones obligatorias
        </span>
        <label
          className={cn(CLASES_TARJETA, 'cursor-pointer border-line hover:border-line-strong')}
        >
          <input
            type="checkbox"
            checked={valor.contentPreviewConfirmed === true}
            onChange={(e) => cambiar({ contentPreviewConfirmed: e.target.checked })}
            className="size-5 shrink-0 accent-(--accent)"
          />
          <span className="text-sm">
            Revisé la vista previa y confirmo que así quiero que se publique en TikTok.
          </span>
        </label>
        <label
          className={cn(CLASES_TARJETA, 'cursor-pointer border-line hover:border-line-strong')}
        >
          <input
            type="checkbox"
            checked={valor.expressConsentGiven === true}
            onChange={(e) => cambiar({ expressConsentGiven: e.target.checked })}
            className="size-5 shrink-0 accent-(--accent)"
          />
          <span className="text-sm">
            Doy mi consentimiento expreso para publicar este contenido en TikTok.
          </span>
        </label>
      </div>

      {esVideo && cuenta.duracionMaximaSegundos != null && (
        <p className="m-0 flex items-center gap-2 text-xs text-muted">
          <Clock className="size-3.5 shrink-0" aria-hidden="true" />
          Duración máxima del video: {formatearDuracion(cuenta.duracionMaximaSegundos)}.
        </p>
      )}
    </div>
  )
}
