'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import s from './checkbox.module.css'

// Checkbox — substitui <input type="checkbox">. Visual custom com
// check SVG animado (stroke-draw), suporta indeterminate, label
// clicável, focus ring com brand. Mantém input real escondido para
// acessibilidade (Tab/Space) e forms nativos.

type Props = {
  checked:        boolean
  onChange:       (checked: boolean) => void
  label?:         ReactNode
  disabled?:      boolean
  indeterminate?: boolean
  size?:          'sm' | 'md'
  className?:     string
  id?:            string
  name?:          string
}

export function Checkbox({
  checked, onChange, label, disabled, indeterminate,
  size = 'md', className, id, name,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  // O `indeterminate` só existe via prop DOM; setar via useEffect.
  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = !!indeterminate
  }, [indeterminate])

  return (
    <label
      className={`${s.wrap} ${size === 'sm' ? s.wrapSm : ''} ${disabled ? s.wrapDisabled : ''} ${className ?? ''}`}
    >
      <input
        ref={inputRef}
        type="checkbox"
        className={s.input}
        checked={checked}
        disabled={disabled}
        id={id}
        name={name}
        onChange={e => onChange(e.target.checked)}
      />
      <span className={s.box} aria-hidden="true">
        {indeterminate ? (
          <svg viewBox="0 0 16 16" className={s.icon}>
            <path
              d="M4 8h8"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              className={s.iconLineIndet}
            />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" className={s.icon}>
            <path
              d="M3.5 8.5L6.5 11.5L12.5 4.5"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className={s.iconCheck}
            />
          </svg>
        )}
      </span>
      {label && <span className={s.label}>{label}</span>}
    </label>
  )
}
