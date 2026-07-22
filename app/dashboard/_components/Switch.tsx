'use client'

import { forwardRef, type ReactNode } from 'react'
import s from './switch.module.css'

// Switch — toggle on/off estilo iOS.
// Substitui as ~7 variantes de `toggle` / `toggleOn` / `toggleOff`
// (a maioria no /preferencias). Diferente do Checkbox: representa
// um estado imediato (liga/desliga), não uma escolha em formulário.
//
// Features:
//  - checked / onChange
//  - label + description (opcional)
//  - size sm/md/lg
//  - variant brand/success (só afeta cor do "on")
//  - disabled
//  - labelPosition: left | right (padrão right)
//  - a11y: input real escondido (checkbox), focus visível, aria-checked

type Size    = 'sm' | 'md' | 'lg'
type Variant = 'brand' | 'success'
type LabelPosition = 'left' | 'right'

type Props = {
  checked:         boolean
  onChange:        (checked: boolean) => void
  label?:          ReactNode
  description?:    ReactNode
  size?:           Size
  variant?:        Variant
  disabled?:       boolean
  labelPosition?:  LabelPosition
  id?:             string
  name?:           string
  className?:      string
}

export const Switch = forwardRef<HTMLInputElement, Props>(function Switch(
  { checked, onChange, label, description,
    size = 'md', variant = 'brand', disabled,
    labelPosition = 'right', id, name, className }, ref
) {
  const cls = [
    s.wrap,
    s[size],
    s[variant],
    disabled ? s.disabled : '',
    labelPosition === 'left' ? s.labelLeft : '',
    className ?? '',
  ].filter(Boolean).join(' ')

  const showLabel = Boolean(label || description)

  const control = (
    <span className={s.control}>
      <input
        ref={ref}
        id={id}
        name={name}
        type="checkbox"
        className={s.input}
        checked={checked}
        disabled={disabled}
        onChange={e => onChange(e.target.checked)}
        role="switch"
        aria-checked={checked}
      />
      <span className={s.track} aria-hidden="true">
        <span className={s.thumb} />
      </span>
    </span>
  )

  const labels = showLabel && (
    <span className={s.labels}>
      {label && <span className={s.label}>{label}</span>}
      {description && <span className={s.desc}>{description}</span>}
    </span>
  )

  return (
    <label className={cls}>
      {labelPosition === 'left' ? (
        <>
          {labels}
          {control}
        </>
      ) : (
        <>
          {control}
          {labels}
        </>
      )}
    </label>
  )
})
