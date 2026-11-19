import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import { avisarNoAutorizado, obtenerToken } from '@/api/auth'
import { clerkPrueba } from '@/test/clerk'
import userEvent from '@testing-library/user-event'
import { Acceso } from './Acceso'
import type { ModoDeRegistro } from './modoDeRegistro'

function montar(clave = 'pk_test_de_prueba', registro?: ModoDeRegistro) {
  const consultas = new QueryClient()
  render(
    <QueryClientProvider client={consultas}>
      <Acceso clave={clave} registro={registro}>
        <p>contenido de la app</p>
      </Acceso>
    </QueryClientProvider>,
  )
  return consultas
}

describe('Acceso', () => {
  it('sin clave de Clerk avisa qué falta y no muestra la app', () => {
    montar('')
    expect(screen.getByRole('alert')).toHaveTextContent('Falta configurar el ingreso')
    expect(screen.getByRole('alert')).toHaveTextContent('VITE_CLERK_PUBLISHABLE_KEY')
    expect(screen.queryByText('contenido de la app')).toBeNull()
  })

  it('mientras Clerk carga muestra un estado de carga y no la app', () => {
    clerkPrueba.fijar({ isLoaded: false })
    montar()
    expect(screen.getByRole('status', { name: 'Cargando' })).toBeInTheDocument()
    expect(screen.queryByText('contenido de la app')).toBeNull()
  })

  it('sin sesión muestra solo la pantalla de ingreso', () => {
    clerkPrueba.fijar({ isSignedIn: false })
    montar()
    expect(screen.getByTestId('clerk-sign-in')).toBeInTheDocument()
    expect(screen.queryByText('contenido de la app')).toBeNull()
    expect(screen.queryByText(/sesión venció/)).toBeNull()
  })

  it('con sesión muestra la app y deja pedir el token', async () => {
    montar()
    expect(screen.getByText('contenido de la app')).toBeInTheDocument()
    expect(screen.queryByTestId('clerk-sign-in')).toBeNull()
    await expect(obtenerToken()).resolves.toBe('token-de-prueba')
  })

  it('sin sesión no hay token', async () => {
    clerkPrueba.fijar({ isSignedIn: false })
    montar()
    await expect(obtenerToken()).resolves.toBeNull()
  })

  it('al cerrar sesión vacía la caché: el próximo usuario no ve datos del anterior', () => {
    const consultas = montar()
    consultas.setQueryData(['calendario', '2026-11'], { publicadas: ['de otro usuario'] })
    act(() => clerkPrueba.fijar({ isSignedIn: false }))
    expect(consultas.getQueryData(['calendario', '2026-11'])).toBeUndefined()
    expect(screen.getByTestId('clerk-sign-in')).toBeInTheDocument()
  })

  it('un 401 de la API cierra la sesión una sola vez y avisa que venció', () => {
    montar()
    act(() => {
      avisarNoAutorizado()
      avisarNoAutorizado()
    })
    expect(clerkPrueba.signOut).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('clerk-sign-in')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Tu sesión venció')
  })

  it('al volver a entrar se quita el aviso de sesión vencida', () => {
    montar()
    act(() => avisarNoAutorizado())
    act(() => clerkPrueba.fijar({ isSignedIn: true }))
    expect(screen.getByText('contenido de la app')).toBeInTheDocument()
    act(() => clerkPrueba.fijar({ isSignedIn: false }))
    expect(screen.queryByText(/sesión venció/)).toBeNull()
  })

  describe('registro', () => {
    beforeEach(() => clerkPrueba.fijar({ isSignedIn: false }))

    it('por invitación (el modo de hoy) no ofrece registrarse', () => {
      montar('pk_test_de_prueba', 'invitacion')
      expect(screen.getByTestId('clerk-sign-in')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Anotate|Creá tu cuenta/ })).toBeNull()
    })

    it('sin indicar modo se comporta como por invitación', () => {
      montar()
      expect(screen.queryByRole('button', { name: /Anotate|Creá tu cuenta/ })).toBeNull()
    })

    it('con lista de espera ofrece anotarse y volver a ingresar', async () => {
      montar('pk_test_de_prueba', 'lista_de_espera')
      expect(screen.getByTestId('clerk-sign-in')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Anotate en la lista de espera' }))
      expect(screen.getByTestId('clerk-waitlist')).toBeInTheDocument()
      expect(screen.queryByTestId('clerk-sign-in')).toBeNull()
      await userEvent.click(screen.getByRole('button', { name: 'Ingresá' }))
      expect(screen.getByTestId('clerk-sign-in')).toBeInTheDocument()
    })

    it('con registro abierto ofrece crear la cuenta', async () => {
      montar('pk_test_de_prueba', 'abierto')
      await userEvent.click(screen.getByRole('button', { name: 'Creá tu cuenta' }))
      expect(screen.getByTestId('clerk-sign-up')).toBeInTheDocument()
      expect(screen.queryByTestId('clerk-waitlist')).toBeNull()
    })

    it('con sesión no se ve nada de esto: entra a la app', () => {
      clerkPrueba.fijar({ isSignedIn: true })
      montar('pk_test_de_prueba', 'lista_de_espera')
      expect(screen.getByText('contenido de la app')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Anotate/ })).toBeNull()
    })
  })
})
