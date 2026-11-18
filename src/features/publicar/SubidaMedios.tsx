import {
  ArrowDown,
  ArrowUp,
  Check,
  Film,
  Image as IconoImagen,
  RotateCw,
  Upload,
  X,
} from 'lucide-react'
import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { ApiError } from '@/api/http'
import { mensajeDePublicar } from '@/api/errores'
import { Boton } from '@/components/ui/Boton'
import type { Medio, TipoPieza } from '@/domain/types'
import { cn } from '@/lib/utils'
import {
  aceptarDe,
  ayudaDeMedios,
  ErrorDeSubida,
  limiteDeMedios,
  subirArchivo,
  SubidaCancelada,
  tipoDeMedio,
  validarArchivo,
} from './subida'

interface Props {
  tipo: TipoPieza
  /** Medios ya subidos (por ejemplo, al editar un borrador). */
  valor: Medio[]
  /** Recibe solo los medios ya subidos, en el orden de la lista. */
  onChange: (medios: Medio[]) => void
  /** `true` mientras haya alguna subida en curso: el formulario no debería enviarse. */
  onOcupado?: (ocupado: boolean) => void
  disabled?: boolean
}

interface Item {
  clave: string
  nombre: string
  estado: 'subiendo' | 'listo' | 'error'
  /** De 0 a 1. */
  progreso: number
  tipo: Medio['tipo']
  /** Vista previa: URL local del archivo, o la del medio ya subido. Vacía si el navegador no puede. */
  vista: string
  vistaLocal: boolean
  archivo?: File
  medio?: Medio
  error?: string
}

const nombreDe = (url: string) => {
  try {
    return decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop() ?? url)
  } catch {
    return url
  }
}

const itemDeMedio = (m: Medio): Item => ({
  clave: crypto.randomUUID(),
  nombre: nombreDe(m.url),
  estado: 'listo',
  progreso: 1,
  tipo: m.tipo,
  vista: m.url,
  vistaLocal: false,
  medio: m,
})

const urlsDe = (medios: Medio[]) => medios.map((m) => m.url).join('\n')
const mediosListos = (items: Item[]) =>
  items.flatMap((i) => (i.estado === 'listo' && i.medio ? [i.medio] : []))

function mensajeDeError(e: unknown): string {
  if (e instanceof ApiError)
    return mensajeDePublicar(e, 'No se pudo preparar la subida. Probá de nuevo.')
  if (e instanceof ErrorDeSubida) return e.message
  return 'No se pudo subir el archivo. Probá de nuevo.'
}

function crearVista(archivo: File): string {
  return typeof URL.createObjectURL === 'function' ? URL.createObjectURL(archivo) : ''
}
function liberarVista(item: Item) {
  if (item.vistaLocal && item.vista && typeof URL.revokeObjectURL === 'function')
    URL.revokeObjectURL(item.vista)
}

/**
 * Elegir, subir y ordenar los archivos de una pieza. Cada archivo se sube apenas se elige: el backend
 * firma una URL y el navegador lo manda directo a Zernio (ver `subida.ts`). El formulario recibe solo
 * los medios que ya están subidos, y `onOcupado` avisa mientras queda alguno en curso.
 */
export function SubidaMedios({ tipo, valor, onChange, onOcupado, disabled = false }: Props) {
  const idInput = useId()
  const idAyuda = useId()
  const limite = limiteDeMedios(tipo)
  const [items, setItems] = useState<Item[]>(() => valor.map(itemDeMedio))
  const [avisos, setAvisos] = useState<string[]>([])
  const [arrastrando, setArrastrando] = useState(false)
  const itemsRef = useRef(items)
  const controles = useRef(new Map<string, AbortController>())
  const ultimoEmitido = useRef(urlsDe(valor))
  /** Lo que se le avisó al formulario y todavía no volvió como `valor` (ver el efecto de abajo). */
  const ecos = useRef<string[]>([])
  const ultimoOcupado = useRef(false)
  const alCambiar = useRef(onChange)
  const alOcupar = useRef(onOcupado)
  useEffect(() => {
    alCambiar.current = onChange
    alOcupar.current = onOcupado
  })

  /** Cambia la lista y avisa al formulario solo si cambió lo que le importa. */
  function aplicar(cambio: (xs: Item[]) => Item[]) {
    const nuevos = cambio(itemsRef.current)
    itemsRef.current = nuevos
    setItems(nuevos)
    const medios = mediosListos(nuevos)
    const claves = urlsDe(medios)
    if (claves !== ultimoEmitido.current) {
      ultimoEmitido.current = claves
      ecos.current = [...ecos.current, claves].slice(-20)
      alCambiar.current(medios)
    }
    const ocupado = nuevos.some((i) => i.estado === 'subiendo')
    if (ocupado !== ultimoOcupado.current) {
      ultimoOcupado.current = ocupado
      alOcupar.current?.(ocupado)
    }
  }

  // Si el formulario cambia los medios por su cuenta (p. ej. al abrir otro borrador o al limpiarse), la
  // lista lo sigue. Se compara por las URLs y no por la identidad del arreglo: un `valor={[]}` nuevo en
  // cada render no debe borrar lo que se está subiendo. Y lo que el formulario devuelve de lo que acabamos
  // de avisarle (el «eco») no se toma como un cambio ajeno: con dos subidas que terminan casi juntas
  // puede llegar un eco viejo después de que la lista ya avanzó, y reconstruirla perdería las vistas previas.
  const clavesValor = urlsDe(valor)
  useEffect(() => {
    const eco = ecos.current.indexOf(clavesValor)
    if (eco >= 0) {
      ecos.current = ecos.current.slice(eco + 1)
      return
    }
    if (clavesValor === ultimoEmitido.current) return
    ecos.current = []
    ultimoEmitido.current = clavesValor
    const actuales = itemsRef.current
    actuales.filter((i) => i.estado === 'listo').forEach(liberarVista)
    const nuevos = [
      ...(clavesValor ? clavesValor.split('\n') : []).map((url) =>
        itemDeMedio({ url, tipo: tipoDeUrl(url, valor) }),
      ),
      ...actuales.filter((i) => i.estado !== 'listo'),
    ]
    itemsRef.current = nuevos
    setItems(nuevos)
  }, [clavesValor, valor])

  // Al desmontar: se cancela lo que sigue subiendo y se liberan las vistas previas.
  useEffect(() => {
    const cancelables = controles.current
    return () => {
      cancelables.forEach((c) => c.abort())
      cancelables.clear()
      itemsRef.current.forEach(liberarVista)
    }
  }, [])

  function iniciar(clave: string) {
    const item = itemsRef.current.find((i) => i.clave === clave)
    if (!item?.archivo) return
    const control = new AbortController()
    controles.current.set(clave, control)
    aplicar((xs) =>
      xs.map((i) =>
        i.clave === clave ? { ...i, estado: 'subiendo', progreso: 0, error: undefined } : i,
      ),
    )
    subirArchivo(item.archivo, {
      senal: control.signal,
      alProgreso: (f) =>
        aplicar((xs) => xs.map((i) => (i.clave === clave ? { ...i, progreso: f } : i))),
    })
      .then((medio) => {
        if (control.signal.aborted) return
        aplicar((xs) =>
          xs.map((i) => (i.clave === clave ? { ...i, estado: 'listo', progreso: 1, medio } : i)),
        )
      })
      .catch((e: unknown) => {
        if (control.signal.aborted || e instanceof SubidaCancelada) return
        aplicar((xs) =>
          xs.map((i) =>
            i.clave === clave ? { ...i, estado: 'error', error: mensajeDeError(e) } : i,
          ),
        )
      })
      .finally(() => {
        if (controles.current.get(clave) === control) controles.current.delete(clave)
      })
  }

  function agregar(archivos: File[]) {
    if (!archivos.length) return
    const problemas: string[] = []
    const nuevos: Item[] = []
    let lugar = limite - itemsRef.current.length
    let sobran = 0
    for (const archivo of archivos) {
      const problema = validarArchivo(archivo, tipo)
      if (problema) {
        problemas.push(problema)
        continue
      }
      if (lugar <= 0) {
        sobran++
        continue
      }
      lugar--
      nuevos.push({
        clave: crypto.randomUUID(),
        nombre: archivo.name,
        estado: 'subiendo',
        progreso: 0,
        tipo: tipoDeMedio(archivo.type),
        vista: crearVista(archivo),
        vistaLocal: true,
        archivo,
      })
    }
    if (sobran)
      problemas.push(
        limite === 1
          ? 'Esta pieza lleva un solo archivo. Quitá el actual para subir otro.'
          : `Podés subir hasta ${limite} archivos. ${sobran === 1 ? 'Sobró 1 y no se subió.' : `Sobraron ${sobran} y no se subieron.`}`,
      )
    setAvisos(problemas)
    if (!nuevos.length) return
    aplicar((xs) => [...xs, ...nuevos])
    nuevos.forEach((n) => iniciar(n.clave))
  }

  function quitar(clave: string) {
    controles.current.get(clave)?.abort()
    controles.current.delete(clave)
    const item = itemsRef.current.find((i) => i.clave === clave)
    if (item) liberarVista(item)
    setAvisos([])
    aplicar((xs) => xs.filter((i) => i.clave !== clave))
  }

  function mover(clave: string, delta: -1 | 1) {
    aplicar((xs) => {
      const i = xs.findIndex((x) => x.clave === clave)
      const j = i + delta
      if (i < 0 || j < 0 || j >= xs.length) return xs
      const copia = [...xs]
      ;[copia[i], copia[j]] = [copia[j]!, copia[i]!]
      return copia
    })
  }

  function alElegir(e: ChangeEvent<HTMLInputElement>) {
    agregar(Array.from(e.target.files ?? []))
    e.target.value = '' // permite volver a elegir el mismo archivo después de quitarlo
  }
  function alSoltar(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    setArrastrando(false)
    if (!bloqueado) agregar(Array.from(e.dataTransfer.files))
  }

  const lleno = items.length >= limite
  const bloqueado = disabled || lleno
  const puedeOrdenar = limite > 1 && items.length > 1

  return (
    <div className="space-y-3">
      <label
        htmlFor={idInput}
        onDragOver={(e) => {
          e.preventDefault()
          if (!bloqueado) setArrastrando(true)
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={alSoltar}
        className={cn(
          'flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line-strong bg-raised p-4 text-center text-sm',
          'transition-[background-color,border-color] duration-(--dur-fast) ease-brand hover:border-accent-ink',
          'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--focus-ring)',
          arrastrando && 'border-accent-ink bg-accent-soft',
          bloqueado && 'pointer-events-none opacity-45',
        )}
      >
        <Upload className="size-5 text-muted" aria-hidden="true" />
        <span className="font-semibold">
          {lleno
            ? 'Ya está completo'
            : limite === 1
              ? 'Elegí un archivo'
              : 'Elegí archivos o arrastralos acá'}
        </span>
        <input
          id={idInput}
          type="file"
          className="sr-only"
          accept={aceptarDe(tipo)}
          multiple={limite > 1}
          disabled={bloqueado}
          aria-label={limite === 1 ? 'Elegir archivo' : 'Elegir archivos'}
          aria-describedby={idAyuda}
          onChange={alElegir}
        />
      </label>
      <p id={idAyuda} className="m-0 text-[13px] text-muted">
        {ayudaDeMedios(tipo)}
      </p>

      {avisos.length > 0 && (
        <div role="alert" className="space-y-1 text-sm text-danger">
          {avisos.map((a) => (
            <p key={a} className="m-0">
              {a}
            </p>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <ul className="m-0 space-y-2 p-0" aria-label="Archivos de la pieza">
          {items.map((item, i) => (
            <li
              key={item.clave}
              className="flex list-none items-center gap-3 rounded-lg border border-line bg-raised p-2"
            >
              <Vista item={item} />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="m-0 truncate text-sm font-semibold">{item.nombre}</p>
                <Estado item={item} />
              </div>
              <div className="flex shrink-0 items-center">
                {puedeOrdenar && (
                  <>
                    <Boton
                      variante="fantasma"
                      tamano="icono"
                      aria-label={`Subir «${item.nombre}»`}
                      disabled={disabled || i === 0}
                      onClick={() => mover(item.clave, -1)}
                    >
                      <ArrowUp className="size-4" aria-hidden="true" />
                    </Boton>
                    <Boton
                      variante="fantasma"
                      tamano="icono"
                      aria-label={`Bajar «${item.nombre}»`}
                      disabled={disabled || i === items.length - 1}
                      onClick={() => mover(item.clave, 1)}
                    >
                      <ArrowDown className="size-4" aria-hidden="true" />
                    </Boton>
                  </>
                )}
                {item.estado === 'error' && item.archivo && (
                  <Boton
                    variante="fantasma"
                    tamano="icono"
                    aria-label={`Reintentar «${item.nombre}»`}
                    disabled={disabled}
                    onClick={() => iniciar(item.clave)}
                  >
                    <RotateCw className="size-4" aria-hidden="true" />
                  </Boton>
                )}
                <Boton
                  variante="fantasma"
                  tamano="icono"
                  aria-label={
                    item.estado === 'subiendo'
                      ? `Cancelar la subida de «${item.nombre}»`
                      : `Quitar «${item.nombre}»`
                  }
                  disabled={disabled}
                  onClick={() => quitar(item.clave)}
                >
                  <X className="size-4" aria-hidden="true" />
                </Boton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** El tipo de un medio ya subido, tomado del formulario (la URL no dice si es imagen o video). */
function tipoDeUrl(url: string, valor: Medio[]): Medio['tipo'] {
  return valor.find((m) => m.url === url)?.tipo ?? 'imagen'
}

function Vista({ item }: { item: Item }) {
  const caja =
    'grid size-14 shrink-0 place-items-center overflow-hidden rounded-md bg-inset text-muted'
  if (!item.vista)
    return (
      <div className={caja} aria-hidden="true">
        {item.tipo === 'video' ? <Film className="size-5" /> : <IconoImagen className="size-5" />}
      </div>
    )
  return (
    <div className={caja} aria-hidden="true">
      {item.tipo === 'video' ? (
        <video
          src={item.vista}
          muted
          playsInline
          preload="metadata"
          className="size-full object-cover"
        />
      ) : (
        <img src={item.vista} alt="" className="size-full object-cover" />
      )}
    </div>
  )
}

function Estado({ item }: { item: Item }) {
  if (item.estado === 'subiendo') {
    const pct = Math.round(item.progreso * 100)
    return (
      <div className="flex items-center gap-2">
        <div
          role="progressbar"
          aria-label={`Subiendo ${item.nombre}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-inset"
        >
          <div
            className="h-full bg-accent transition-[width] duration-(--dur-fast) ease-brand"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="w-9 shrink-0 text-right text-xs text-muted tabular-nums">{pct}%</span>
      </div>
    )
  }
  if (item.estado === 'error')
    return (
      <p role="alert" className="m-0 text-[13px] text-danger">
        {item.error}
      </p>
    )
  return (
    <p className="m-0 flex items-center gap-1 text-[13px] text-success">
      <Check className="size-3.5" aria-hidden="true" />
      Subido
    </p>
  )
}
