'use client'

import { forwardRef, type ReactNode, type MouseEvent } from 'react'
import { X } from 'lucide-react'
import s from './chip.module.css'
import { IconButton } from '../_components/IconButton'

// Chip — tag/pill unificado. Substitui ~80 variantes espalhadas:
// activeFilterChip, chip, sedBadge, tabBadge, statusBadge, etc.
//
// Papéis (podem combinar):
//  - info:         só texto, sem interação
//  - selecionável: clicável, com estado selected
//  - removível:    X à direita → onRemove
//  - com counter:  mostra número integrado
//  - com ícone:    ícone à esquerda
//
// Variants: neutral | brand | success | warning | danger | amber
// Sizes:    sm | md

type Variant = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'amber'
type Size    = 'sm' | 'md'

type Props = {
  children:   ReactNode
  variant?:   Variant
  size?:      Size
  selected?:  boolean
  onClick?:   (e: MouseEvent<HTMLElement>) => void
  removable?: boolean
  onRemove?:  (e: MouseEvent) => void
  count?:     number | string
  icon?:      ReactNode
  disabled?:  boolean
  className?: string
  title?:     string
}

export const Chip = forwardRef<HTMLElement, Props>(function Chip(
  { children, variant = 'neutral', size = 'md',
    selected, onClick, removable, onRemove, count, icon,
    disabled, className, title }, ref
) {
  const isInteractive = Boolean(onClick) || removable

  const cls = [
    s.chip,
    s[variant],
    s[size],
    selected ? s.selected : '',
    disabled ? s.disabled : '',
    isInteractive ? s.interactive : '',
    className ?? '',
  ].filter(Boolean).join(' ')

  function handleRemove(e: MouseEvent) {
    e.stopPropagation()
    if (disabled) return
    onRemove?.(e)
  }

  const content = (
    <>
      {icon && <span className={s.icon}>{icon}</span>}
      <span className={s.label}>{children}</span>
      {count !== undefined && (
        <span className={s.count}>{count}</span>
      )}
      {removable && (
        <IconButton
          icon={<X size={size === 'sm' ? 10 : 11} />}
          label="remover"
          variant="danger"
          onClick={handleRemove}
          type="button"
          tabIndex={-1}
        />
      )}
    </>
  )

  if (onClick) {
    return (
      <button
        ref={ref as React.ForwardedRef<HTMLButtonElement>}
        type="button"
        className={cls}
        onClick={onClick}
        disabled={disabled}
        aria-pressed={selected}
        title={title}
      >
        {content}
      </button>
    )
  }

  return (
    <span
      ref={ref as React.ForwardedRef<HTMLSpanElement>}
      className={cls}
      title={title}
    >
      {content}
    </span>
  )
})
