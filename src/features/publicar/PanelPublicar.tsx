import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { AnimatePresence } from 'motion/react'
import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { esErrorDeAcceso, mensajeDeApi } from '@/api/errores'
import { programadaQuery, usePublicacionDisponible } from '@/api/publicacion'
import { EstadoError } from '@/components/estados'
import { ConfirmarDialogo } from '@/components/ConfirmarDialogo'
import { PanelLateral } from '@/components/PanelLateral'
import { Esqueleto } from '@/components/ui/Esqueleto'
import type { Programada } from '@/domain/types'
import { claveDia, claveMes, diaLargo, hora } from '@/lib/fecha'
import { Compositor } from './Compositor'
import type { AccionGuardada } from './envio'

const ruta = getRouteApi('/')

/** Panel «Nueva publicación»: se abre con `?nueva=true` y solo si publicar y programar está prendido. */
export function PanelPublicar() {
  const { nueva } = ruta.useSearch()
  const { disponible } = usePublicacionDisponible()
  return <AnimatePresence>{nueva && disponible ? <Panel key="publicar" /> : null}</AnimatePresence>
}

function mensajeDeExito(pieza: Programada, accion: AccionGuardada): string {
  if (accion === 'publicar_ahora') return 'Se está publicando. Te avisamos cuando termine.'
  if (accion === 'programar' && pieza.fecha)
    return `Programada para el ${diaLargo(pieza.fecha)} a las ${hora(pieza.fecha)}.`
  return pieza.fecha
    ? 'Guardamos el borrador.'
    : 'Guardamos el borrador. Lo ves en «Sin fecha», arriba del calendario.'
}

function Panel() {
  const { dia, copiar } = ruta.useSearch()
  const navigate = ruta.useNavigate()
  // «Crear de nuevo»: se parte de otra pieza, que hay que leer antes de armar el formulario.
  const origen = useQuery({ ...programadaQuery(copiar ?? ''), enabled: Boolean(copiar) })
  const sucio = useRef(false)
  const [descartar, setDescartar] = useState(false)
  const alCambiarSucio = useCallback((s: boolean) => {
    sucio.current = s
  }, [])

  const cerrar = () =>
    void navigate({
      search: (prev) => ({ ...prev, nueva: undefined, copiar: undefined }),
      resetScroll: false,
    })
  // Con cambios sin guardar no se cierra de un golpe: un Escape o un toque afuera no tiran el trabajo.
  const pedirCierre = () => (sucio.current ? setDescartar(true) : cerrar())

  const alGuardar = (pieza: Programada, accion: AccionGuardada) => {
    toast(mensajeDeExito(pieza, accion))
    void navigate({
      search: (prev) => ({
        ...prev,
        nueva: undefined,
        copiar: undefined,
        item: undefined,
        // Se lleva el calendario al día de la pieza para que se vea dónde quedó.
        ...(pieza.fecha ? { mes: claveMes(pieza.fecha), dia: claveDia(pieza.fecha) } : {}),
      }),
      resetScroll: false,
    })
  }

  return (
    <>
      <PanelLateral
        idTitulo="publicar-titulo"
        titulo="Nueva publicación"
        etiquetaCerrar="Cerrar nueva publicación"
        onCerrar={pedirCierre}
      >
        {copiar && origen.isPending ? (
          <div role="status" aria-label="Cargando la publicación" className="grid gap-3">
            <Esqueleto className="h-11" />
            <Esqueleto className="h-24" />
            <Esqueleto className="h-11" />
          </div>
        ) : copiar && origen.isError ? (
          <EstadoError
            mensaje={mensajeDeApi(origen.error, 'No pudimos leer la publicación de la que partir.')}
            onReintentar={esErrorDeAcceso(origen.error) ? undefined : () => void origen.refetch()}
          />
        ) : (
          <Compositor
            diaInicial={dia}
            copiaDe={copiar ? origen.data : undefined}
            onGuardada={alGuardar}
            onSucio={alCambiarSucio}
          />
        )}
      </PanelLateral>
      {descartar && (
        <ConfirmarDialogo
          titulo="¿Descartar los cambios?"
          confirmar="Descartar"
          cancelar="Seguir editando"
          onCancelar={() => setDescartar(false)}
          onConfirmar={cerrar}
        >
          Lo que escribiste y los archivos que subiste se pierden. Si querés conservarlo, guardalo
          como borrador.
        </ConfirmarDialogo>
      )}
    </>
  )
}
