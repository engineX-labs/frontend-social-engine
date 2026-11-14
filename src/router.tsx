import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { Layout } from '@/app/Layout'
import { validarCalendarioSearch, validarChatSearch } from '@/app/search'
import { CalendarioView } from '@/features/calendario/CalendarioView'
import { ChatPage } from '@/features/chat/ChatPage'
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
  component: ChatPage,
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
