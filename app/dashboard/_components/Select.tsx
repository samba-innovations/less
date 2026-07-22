'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'
import s from './select.module.css'

export type SelectOption<T extends string | number = string> = { value: T; label: string }

type Props<T extends string | number> = {
  options:      SelectOption<T>[]
  value:        T
  onChange?:    (value: T) => void
  name?:        string
  size?:        'sm' | 'md'
  className?:   string
  placeholder?: string
}

export function Select<T extends string | number = string>({ options, value, onChange, name, size = 'md', className, placeholder }: Props<T>) {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [rect, setRect]       = useState<DOMRect | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef   = useRef<HTMLDivElement>(null)
  const current    = options.find(o => o.value === value)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
    }
    function onScroll(e: Event) {
      if (panelRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  function toggle() {
    if (!open && triggerRef.current) setRect(triggerRef.current.getBoundingClientRect())
    setOpen(v => !v)
  }

  function select(val: T) {
    setOpen(false)
    if (val === value) return
    setLoading(true)
    setTimeout(() => {
      onChange?.(val)
      setLoading(false)
    }, 420)
  }

  const dropdownStyle = rect ? {
    position: 'fixed' as const,
    top:      rect.bottom + 6,
    left:     rect.left,
    width:    rect.width,
    zIndex:   99998,
  } : {}

  return (
    <div className={`${s.wrap} ${size === 'sm' ? s.wrapSm : ''} ${className ?? ''}`}>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        ref={triggerRef}
        type="button"
        className={`${s.trigger} ${size === 'sm' ? s.triggerSm : ''} ${open ? s.triggerOpen : ''} ${loading ? s.triggerLoading : ''}`}
        onClick={toggle}
        disabled={loading}
      >
        <span className={current ? s.triggerValue : s.triggerPlaceholder}>
          {current?.label ?? placeholder ?? 'selecionar'}
        </span>
        <ChevronDown size={size === 'sm' ? 12 : 14} className={`${s.chevron} ${open ? s.chevronOpen : ''}`} />
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div ref={panelRef} className={s.panel} style={dropdownStyle}>
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`${s.option} ${opt.value === value ? s.optionActive : ''}`}
              onClick={() => select(opt.value)}
            >
              <span>{opt.label}</span>
              {opt.value === value && <Check size={13} className={s.optionCheck} />}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
