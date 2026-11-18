import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { useEffect, useState } from 'react'
import { PRIVACIDAD_PUBLICA, validarPieza } from '@/domain/publicacion'
import type { OpcionesTikTok, OpcionesTikTokRed } from '@/domain/types'
import { OPCIONES_TIKTOK_MOCK } from '@/mocks/programadas'
import { server } from '@/mocks/server'
import { OpcionesTikTokForm } from './OpcionesTikTokForm'
import { etiquetaPrivacidad, formatearDuracion, opcionesTikTokIniciales } from './opcionesTiktok'

let ultimo: OpcionesTikTok = {}

function Controlado({ tipo, inicial }: { tipo: 'video' | 'fotos'; inicial?: OpcionesTikTok }) {
  const [valor, setValor] = useState<OpcionesTikTok>(inicial ?? opcionesTikTokIniciales(tipo))
  useEffect(() => {
    ultimo = valor
  })
  return <OpcionesTikTokForm tipo={tipo} redId="red-tt" valor={valor} onChange={setValor} />
}

function montar(ui: React.ReactElement) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {ui}
    </QueryClientProvider>,
  )
}

const cuenta = (cambios: Partial<OpcionesTikTokRed> = {}) =>
  server.use(
    http.get('*/api/redes/:id/opciones-tiktok', () =>
      HttpResponse.json({ ...OPCIONES_TIKTOK_MOCK, ...cambios }),
    ),
  )

const problemasDe = (tipo: 'video' | 'fotos', opciones: OpcionesTikTok) =>
  validarPieza({
    red: 'tiktok',
    tipo,
    texto: null,
    medios: tipo === 'video' ? [{ tipo: 'video' }] : [{ tipo: 'imagen' }],
    opciones,
  })

describe('opcionesTiktok (auxiliares)', () => {
  it('el valor inicial no trae privacidad ni consentimientos', () => {
    expect(opcionesTikTokIniciales('video')).toEqual({
      allowComment: false,
      allowDuet: false,
      allowStitch: false,
      contentPreviewConfirmed: false,
      expressConsentGiven: false,
    })
    expect(opcionesTikTokIniciales('fotos')).toEqual({
      allowComment: false,
      contentPreviewConfirmed: false,
      expressConsentGiven: false,
    })
  })
  it('traduce los niveles de privacidad y deja pasar los desconocidos', () => {
    expect(etiquetaPrivacidad('PUBLIC_TO_EVERYONE')).toBe('Público')
    expect(etiquetaPrivacidad('MUTUAL_FOLLOW_FRIENDS')).toBe('Amigos (se siguen mutuamente)')
    expect(etiquetaPrivacidad('FOLLOWER_OF_CREATOR')).toBe('Solo seguidores')
    expect(etiquetaPrivacidad('SELF_ONLY')).toBe('Solo yo')
    expect(etiquetaPrivacidad('OTRO_NUEVO')).toBe('OTRO_NUEVO')
  })
  it('formatea la duración', () => {
    expect(formatearDuracion(600)).toBe('10 min')
    expect(formatearDuracion(90)).toBe('1 min 30 s')
    expect(formatearDuracion(45)).toBe('45 s')
  })
})

describe('OpcionesTikTokForm · video', () => {
  it('solo la privacidad pública está habilitada y ninguna viene elegida', async () => {
    montar(<Controlado tipo="video" />)
    const publico = await screen.findByRole('radio', { name: 'Público' })
    expect(publico).toBeEnabled()
    expect(publico).not.toBeChecked()
    for (const nombre of [/Amigos/, /Solo yo/]) {
      const r = screen.getByRole('radio', { name: nombre })
      expect(r).toBeDisabled()
      expect(r).toHaveAccessibleDescription('Los videos de TikTok se publican como públicos.')
    }
  })

  it('muestra comentarios, dúos y stitch, y la duración máxima', async () => {
    montar(<Controlado tipo="video" />)
    expect(await screen.findByRole('switch', { name: 'Permitir comentarios' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Permitir dúos' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Permitir stitch' })).toBeInTheDocument()
    expect(screen.getByText(/Duración máxima del video: 10 min/)).toBeInTheDocument()
  })

  it('falta todo hasta que se completa y entonces el valor pasa validarPieza', async () => {
    montar(<Controlado tipo="video" />)
    await screen.findByRole('radio', { name: 'Público' })
    expect(problemasDe('video', ultimo)).toEqual([
      'Falta elegir la privacidad en TikTok',
      'Falta confirmar la vista previa del contenido',
      'Falta el consentimiento expreso para publicar en TikTok',
    ])
    await userEvent.click(screen.getByRole('radio', { name: 'Público' }))
    await userEvent.click(screen.getByRole('checkbox', { name: /Revisé la vista previa/ }))
    expect(problemasDe('video', ultimo)).toEqual([
      'Falta el consentimiento expreso para publicar en TikTok',
    ])
    await userEvent.click(screen.getByRole('checkbox', { name: /consentimiento expreso/ }))
    expect(problemasDe('video', ultimo)).toEqual([])
    expect(ultimo.privacyLevel).toBe(PRIVACIDAD_PUBLICA)
  })

  it('los interruptores cambian el valor', async () => {
    montar(<Controlado tipo="video" />)
    const comentarios = await screen.findByRole('switch', { name: 'Permitir comentarios' })
    expect(comentarios).toHaveAttribute('aria-checked', 'false')
    await userEvent.click(comentarios)
    expect(comentarios).toHaveAttribute('aria-checked', 'true')
    expect(ultimo.allowComment).toBe(true)
    await userEvent.click(screen.getByRole('switch', { name: 'Permitir dúos' }))
    expect(ultimo.allowDuet).toBe(true)
    await userEvent.click(screen.getByRole('switch', { name: 'Permitir stitch' }))
    expect(ultimo.allowStitch).toBe(true)
  })

  it('un interruptor que la cuenta tiene apagado queda deshabilitado, en «no» y con el motivo', async () => {
    cuenta({ comentariosDeshabilitados: true, duetDeshabilitado: true, stitchDeshabilitado: true })
    montar(
      <Controlado
        tipo="video"
        inicial={{
          ...opcionesTikTokIniciales('video'),
          allowComment: true,
          allowDuet: true,
          allowStitch: true,
        }}
      />,
    )
    for (const nombre of ['Permitir comentarios', 'Permitir dúos', 'Permitir stitch']) {
      const s = await screen.findByRole('switch', { name: nombre })
      expect(s).toBeDisabled()
      expect(s).toHaveAccessibleDescription('La cuenta lo tiene desactivado en TikTok.')
      await waitFor(() => expect(s).toHaveAttribute('aria-checked', 'false'))
    }
    expect(ultimo).toMatchObject({ allowComment: false, allowDuet: false, allowStitch: false })
  })

  it('quita una privacidad que no vale para video (venía de fotos) para no dejar un estado oculto', async () => {
    montar(
      <Controlado
        tipo="video"
        inicial={{ ...opcionesTikTokIniciales('video'), privacyLevel: 'SELF_ONLY' }}
      />,
    )
    await screen.findByRole('radio', { name: 'Público' })
    await waitFor(() => expect(ultimo.privacyLevel).toBeUndefined())
    expect(screen.getByRole('radio', { name: /Solo yo/ })).not.toBeChecked()
  })

  it('completa dúos y stitch si el valor venía de fotos (sin esas claves)', async () => {
    montar(<Controlado tipo="video" inicial={opcionesTikTokIniciales('fotos')} />)
    await screen.findByRole('switch', { name: 'Permitir dúos' })
    await waitFor(() => expect(ultimo).toMatchObject({ allowDuet: false, allowStitch: false }))
  })

  it('si la cuenta no permite videos públicos avisa que no se puede publicar un video', async () => {
    cuenta({ privacidades: ['SELF_ONLY'] })
    montar(<Controlado tipo="video" />)
    expect(await screen.findByText(/no permite publicar videos públicos/)).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Solo yo/ })).toBeDisabled()
  })
})

describe('OpcionesTikTokForm · fotos', () => {
  it('se puede elegir cualquier privacidad y no hay dúos ni stitch ni duración', async () => {
    montar(<Controlado tipo="fotos" />)
    for (const nombre of [/Público/, /Amigos/, /Solo yo/])
      expect(await screen.findByRole('radio', { name: nombre })).toBeEnabled()
    expect(
      screen.queryByText('Los videos de TikTok se publican como públicos.'),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: 'Permitir dúos' })).not.toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: 'Permitir stitch' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Duración máxima/)).not.toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Permitir comentarios' })).toBeInTheDocument()
  })

  it('con una privacidad no pública el valor igual pasa validarPieza al completar todo', async () => {
    montar(<Controlado tipo="fotos" />)
    await userEvent.click(await screen.findByRole('radio', { name: /Solo yo/ }))
    await userEvent.click(screen.getByRole('checkbox', { name: /Revisé la vista previa/ }))
    await userEvent.click(screen.getByRole('checkbox', { name: /consentimiento expreso/ }))
    expect(ultimo.privacyLevel).toBe('SELF_ONLY')
    expect(problemasDe('fotos', ultimo)).toEqual([])
  })

  it('quita una privacidad que la cuenta no ofrece', async () => {
    montar(
      <Controlado
        tipo="fotos"
        inicial={{ ...opcionesTikTokIniciales('fotos'), privacyLevel: 'FOLLOWER_OF_CREATOR' }}
      />,
    )
    await screen.findByRole('radio', { name: /Solo yo/ })
    await waitFor(() => expect(ultimo.privacyLevel).toBeUndefined())
  })
})

describe('OpcionesTikTokForm · avisos y errores', () => {
  it('avisa si la cuenta no puede publicar más por ahora', async () => {
    cuenta({ puedePublicarMas: false })
    montar(<Controlado tipo="fotos" />)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'TikTok no deja publicar más contenido con esta cuenta por ahora.',
    )
  })

  it('sin ese aviso cuando puede publicar (o el dato no llega)', async () => {
    cuenta({ puedePublicarMas: null })
    montar(<Controlado tipo="fotos" />)
    await screen.findByRole('radio', { name: /Público/ })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('no muestra la duración si no llega', async () => {
    cuenta({ duracionMaximaSegundos: null })
    montar(<Controlado tipo="video" />)
    await screen.findByRole('radio', { name: 'Público' })
    expect(screen.queryByText(/Duración máxima/)).not.toBeInTheDocument()
  })

  it('muestra la carga y después el formulario', async () => {
    montar(<Controlado tipo="video" />)
    expect(screen.getByRole('status', { name: 'Cargando opciones de TikTok' })).toBeInTheDocument()
    expect(await screen.findByRole('radiogroup')).toBeInTheDocument()
  })

  it('un error de la API muestra el aviso y deja reintentar', async () => {
    let intentos = 0
    server.use(
      http.get('*/api/redes/:id/opciones-tiktok', () => {
        intentos += 1
        return intentos === 1
          ? HttpResponse.json({ detalle: 'caído' }, { status: 503 })
          : HttpResponse.json(OPCIONES_TIKTOK_MOCK)
      }),
    )
    montar(<Controlado tipo="video" />)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos cargar las opciones de TikTok.',
    )
    await userEvent.click(screen.getByRole('button', { name: /Reintentar/ }))
    expect(await screen.findByRole('radio', { name: 'Público' })).toBeInTheDocument()
  })

  it('un 404 (red de otro comercio o que no es de TikTok) muestra el error', async () => {
    server.use(
      http.get('*/api/redes/:id/opciones-tiktok', () =>
        HttpResponse.json({ detalle: 'No encontrado' }, { status: 404 }),
      ),
    )
    montar(<Controlado tipo="video" />)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})
