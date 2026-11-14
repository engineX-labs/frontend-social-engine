import type { VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { botonClases } from './boton-clases'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof botonClases>

export function Boton({ className, variante, tamano, type = 'button', ...resto }: Props) {
  return (
    <button type={type} className={cn(botonClases({ variante, tamano }), className)} {...resto} />
  )
}
