import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
} from '@tanstack/react-router'
import { Layout } from '@/app/Layout'
import { validarCalendarioSearch, validarChatSearch } from '@/app/search'
import { CalendarioView } from '@/features/calendario/CalendarioView'
import { DetallePanel } from '@/features/detalle/DetallePanel'

const rootRoute = createRootRoute({ component: Layout })

/** Los features leen su búsqueda con `getRouteApi('/')`, sin importar este archivo. */
const calendarioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: validarCalendarioSearch,
  component: () => (
    <>
      <CalendarioView />
      <DetallePanel />
    </>
  ),
})

const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/chat',
  validateSearch: validarChatSearch,
  // El chat se descarga al entrar (o al pasar el cursor por el enlace): la primera carga pesa menos.
  component: lazyRouteComponent(() => import('@/features/chat/ChatPage'), 'ChatPage'),
})

const routeTree = rootRoute.addChildren([calendarioRoute, chatRoute])

export function crearRouter(history?: Parameters<typeof createRouter>[0]['history']) {
  return createRouter({ routeTree, history, defaultPreload: 'intent' })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof crearRouter>
  }
}
