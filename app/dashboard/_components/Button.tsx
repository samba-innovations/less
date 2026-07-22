'use client'

import { forwardRef, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import s from './button.module.css'

// Button — botão padrão do sistema. Substitui os 300+ botões espalhados
// com variantes locais (btnPrimary, btnSecondary, actionBtn, addBtn, etc.).
//
// Variants:
//  - primary   : fundo brand, texto branco. Ação principal.
//  - secondary : borda + fundo transparente. Ação alternativa.
//  - ghost     : só texto, sem borda/fundo. Ação terciária/nav.
//  - danger    : vermelho, para destrutivas confirmadas.
//  - success   : verde, para confirmações finais.
//
// Sizes: sm | md | lg
// iconLeft/iconRight: componentes lucide-react
// loading: mostra spinner e desabilita
// fullWidth: ocupa 100%

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type Size    = 'sm' | 'md' | 'lg'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?:   Variant
  size?:      Size
  iconLeft?:  ReactNode
  iconRight?: ReactNode
  loading?:   boolean
  fullWidth?: boolean
  children?:  ReactNode
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', iconLeft, iconRight, loading, fullWidth,
    disabled, children, className, type = 'button', ...rest }, ref
) {
  const cls = [
    s.btn,
    s[variant],
    s[size],
    fullWidth ? s.fullWidth : '',
    loading   ? s.loading   : '',
    className ?? '',
  ].filter(Boolean).join(' ')

  return (
    <button
      ref={ref}
      type={type}
      className={cls}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <Loader2 size={size === 'sm' ? 12 : size === 'lg' ? 16 : 14} className={s.spin} />
      ) : iconLeft}
      {children && <span className={s.label}>{children}</span>}
      {!loading && iconRight}
    </button>
  )
})
