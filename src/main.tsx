import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { USAR_MOCKS } from '@/api/http'
import { crearRouter } from './router'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})
const router = crearRouter()

async function iniciar() {
  if (USAR_MOCKS) {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledFrame: 'bypass', quiet: true })
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
}

void iniciar()
