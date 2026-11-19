import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { useGuardarContexto } from '@/api/contexto'
import { ApiError } from '@/api/http'
import { mensajeDeApi } from '@/api/errores'
import { EstadoError } from '@/components/estados'
import { Boton } from '@/components/ui/Boton'
import {
  esquemaDeRespuestas,
  respuestasParaEnviar,
  valoresIniciales,
  type Contexto,
  type ValoresRespuestas,
} from '@/domain/contexto'
import { CampoPregunta } from './CampoPregunta'

/** Todas las preguntas juntas, para editar las respuestas desde «Perfil del negocio». */
export function FormularioRespuestas({
  contexto,
  onListo,
  onCancelar,
}: {
  contexto: Contexto
  onListo: () => void
  onCancelar: () => void
}) {
  const preguntas = contexto.preguntas
  const guardar = useGuardarContexto()
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const form = useForm<ValoresRespuestas>({
    defaultValues: valoresIniciales(preguntas, contexto.respuestas),
    resolver: useMemo(
      () => zodResolver(esquemaDeRespuestas(preguntas)) as Resolver<ValoresRespuestas>,
      [preguntas],
    ),
  })

  const enviar = form.handleSubmit(async (valores) => {
    setErrorGeneral(null)
    try {
      await guardar.mutateAsync({ respuestas: respuestasParaEnviar(valores) })
      onListo()
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) {
        let alguno = false
        for (const [id, mensaje] of Object.entries(e.problemasPorCampo))
          if (preguntas.some((p) => p.id === id)) {
            form.setError(id, { type: 'server', message: mensaje })
            alguno = true
          }
        if (!alguno) setErrorGeneral(e.message)
      } else setErrorGeneral(mensajeDeApi(e, 'No pudimos guardar tus respuestas. Probá de nuevo.'))
    }
  })

  return (
    <form noValidate onSubmit={(e) => void enviar(e)} className="grid gap-6">
      {preguntas.map((p) => (
        <CampoPregunta key={p.id} pregunta={p} control={form.control} />
      ))}
      {errorGeneral && <EstadoError mensaje={errorGeneral} />}
      <div className="flex flex-wrap justify-end gap-2">
        <Boton variante="fantasma" onClick={onCancelar} disabled={guardar.isPending}>
          Cancelar
        </Boton>
        <Boton type="submit" variante="primario" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar respuestas'}
        </Boton>
      </div>
    </form>
  )
}
