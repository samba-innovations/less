'use client'

import { useCallback, useRef, type ReactNode } from 'react'
import s from './tabs.module.css'

// Tabs — abas horizontais padronizadas. Substitui as N implementações
// ad-hoc de "<button className={s.tab}>...".
//
// Variants:
//  - underline (padrão): sublinha brand embaixo da ativa
//  - pill:               fundo brand-alpha na ativa, radius pill
//
// Sizes: sm | md
//
// A11y:
//  - role=tablist / tab
//  - Arrow Left/Right navega
//  - Home/End vão pro primeiro/último
//  - aria-selected + tabIndex correto (só a ativa é 0)

export type TabItem<K extends string = string> = {
  key:       K
  label:     ReactNode
  count?:    number | string
  icon?:     ReactNode
  disabled?: boolean
}

type Props<K extends string> = {
  items:      TabItem<K>[]
  active:     K
  onChange:   (key: K) => void
  variant?:   'underline' | 'pill'
  size?:      'sm' | 'md'
  fullWidth?: boolean
  className?: string
  ariaLabel?: string
}

export function Tabs<K extends string = string>({
  items, active, onChange,
  variant = 'underline', size = 'md',
  fullWidth, className, ariaLabel,
}: Props<K>) {
  const listRef = useRef<HTMLDivElement>(null)

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const enabled = items.filter(t => !t.disabled)
    if (enabled.length === 0) return
    const idx = enabled.findIndex(t => t.key === active)
    let next = idx
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % enabled.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + enabled.length) % enabled.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = enabled.length - 1
    else return
    e.preventDefault()
    onChange(enabled[next].key)
    // Foca a tab ativa após o state atualizar
    requestAnimationFrame(() => {
      const btn = listRef.current?.querySelector<HTMLButtonElement>(`[data-key="${enabled[next].key}"]`)
      btn?.focus()
    })
  }, [items, active, onChange])

  const cls = [
    s.list,
    s[variant],
    s[size],
    fullWidth ? s.fullWidth : '',
    className ?? '',
  ].filter(Boolean).join(' ')

  return (
    <div
      ref={listRef}
      className={cls}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
    >
      {items.map(t => {
        const isActive = t.key === active
        return (
          <button
            key={t.key}
            data-key={t.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            disabled={t.disabled}
            className={`${s.tab} ${isActive ? s.active : ''} ${t.disabled ? s.tabDisabled : ''}`}
            onClick={() => !t.disabled && onChange(t.key)}
          >
            {t.icon && <span className={s.tabIcon}>{t.icon}</span>}
            <span className={s.tabLabel}>{t.label}</span>
            {t.count !== undefined && (
              <span className={s.tabCount}>{t.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
