import { Check, Loader2, RotateCw } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import {
  useIniciarConexion,
  useRedesDeConexion,
  useSincronizarRedes,
  type RedDeConexion,
} from '@/api/registro'
import { ApiError } from '@/api/http'
import { EstadoError } from '@/components/estados'
import { IconoRed } from '@/components/IconoRed'
import { Boton } from '@/components/ui/Boton'
import { Esqueleto } from '@/components/ui/Esqueleto'
import type { Red } from '@/domain/types'
import { irA } from '@/lib/navegar'
import { NOMBRE_RED } from '@/lib/redes'
import { limpiarRetorno, marcarConexionEnCurso, type Retorno } from './retorno'

const PLATAFORMAS: readonly Red[] = ['instagram', 'tiktok']

function mensajeDeConexion(error: unknown): string {
  // 400 / 404 / 409 traen un `detalle` pensado para mostrarse («Tu cuenta todavía se está preparando»).
  if (error instanceof ApiError && [400, 404, 409].includes(error.status)) return error.message
  return 'No pudimos abrir la conexión. Probá de nuevo.'
}

/**
 * «Conectá tus redes»: conecta Instagram y TikTok y reconecta las que hay que volver a autorizar
 * (el mismo botón). Con `retorno` se está volviendo del OAuth: sincroniza y muestra el resultado,
 * también si el usuario canceló.
 */
export function ConectarRedes({
  retorno = null,
  onContinuar,
}: {
  retorno?: Retorno | null
  /** «Ir al calendario»: solo se ofrece al volver del OAuth con alguna red conectada. */
  onContinuar?: () => void
}) {
  const redes = useRedesDeConexion()
  const iniciar = useIniciarConexion()
  const sincronizar = useSincronizarRedes()
  const { mutate: sincronizarYa } = sincronizar
  const sincronizo = useRef(false)

  useEffect(() => {
    if (!retorno || sincronizo.current) return
    sincronizo.current = true
    limpiarRetorno()
    sincronizarYa()
  }, [retorno, sincronizarYa])

  function conectar(plataforma: Red, red?: RedDeConexion) {
    iniciar.mutate(
      { plataforma, reconectarRedId: red?.id },
      {
        onSuccess: ({ authUrl }) => {
          marcarConexionEnCurso(plataforma, Boolean(red))
          irA(authUrl)
        },
      },
    )
  }

  const lista = redes.data?.redes ?? []
  const hayConectada = lista.some((r) => r.estado === 'conectada')
  const ocupado = iniciar.isPending || iniciar.isSuccess

  return (
    <section aria-labelledby="titulo-redes" className="flex w-full flex-col gap-5">
      <header className="flex flex-col gap-2">
        <h1 id="titulo-redes" className="m-0 text-2xl font-extrabold tracking-tight">
          Conectá tus redes
        </h1>
        <p className="m-0 text-sm text-muted">
          Te llevamos a la página de la red para que des el permiso y volvés acá. Después vas a ver
          tu calendario.
        </p>
      </header>

      {retorno && (
        <ResultadoDeLaVuelta
          retorno={retorno}
          sincronizando={sincronizar.isPending || sincronizar.isIdle}
          error={sincronizar.isError}
          nuevas={sincronizar.data?.nuevas ?? 0}
          todasConectadas={(sincronizar.data?.redes ?? []).every((r) => r.estado === 'conectada')}
          onReintentar={() => sincronizar.mutate()}
        />
      )}

      {redes.isPending ? (
        <div role="status" aria-label="Cargando tus redes" className="flex flex-col gap-3">
          <Esqueleto className="h-16" />
          <Esqueleto className="h-16" />
        </div>
      ) : redes.isError ? (
        <EstadoError
          mensaje="No pudimos cargar tus redes."
          onReintentar={() => void redes.refetch()}
        />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {PLATAFORMAS.map((plataforma) => (
            <li key={plataforma}>
              <FilaDeRed
                plataforma={plataforma}
                red={lista.find((r) => r.plataforma === plataforma)}
                ocupado={ocupado}
                onConectar={(red) => conectar(plataforma, red)}
              />
            </li>
          ))}
        </ul>
      )}

      {iniciar.isError && (
        <p role="alert" className="m-0 text-sm text-danger">
          {mensajeDeConexion(iniciar.error)}
        </p>
      )}

      {retorno && onContinuar && hayConectada && (
        <Boton variante="primario" onClick={onContinuar} className="self-start">
          Ir al calendario
        </Boton>
      )}
    </section>
  )
}

function FilaDeRed({
  plataforma,
  red,
  ocupado,
  onConectar,
}: {
  plataforma: Red
  red: RedDeConexion | undefined
  ocupado: boolean
  onConectar: (red?: RedDeConexion) => void
}) {
  const nombre = NOMBRE_RED[plataforma]
  const reconectar = red?.estado === 'hay_que_reconectar'
  let detalle: ReactNode = 'Sin conectar'
  if (red) detalle = `@${red.username}`

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-raised p-4">
      <IconoRed red={plataforma} className="size-6 shrink-0" />
      <div className="min-w-0 flex-1 basis-40">
        <p className="m-0 font-bold">{nombre}</p>
        <p className="m-0 truncate text-sm text-muted">{detalle}</p>
      </div>
      {red?.estado === 'conectada' && (
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
          <Check className="size-4" aria-hidden="true" />
          Conectada
        </span>
      )}
      {reconectar && (
        <>
          <span className="text-sm font-semibold text-danger">Hay que reconectarla</span>
          <Boton tamano="sm" disabled={ocupado} onClick={() => onConectar(red)}>
            <RotateCw className="size-3.5" aria-hidden="true" />
            Reconectar {nombre}
          </Boton>
        </>
      )}
      {!red && (
        <Boton variante="primario" tamano="sm" disabled={ocupado} onClick={() => onConectar()}>
          Conectar {nombre}
        </Boton>
      )}
    </div>
  )
}

function ResultadoDeLaVuelta({
  retorno,
  sincronizando,
  error,
  nuevas,
  todasConectadas,
  onReintentar,
}: {
  retorno: Retorno
  sincronizando: boolean
  error: boolean
  nuevas: number
  todasConectadas: boolean
  onReintentar: () => void
}) {
  if (error)
    return <EstadoError mensaje="No pudimos verificar tu conexión." onReintentar={onReintentar} />
  if (sincronizando)
    return (
      <p
        role="status"
        className="m-0 flex items-center gap-2 rounded-lg border border-line bg-raised px-4 py-3 text-sm"
      >
        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        Verificando tu conexión…
      </p>
    )
  let texto: string
  if (nuevas > 0)
    texto = nuevas === 1 ? 'Listo: conectamos tu red.' : `Listo: conectamos ${nuevas} redes.`
  else if (retorno.reconectando && !retorno.error && todasConectadas)
    texto = 'Listo: volvimos a conectar tu red.'
  else if (retorno.error)
    texto = 'No se conectó la red: cancelaste o no se dio el permiso. Podés intentarlo de nuevo.'
  else texto = 'No encontramos redes nuevas. Si cancelaste, podés intentarlo de nuevo.'
  const bien = nuevas > 0 || (retorno.reconectando && !retorno.error && todasConectadas)
  return (
    <p
      role="status"
      className={`m-0 rounded-lg border border-line bg-raised px-4 py-3 text-sm ${bien ? 'text-success' : ''}`}
    >
      {texto}
    </p>
  )
}
