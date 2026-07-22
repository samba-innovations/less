'use client'

import { forwardRef, type ReactNode } from 'react'
import s from './icon-button.module.css'

// IconButton — botão só de ícone. Substitui as 95+ variantes de `iconBtn`
// espalhadas (editar, deletar, close, chevrons, etc.).
//
// Sempre precisa de `label` (aria-label) por acessibilidade.
// Variants:
//  - ghost   : padrão, transparente com hover sutil
//  - filled  : fundo surface levemente destacado
//  - primary : fundo brand
//  - danger  : hover vermelho (para deletar, remover)
//
// Sizes: sm (24px) | md (32px) | lg (40px)

type Variant = 'ghost' | 'filled' | 'primary' | 'danger'
type Size    = 'sm' | 'md' | 'lg'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon:     ReactNode
  label:    string          // aria-label + tooltip
  variant?: Variant
  size?:    Size
}

export const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton(
  { icon, label, variant = 'ghost', size = 'md',
    className, type = 'button', title, ...rest }, ref
) {
  const cls = [
    s.btn,
    s[variant],
    s[size],
    className ?? '',
  ].filter(Boolean).join(' ')

  return (
    <button
      ref={ref}
      type={type}
      className={cls}
      aria-label={label}
      title={title ?? label}
      {...rest}
    >
      {icon}
    </button>
  )
})
