import { setupWorker } from 'msw/browser'
import { MODO_MOCKS } from '@/api/http'
import { handlersPara } from './handlers'

export const worker = setupWorker(...handlersPara(MODO_MOCKS))
