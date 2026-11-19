import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { MotionConfig } from 'motion/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MODO_MOCKS, reintentarConsulta } from '@/api/http'
import { Acceso } from '@/app/Acceso'
import { Entrada } from '@/app/Entrada'
import { crearRouter } from './router'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: reintentarConsulta, refetchOnWindowFocus: false } },
})
const router = crearRouter()

async function iniciar() {
  if (MODO_MOCKS !== 'ninguno') {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledFrame: 'bypass', quiet: true })
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <Acceso>
          {/* reducedMotion="user": con "reducir movimiento" quedan solo los fundidos. */}
          <MotionConfig reducedMotion="user">
            {/* Entrada decide qué ve quien recién entra; el calendario solo con la cuenta activa. */}
            <Entrada>
              <RouterProvider router={router} />
            </Entrada>
          </MotionConfig>
        </Acceso>
      </QueryClientProvider>
    </StrictMode>,
  )
}

void iniciar()
