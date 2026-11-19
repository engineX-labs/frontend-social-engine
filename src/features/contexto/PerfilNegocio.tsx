import { useId, useState } from 'react'
import { useContexto } from '@/api/contexto'
import { mensajeDeApi } from '@/api/errores'
import { ApiError } from '@/api/http'
import { EstadoError } from '@/components/estados'
import { Boton } from '@/components/ui/Boton'
import { Esqueleto } from '@/components/ui/Esqueleto'
import { textoDeRespuesta, type Contexto } from '@/domain/contexto'
import { FormularioRespuestas } from './FormularioRespuestas'
import { PerfilMarca } from './PerfilMarca'

/** «Perfil del negocio»: las respuestas del cuestionario y el perfil de marca, los dos editables. */
export function PerfilNegocio({ intervaloMs }: { intervaloMs?: number }) {
  return (
    <div className="mx-auto grid max-w-3xl gap-10 pb-8">
      <h1 className="m-0 text-2xl font-extrabold">Perfil del negocio</h1>
      <Respuestas />
      <PerfilMarca intervaloMs={intervaloMs} />
    </div>
  )
}

function Respuestas() {
  const contexto = useContexto()
  const idTitulo = useId()
  const [editando, setEditando] = useState(false)
  const [guardado, setGuardado] = useState(false)

  return (
    <section aria-labelledby={idTitulo} className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={idTitulo} className="m-0 text-xl font-bold">
          Lo que nos contaste
        </h2>
        {contexto.data && !editando && (
          <Boton
            tamano="sm"
            onClick={() => {
              setGuardado(false)
              setEditando(true)
            }}
          >
            {contexto.data.estado === 'completo' ? 'Editar respuestas' : 'Completar respuestas'}
          </Boton>
        )}
      </div>

      {contexto.isPending && (
        <div role="status" aria-label="Cargando tus respuestas" className="grid gap-3">
          <Esqueleto className="h-6" />
          <Esqueleto className="h-6" />
          <Esqueleto className="h-6" />
        </div>
      )}
      {contexto.isError && (
        <EstadoError
          mensaje={mensajeDeApi(contexto.error, 'No pudimos cargar tus respuestas.')}
          onReintentar={
            contexto.error instanceof ApiError && [401, 403].includes(contexto.error.status)
              ? undefined
              : () => void contexto.refetch()
          }
        />
      )}
      {contexto.data &&
        (editando ? (
          <div className="rounded-lg border border-line bg-raised p-4 sm:p-5">
            <FormularioRespuestas
              contexto={contexto.data}
              onCancelar={() => setEditando(false)}
              onListo={() => {
                setEditando(false)
                setGuardado(true)
              }}
            />
          </div>
        ) : (
          <>
            <p role="status" className="m-0 min-h-5 text-sm font-semibold text-success">
              {guardado ? 'Guardamos tus respuestas.' : ''}
            </p>
            <ListaDeRespuestas contexto={contexto.data} />
          </>
        ))}
    </section>
  )
}

function ListaDeRespuestas({ contexto }: { contexto: Contexto }) {
  return (
    <dl className="m-0 grid gap-3 rounded-lg border border-line bg-raised p-4 text-sm sm:p-5">
      {contexto.preguntas.map((p) => {
        const texto = textoDeRespuesta(p, contexto.respuestas[p.id])
        return (
          <div key={p.id} className="grid gap-0.5">
            <dt className="text-xs font-semibold text-muted">{p.texto}</dt>
            <dd className={texto ? 'm-0' : 'm-0 text-muted'}>{texto ?? 'Sin responder'}</dd>
          </div>
        )
      })}
    </dl>
  )
}
