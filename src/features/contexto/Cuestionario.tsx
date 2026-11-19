import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { ApiError } from '@/api/http'
import { useContexto, useGuardarContexto } from '@/api/contexto'
import { mensajeDeApi } from '@/api/errores'
import { EstadoError } from '@/components/estados'
import { Boton } from '@/components/ui/Boton'
import { Esqueleto } from '@/components/ui/Esqueleto'
import {
  esquemaDeRespuestas,
  ordenarPreguntas,
  respuestasParaEnviar,
  valoresIniciales,
  type Contexto,
  type ValoresRespuestas,
} from '@/domain/contexto'
import { borrarBorrador, guardarBorrador, leerBorrador } from './borrador'
import { CampoPregunta } from './CampoPregunta'

export type ResultadoCuestionario = 'completo' | 'salteado'

/**
 * El cuestionario por pasos: una pregunta por pantalla, las obligatorias primero y el resto
 * salteable. Se dibuja entero desde el catálogo que manda el backend. `onTerminar` se llama una vez
 * guardado (con el estado que quedó). El borrador sobrevive a una recarga (ver `borrador.ts`).
 */
export function Cuestionario({
  onTerminar,
}: {
  onTerminar: (estado: ResultadoCuestionario) => void
}) {
  const contexto = useContexto()
  if (contexto.isPending)
    return (
      <div role="status" aria-label="Cargando el cuestionario" className="grid gap-3">
        <Esqueleto className="h-6 w-2/3" />
        <Esqueleto className="h-11" />
        <Esqueleto className="h-11" />
        <Esqueleto className="h-11" />
      </div>
    )
  if (contexto.isError)
    return (
      <EstadoError
        mensaje={mensajeDeApi(contexto.error, 'No pudimos cargar las preguntas.')}
        onReintentar={
          contexto.error instanceof ApiError && [401, 403].includes(contexto.error.status)
            ? undefined
            : () => void contexto.refetch()
        }
      />
    )
  return <Pasos contexto={contexto.data} onTerminar={onTerminar} />
}

function Pasos({
  contexto,
  onTerminar,
}: {
  contexto: Contexto
  onTerminar: (estado: ResultadoCuestionario) => void
}) {
  const preguntas = useMemo(() => ordenarPreguntas(contexto.preguntas), [contexto.preguntas])
  const nObligatorias = preguntas.filter((p) => p.obligatoria).length
  const guardar = useGuardarContexto()
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const [inicio] = useState(() => {
    const borrador = leerBorrador(contexto.version)
    return {
      paso: Math.min(Math.max(borrador?.paso ?? 0, 0), Math.max(preguntas.length - 1, 0)),
      valores: { ...valoresIniciales(preguntas, contexto.respuestas), ...borrador?.valores },
    }
  })
  const [paso, setPaso] = useState(inicio.paso)
  const form = useForm<ValoresRespuestas>({
    defaultValues: inicio.valores,
    resolver: zodResolver(esquemaDeRespuestas(preguntas)) as Resolver<ValoresRespuestas>,
  })
  const { control, trigger, getValues, setValue, setError, watch } = form

  useEffect(() => {
    const guardarTodo = () =>
      guardarBorrador({ version: contexto.version, paso, valores: getValues() })
    guardarTodo()
    const suscripcion = watch(guardarTodo)
    return () => suscripcion.unsubscribe()
  }, [contexto.version, paso, getValues, watch])

  // Al cambiar de pregunta el foco va al título (no al montar: no se le roba el foco a la página).
  const tituloRef = useRef<HTMLHeadingElement>(null)
  const primera = useRef(true)
  useEffect(() => {
    if (primera.current) primera.current = false
    else tituloRef.current?.focus()
  }, [paso])

  const actual = preguntas[paso]
  const ultimo = paso === preguntas.length - 1
  if (!actual) return null

  async function enviar(saltear: boolean) {
    setErrorGeneral(null)
    try {
      const guardado = await guardar.mutateAsync({
        respuestas: respuestasParaEnviar(getValues()),
        ...(saltear ? { saltear: true } : {}),
      })
      borrarBorrador()
      onTerminar(guardado.estado === 'salteado' ? 'salteado' : 'completo')
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) {
        const problemas = e.problemasPorCampo
        const conProblema = preguntas.findIndex((p) => problemas[p.id])
        for (const [id, mensaje] of Object.entries(problemas))
          if (preguntas.some((p) => p.id === id)) setError(id, { type: 'server', message: mensaje })
        if (conProblema >= 0) setPaso(conProblema)
        else setErrorGeneral(e.message)
      } else setErrorGeneral(mensajeDeApi(e, 'No pudimos guardar tus respuestas. Probá de nuevo.'))
    }
  }

  async function siguiente() {
    if (!(await trigger(actual!.id))) return
    if (ultimo) await enviar(false)
    else setPaso(paso + 1)
  }

  async function saltearEsta() {
    setValue(actual!.id, actual!.tipo === 'multiple' ? [] : '')
    if (ultimo) await enviar(false)
    else setPaso(paso + 1)
  }

  const guardando = guardar.isPending
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void siguiente()
      }}
      className="grid gap-6"
    >
      <div className="grid gap-2">
        <p aria-live="polite" className="m-0 text-sm font-semibold text-muted">
          Pregunta {paso + 1} de {preguntas.length}
          {paso < nObligatorias && ' · hace falta para empezar'}
        </p>
        <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-(--dur-base) ease-brand"
            style={{ width: `${((paso + 1) / preguntas.length) * 100}%` }}
          />
        </div>
      </div>

      <CampoPregunta
        key={actual.id}
        pregunta={actual}
        control={control}
        nivel="h2"
        tituloRef={tituloRef}
      />

      {errorGeneral && <EstadoError mensaje={errorGeneral} />}

      <div className="flex flex-wrap items-center gap-2">
        <Boton
          variante="fantasma"
          disabled={paso === 0 || guardando}
          onClick={() => setPaso(paso - 1)}
        >
          Atrás
        </Boton>
        <span className="flex-1" />
        {!actual.obligatoria && (
          <Boton variante="fantasma" disabled={guardando} onClick={() => void saltearEsta()}>
            Saltear
          </Boton>
        )}
        {paso >= nObligatorias && !ultimo && (
          <Boton variante="secundario" disabled={guardando} onClick={() => void enviar(true)}>
            Saltear el resto
          </Boton>
        )}
        <Boton type="submit" variante="primario" disabled={guardando}>
          {guardando ? 'Guardando…' : ultimo ? 'Terminar' : 'Siguiente'}
        </Boton>
      </div>
    </form>
  )
}
