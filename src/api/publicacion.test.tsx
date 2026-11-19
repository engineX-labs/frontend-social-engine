import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { PRIVACIDAD_PUBLICA } from '@/domain/publicacion'
import { claveMes } from '@/lib/fecha'
import type { CalendarioMes, Medio } from '@/domain/types'
import {
  avanzarPieza,
  ErrorMock,
  ID_DE_OTRO_COMERCIO,
  mockPublicacion,
  todasLasProgramadas,
} from '@/mocks/programadas'
import { subidaMockUrl } from '@/mocks/handlers/publicacion'
import { tipoDeConflicto } from './errores'
import { ApiError, apiFetch } from './http'
import { useCalendario } from './calendario'
import {
  borrarProgramada,
  crearProgramada,
  editarProgramada,
  nuevoIdDePieza,
  pedirSubida,
  programadasQuery,
  reintentarProgramada,
  useBorradoresSinFecha,
  useOpcionesTiktok,
  useProgramadas,
  usePublicacionDisponible,
  useRedes,
  type NuevaProgramada,
} from './publicacion'

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

const DIA = 24 * 60 * 60 * 1000
const fechaDelMes = (a: number, m: number, d: number) =>
  new Date(Date.UTC(a, m - 1, d, 22)).toISOString()
const enDias = (n: number) => new Date(Date.now() + n * DIA).toISOString()
const foto: Medio = { url: 'https://mock.zernio.test/medios/f.jpg', tipo: 'imagen' }
const video: Medio = { url: 'https://mock.zernio.test/medios/v.mp4', tipo: 'video' }
const opcionesTikTok = {
  privacyLevel: PRIVACIDAD_PUBLICA,
  allowComment: true,
  allowDuet: true,
  allowStitch: true,
  contentPreviewConfirmed: true,
  expressConsentGiven: true,
}
const fotoIG = (extra: Partial<NuevaProgramada> = {}): NuevaProgramada => ({
  redId: 'red-ig',
  accion: 'programar',
  tipo: 'foto',
  texto: 'Hola',
  medios: [foto],
  programadaPara: enDias(2),
  ...extra,
})
const error = async (p: Promise<unknown>) =>
  (await p.then(
    () => null,
    (e: unknown) => e,
  )) as ApiError

describe('redes y opciones de TikTok', () => {
  it('lista las redes conectadas', async () => {
    const { result } = renderHook(() => useRedes(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.map((r) => r.red)).toEqual(['instagram', 'tiktok'])
  })

  it('pide las opciones de TikTok de una red de TikTok', async () => {
    const { result } = renderHook(() => useOpcionesTiktok('red-tt', 'video'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.privacidades).toContain(PRIVACIDAD_PUBLICA)
  })

  it('una red de Instagram no tiene opciones de TikTok (404)', async () => {
    const { result } = renderHook(() => useOpcionesTiktok('red-ig', 'video'), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as ApiError).status).toBe(404)
  })
})

describe('crear', () => {
  it('programa una pieza (201) y queda programada', async () => {
    const pieza = await crearProgramada(fotoIG())
    expect(pieza).toMatchObject({
      estado: 'programada',
      red: 'instagram',
      formato: 'foto',
      error: null,
    })
    expect(pieza.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('guarda un borrador sin fecha ni medios', async () => {
    const pieza = await crearProgramada({
      redId: 'red-ig',
      accion: 'borrador',
      tipo: 'reel',
      medios: [],
    })
    expect(pieza).toMatchObject({ estado: 'borrador', fecha: null })
  })

  it('publicar ahora deja la pieza publicando con la fecha de ahora', async () => {
    const pieza = await crearProgramada(fotoIG({ accion: 'publicar_ahora', programadaPara: null }))
    expect(pieza.estado).toBe('publicando')
    expect(Math.abs(Date.parse(pieza.fecha!) - Date.now())).toBeLessThan(5000)
  })

  it('repetir el pedido con el mismo id no crea otra pieza (un doble clic no publica dos veces)', async () => {
    const id = nuevoIdDePieza()
    const antes = todasLasProgramadas().length
    const primera = await crearProgramada(fotoIG({ id }))
    const segunda = await crearProgramada(fotoIG({ id, texto: 'otro texto, se ignora' }))
    expect(segunda).toEqual(primera)
    expect(todasLasProgramadas()).toHaveLength(antes + 1)
  })

  it('un id de otro comercio da 409 «Id en uso»; uno mal formado, 422', async () => {
    const enUso = await error(crearProgramada(fotoIG({ id: ID_DE_OTRO_COMERCIO })))
    expect(enUso.status).toBe(409)
    expect(tipoDeConflicto(enUso)).toBe('id_en_uso')
    const malo = await error(crearProgramada(fotoIG({ id: 'no-es-uuid' })))
    expect(malo.status).toBe(422)
    expect(malo.problemas).toEqual(['El id tiene que ser un uuid v4'])
  })

  it('una red ajena es 404', async () => {
    expect((await error(crearProgramada(fotoIG({ redId: 'otra' })))).status).toBe(404)
  })

  it('un 422 trae los problemas de las reglas', async () => {
    const e = await error(
      crearProgramada(
        fotoIG({
          tipo: 'historia',
          texto: 'no va',
          medios: [foto, foto],
          programadaPara: enDias(200),
        }),
      ),
    )
    expect(e.status).toBe(422)
    expect(e.message).toBe('Pedido inválido')
    expect(e.problemas).toEqual([
      'La historia lleva exactamente 1 medio',
      'Las historias no llevan texto',
      'La fecha no puede superar los 180 días',
    ])
  })

  it('programar sin fecha o con menos de 5 minutos es 422', async () => {
    expect((await error(crearProgramada(fotoIG({ programadaPara: null })))).problemas).toEqual([
      'Falta la fecha para programar',
    ])
    const e = await error(
      crearProgramada(fotoIG({ programadaPara: new Date(Date.now() + 60_000).toISOString() })),
    )
    expect(e.problemas).toEqual(['La fecha tiene que ser al menos 5 minutos en el futuro'])
  })

  it('un borrador no valida fecha ni medios, pero sí que el tipo exista en la red', async () => {
    const e = await error(
      crearProgramada({ redId: 'red-ig', accion: 'borrador', tipo: 'video', medios: [] }),
    )
    expect(e.problemas).toEqual(['El tipo «video» no existe en instagram'])
  })

  it('TikTok pide privacidad, consentimiento y que los videos sean públicos', async () => {
    const e = await error(
      crearProgramada({
        redId: 'red-tt',
        accion: 'programar',
        tipo: 'video',
        medios: [video],
        programadaPara: enDias(2),
      }),
    )
    expect(e.problemas).toContain('Falta elegir la privacidad en TikTok')
    const privado = await error(
      crearProgramada({
        redId: 'red-tt',
        accion: 'programar',
        tipo: 'video',
        medios: [video],
        programadaPara: enDias(2),
        opciones: { ...opcionesTikTok, privacyLevel: 'SELF_ONLY' },
      }),
    )
    expect(privado.problemas).toEqual(['Los videos de TikTok tienen que ser públicos'])
    const ok = await crearProgramada({
      redId: 'red-tt',
      accion: 'programar',
      tipo: 'video',
      medios: [video],
      programadaPara: enDias(2),
      opciones: opcionesTikTok,
    })
    expect(ok).toMatchObject({ red: 'tiktok', formato: 'video', estado: 'programada' })
  })

  it('un 409 forzado (permiso) se consume y la pieza no se crea; el siguiente pedido funciona', async () => {
    mockPublicacion.forzar = new ErrorMock(
      409,
      'Hay que reconectar la red con permiso para publicar',
    )
    const antes = todasLasProgramadas().length
    const e = await error(crearProgramada(fotoIG()))
    expect(tipoDeConflicto(e)).toBe('reconectar')
    expect(todasLasProgramadas()).toHaveLength(antes)
    await expect(crearProgramada(fotoIG())).resolves.toMatchObject({ estado: 'programada' })
  })
})

describe('editar, reprogramar, cancelar y reintentar', () => {
  it('un borrador pasa a programada y después se reprograma con `guardar`', async () => {
    const borrador = await crearProgramada({
      redId: 'red-ig',
      accion: 'borrador',
      tipo: 'foto',
      medios: [foto],
    })
    const programada = await editarProgramada(borrador.id, {
      accion: 'programar',
      programadaPara: enDias(3),
    })
    expect(programada.estado).toBe('programada')
    const nuevaFecha = enDias(5)
    const reprogramada = await editarProgramada(borrador.id, { programadaPara: nuevaFecha })
    expect(reprogramada).toMatchObject({ estado: 'programada', fecha: nuevaFecha })
  })

  it('programar una programada es 409 (se reprograma con guardar)', async () => {
    const e = await error(
      editarProgramada('prog-2', { accion: 'programar', programadaPara: enDias(3) }),
    )
    expect(e.status).toBe(409)
    expect(e.message).toBe('No se puede programar una pieza en estado programada')
    expect(tipoDeConflicto(e)).toBe('estado')
  })

  it('un borrador pasa a publicar ahora', async () => {
    const p = await editarProgramada('prog-1', { accion: 'publicar_ahora' })
    expect(p.estado).toBe('publicando')
  })

  it('editar una pieza publicada o en «Confirmando…» es 409', async () => {
    expect((await error(editarProgramada('prog-4', { texto: 'x' }))).status).toBe(409)
    expect((await error(editarProgramada('prog-6', { texto: 'x' }))).status).toBe(409)
  })

  it('editar una pieza que no existe es 404 y una programada se valida otra vez', async () => {
    expect((await error(editarProgramada('nada', { texto: 'x' }))).status).toBe(404)
    const e = await error(editarProgramada('prog-2', { programadaPara: enDias(1000) }))
    expect(e.problemas).toEqual(['La fecha no puede superar los 180 días'])
  })

  it('cancelar una programada la saca del calendario; borrar un borrador la elimina', async () => {
    await expect(borrarProgramada('prog-2')).resolves.toBeUndefined()
    expect(todasLasProgramadas().find((p) => p.id === 'prog-2')?.estado).toBe('cancelada')
    await expect(borrarProgramada('prog-1')).resolves.toBeUndefined()
    expect(todasLasProgramadas().find((p) => p.id === 'prog-1')).toBeUndefined()
  })

  it('cancelar una publicada o una fallida es 409', async () => {
    const e = await error(borrarProgramada('prog-4'))
    expect(e.status).toBe(409)
    expect(e.message).toBe('No se puede cancelar una pieza en estado publicada')
    expect((await error(borrarProgramada('prog-5'))).status).toBe(409)
  })

  it('reintenta una fallida con motivo; «Confirmando…» y no fallidas dan 409', async () => {
    await expect(reintentarProgramada('prog-5')).resolves.toMatchObject({
      estado: 'publicando',
      error: null,
    })
    const confirmando = await error(reintentarProgramada('prog-6'))
    expect(confirmando.status).toBe(409)
    expect(confirmando.message).toMatch(/confirmando/i)
    expect((await error(reintentarProgramada('prog-2'))).message).toBe(
      'Solo se puede reintentar una pieza fallida',
    )
  })

  it('una pieza «No se publicó» no se reintenta (es final)', async () => {
    avanzarPieza('prog-5', 'fallida', { error: 'No se publicó' })
    expect((await error(reintentarProgramada('prog-5'))).status).toBe(409)
  })

  it('un webhook pasa una pieza de publicando a publicada con su URL', async () => {
    const p = await crearProgramada(fotoIG({ accion: 'publicar_ahora', programadaPara: null }))
    avanzarPieza(p.id, 'publicada', { urlPublicada: 'https://instagram.com/p/x' })
    const { result } = renderHook(() => useProgramadas(claveMes(new Date())), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.find((x) => x.id === p.id)).toMatchObject({
      estado: 'publicada',
      urlPublicada: 'https://instagram.com/p/x',
    })
  })
})

describe('listas y calendario', () => {
  it('GET /api/programadas?mes= trae todas las del mes menos las canceladas', async () => {
    await borrarProgramada('prog-2')
    const { result } = renderHook(() => useProgramadas('2026-11'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const ids = result.current.data!.map((p) => p.id).sort()
    expect(ids).toEqual(['prog-3', 'prog-4', 'prog-5', 'prog-6'])
  })

  it('sin mes trae los borradores sin fecha, los más nuevos primero', async () => {
    await crearProgramada({ redId: 'red-ig', accion: 'borrador', tipo: 'foto', medios: [] })
    const { result } = renderHook(() => useBorradoresSinFecha(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const lista = result.current.data!
    expect(lista).toHaveLength(2)
    expect(lista[1]?.id).toBe('prog-1')
  })

  it('un mes inválido es 422', async () => {
    const e = await error(programadasQuery('2026-13').queryFn!({} as never) as Promise<unknown>)
    expect(e.status).toBe(422)
  })

  it('el calendario suma `programadas` y el resumen no las cuenta', async () => {
    const { result } = renderHook(() => useCalendario('2026-11'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const d = result.current.data!
    expect(d.programadas?.map((p) => p.id).sort()).toEqual([
      'prog-2',
      'prog-3',
      'prog-4',
      'prog-5',
      'prog-6',
    ])
    expect(d.ideas).toHaveLength(3)
    // Agregar una pieza cambia `programadas` y deja el resumen igual.
    mockPublicacion.ahora = () => Date.UTC(2026, 10, 1, 12) // para no depender de la fecha de hoy
    await crearProgramada(fotoIG({ programadaPara: fechaDelMes(2026, 11, 25) }))
    const otra = await apiFetch<CalendarioMes>('/api/calendario', { params: { mes: '2026-11' } })
    expect(otra.programadas).toHaveLength(6)
    expect(otra.resumen).toEqual(d.resumen)
    expect(otra.publicadas).toEqual(d.publicadas)
  })

  it('un mes sin piezas trae programadas vacío', async () => {
    const { result } = renderHook(() => useCalendario('2027-03'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.programadas).toEqual([])
  })
})

describe('con la publicación apagada en el backend', () => {
  beforeEach(() => {
    mockPublicacion.habilitada = false
  })

  it('todas las rutas dan 404 y el calendario trae programadas vacío', async () => {
    for (const f of [
      () => crearProgramada(fotoIG()),
      () => editarProgramada('prog-2', { texto: 'x' }),
      () => borrarProgramada('prog-2'),
      () => reintentarProgramada('prog-5'),
      () => pedirSubida({ nombre: 'a.jpg', contentType: 'image/jpeg', tamanio: 10 }),
    ])
      expect((await error(f())).status).toBe(404)
    const { result } = renderHook(() => useCalendario('2026-11'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.programadas).toEqual([])
  })
})

describe('usePublicacionDisponible', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('sin la bandera del front no se muestra y no pide nada', async () => {
    vi.stubEnv('VITE_PUBLICACION_HABILITADA', '')
    const { result } = renderHook(() => usePublicacionDisponible(), { wrapper })
    expect(result.current).toEqual({ disponible: false, cargando: false })
  })

  it('con la bandera y el backend prendido se muestra', async () => {
    vi.stubEnv('VITE_PUBLICACION_HABILITADA', 'true')
    const { result } = renderHook(() => usePublicacionDisponible(), { wrapper })
    expect(result.current.disponible).toBe(true)
    await waitFor(() => expect(result.current.cargando).toBe(false))
    expect(result.current.disponible).toBe(true)
  })

  it('con la bandera pero un 404 del backend (apagado) se esconde todo', async () => {
    vi.stubEnv('VITE_PUBLICACION_HABILITADA', 'true')
    mockPublicacion.habilitada = false
    const { result } = renderHook(() => usePublicacionDisponible(), { wrapper })
    await waitFor(() => expect(result.current.disponible).toBe(false))
  })
})

describe('subida de archivos', () => {
  it('pide la URL firmada y el archivo se sube con un PUT sin token', async () => {
    const s = await pedirSubida({ nombre: 'reel.mp4', contentType: 'video/mp4', tamanio: 1024 })
    expect(s.uploadUrl.startsWith(subidaMockUrl)).toBe(true)
    expect(s.publicUrl).toMatch(/^https:\/\/mock\.zernio\.test\/medios\//)
    const res = await fetch(s.uploadUrl, { method: 'PUT', body: new Blob(['x']) })
    expect(res.ok).toBe(true)
  })

  it('rechaza tipos y tamaños no admitidos con 422', async () => {
    expect(
      (await error(pedirSubida({ nombre: 'a.gif', contentType: 'image/gif', tamanio: 10 }))).status,
    ).toBe(422)
    expect(
      (
        await error(
          pedirSubida({ nombre: 'a.mp4', contentType: 'video/mp4', tamanio: 6 * 1024 ** 3 }),
        )
      ).status,
    ).toBe(422)
  })
})
