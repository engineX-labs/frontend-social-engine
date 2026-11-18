import { getRouteApi } from '@tanstack/react-router'
import { AnimatePresence } from 'motion/react'
import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { usePublicacionDisponible } from '@/api/publicacion'
import { ConfirmarDialogo } from '@/components/ConfirmarDialogo'
import { PanelLateral } from '@/components/PanelLateral'
import type { Programada } from '@/domain/types'
import { claveDia, claveMes, diaLargo, hora } from '@/lib/fecha'
import { Compositor } from './Compositor'
import type { AccionDeEnvio } from './envio'

const ruta = getRouteApi('/')

/** Panel «Nueva publicación»: se abre con `?nueva=true` y solo si publicar y programar está prendido. */
export function PanelPublicar() {
  const { nueva } = ruta.useSearch()
  const { disponible } = usePublicacionDisponible()
  return <AnimatePresence>{nueva && disponible ? <Panel key="publicar" /> : null}</AnimatePresence>
}

function mensajeDeExito(pieza: Programada, accion: AccionDeEnvio): string {
  if (accion === 'publicar_ahora') return 'Se está publicando. Te avisamos cuando termine.'
  if (accion === 'programar' && pieza.fecha)
    return `Programada para el ${diaLargo(pieza.fecha)} a las ${hora(pieza.fecha)}.`
  return pieza.fecha
    ? 'Guardamos el borrador.'
    : 'Guardamos el borrador. Lo ves en «Sin fecha», arriba del calendario.'
}

function Panel() {
  const { dia } = ruta.useSearch()
  const navigate = ruta.useNavigate()
  const sucio = useRef(false)
  const [descartar, setDescartar] = useState(false)
  const alCambiarSucio = useCallback((s: boolean) => {
    sucio.current = s
  }, [])

  const cerrar = () =>
    void navigate({ search: (prev) => ({ ...prev, nueva: undefined }), resetScroll: false })
  // Con cambios sin guardar no se cierra de un golpe: un Escape o un toque afuera no tiran el trabajo.
  const pedirCierre = () => (sucio.current ? setDescartar(true) : cerrar())

  const alGuardar = (pieza: Programada, accion: AccionDeEnvio) => {
    toast(mensajeDeExito(pieza, accion))
    void navigate({
      search: (prev) => ({
        ...prev,
        nueva: undefined,
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
        <Compositor diaInicial={dia} onGuardada={alGuardar} onSucio={alCambiarSucio} />
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
