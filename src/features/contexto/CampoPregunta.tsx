import { useId, useState, type Ref } from 'react'
import { useController, type Control } from 'react-hook-form'
import { largoMaximo, type Pregunta, type ValoresRespuestas } from '@/domain/contexto'
import { cn } from '@/lib/utils'
import { CAMPO, OPCION } from './estilos'

interface Props {
  pregunta: Pregunta
  control: Control<ValoresRespuestas>
  /** `h2` para una pregunta por pantalla, `h3` dentro de un formulario con todas. */
  nivel?: 'h2' | 'h3'
  tituloRef?: Ref<HTMLHeadingElement>
}

/** Una pregunta del catálogo, dibujada según su tipo. El error (del esquema o del servidor) va debajo. */
export function CampoPregunta({ pregunta, control, nivel = 'h3', tituloRef }: Props) {
  const id = useId()
  const { field, fieldState } = useController({ name: pregunta.id, control })
  const Titulo = nivel
  const error = fieldState.error?.message
  const idTitulo = `${id}-titulo`
  const idError = `${id}-error`
  const idAyuda = `${id}-ayuda`
  const describedBy = [error ? idError : null, idAyuda].filter(Boolean).join(' ')

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Titulo
          id={idTitulo}
          ref={tituloRef}
          tabIndex={-1}
          className="m-0 text-xl leading-snug font-bold outline-none"
        >
          {pregunta.texto}
        </Titulo>
        <span id={idAyuda} className="text-xs font-semibold text-muted">
          {pregunta.obligatoria ? 'Obligatoria' : 'Opcional'}
        </span>
      </div>

      {pregunta.tipo === 'texto' && (
        <TextoLibre
          pregunta={pregunta}
          valor={String(field.value ?? '')}
          onChange={field.onChange}
          onBlur={field.onBlur}
          inputRef={field.ref}
          idTitulo={idTitulo}
          describedBy={describedBy}
          invalido={Boolean(error)}
        />
      )}
      {pregunta.tipo === 'opcion' && (
        <Opciones
          pregunta={pregunta}
          valor={String(field.value ?? '')}
          onChange={field.onChange}
          idTitulo={idTitulo}
          describedBy={describedBy}
          invalido={Boolean(error)}
        />
      )}
      {pregunta.tipo === 'multiple' && (
        <Multiple
          pregunta={pregunta}
          valor={Array.isArray(field.value) ? field.value : []}
          onChange={field.onChange}
          idTitulo={idTitulo}
          describedBy={describedBy}
          invalido={Boolean(error)}
        />
      )}

      {error && (
        <p id={idError} role="alert" className="m-0 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

interface Comun {
  pregunta: Pregunta
  idTitulo: string
  describedBy: string
  invalido: boolean
}

function TextoLibre({
  pregunta,
  valor,
  onChange,
  onBlur,
  inputRef,
  idTitulo,
  describedBy,
  invalido,
}: Comun & {
  valor: string
  onChange: (v: string) => void
  onBlur: () => void
  inputRef: Ref<HTMLTextAreaElement>
}) {
  const max = largoMaximo(pregunta)
  return (
    <div className="grid gap-1">
      <textarea
        ref={inputRef}
        rows={3}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-labelledby={idTitulo}
        aria-describedby={describedBy}
        aria-invalid={invalido}
        className={cn(CAMPO, 'resize-y leading-6')}
      />
      <span
        className={cn(
          'cifra justify-self-end font-mono text-xs',
          valor.length > max ? 'text-danger' : 'text-muted',
        )}
      >
        {valor.length} de {max}
      </span>
    </div>
  )
}

function Opciones({
  pregunta,
  valor,
  onChange,
  idTitulo,
  describedBy,
  invalido,
}: Comun & { valor: string; onChange: (v: string) => void }) {
  const nombre = useId()
  const opciones = pregunta.opciones ?? []
  const esOpcion = opciones.some((o) => o.valor === valor)
  const [otroElegido, setOtroElegido] = useState(valor !== '' && !esOpcion)
  const otroActivo = pregunta.permiteOtro && (otroElegido || (valor !== '' && !esOpcion))

  return (
    <div
      role="radiogroup"
      aria-labelledby={idTitulo}
      aria-describedby={describedBy}
      aria-invalid={invalido}
      className="grid gap-2"
    >
      {opciones.map((o) => (
        <label
          key={o.valor}
          className={cn(
            OPCION,
            valor === o.valor ? 'border-accent bg-accent-soft' : 'border-line bg-raised',
          )}
        >
          <input
            type="radio"
            name={nombre}
            value={o.valor}
            checked={valor === o.valor && !otroActivo}
            onChange={() => {
              setOtroElegido(false)
              onChange(o.valor)
            }}
            className="size-4 accent-(--accent)"
          />
          {o.etiqueta}
        </label>
      ))}
      {pregunta.permiteOtro && (
        <div
          className={cn(
            OPCION,
            'flex-wrap',
            otroActivo ? 'border-accent bg-accent-soft' : 'border-line bg-raised',
          )}
        >
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="radio"
              name={nombre}
              checked={Boolean(otroActivo)}
              onChange={() => {
                setOtroElegido(true)
                if (esOpcion) onChange('')
              }}
              className="size-4 accent-(--accent)"
            />
            Otro
          </label>
          {otroActivo && (
            <input
              type="text"
              value={esOpcion ? '' : valor}
              onChange={(e) => onChange(e.target.value)}
              aria-label={`Otro: ${pregunta.texto}`}
              maxLength={largoMaximo(pregunta) + 20}
              className={cn(CAMPO, 'min-h-9 flex-1 basis-48 py-1')}
            />
          )}
        </div>
      )}
    </div>
  )
}

function Multiple({
  pregunta,
  valor,
  onChange,
  idTitulo,
  describedBy,
  invalido,
}: Comun & { valor: string[]; onChange: (v: string[]) => void }) {
  return (
    <div
      role="group"
      aria-labelledby={idTitulo}
      aria-describedby={describedBy}
      aria-invalid={invalido}
      className="grid gap-2"
    >
      {(pregunta.opciones ?? []).map((o) => {
        const marcada = valor.includes(o.valor)
        return (
          <label
            key={o.valor}
            className={cn(
              OPCION,
              marcada ? 'border-accent bg-accent-soft' : 'border-line bg-raised',
            )}
          >
            <input
              type="checkbox"
              checked={marcada}
              onChange={() =>
                onChange(marcada ? valor.filter((v) => v !== o.valor) : [...valor, o.valor])
              }
              className="size-4 accent-(--accent)"
            />
            {o.etiqueta}
          </label>
        )
      })}
    </div>
  )
}
