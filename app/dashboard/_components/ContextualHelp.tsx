'use client'

import { useState, useRef, useEffect } from 'react'
import { HelpCircle } from 'lucide-react'
import s from './contextual-help.module.css'

type Props = {
  content:   string
  size?:     'sm' | 'md'
  placement?: 'top' | 'bottom' | 'right'
}

// ContextualHelp — question mark inline com tooltip on hover/click.
// Ideal ao lado de labels de campos complexos (peso, bimestre, sigla RA, etc).
export function ContextualHelp({ content, size = 'sm', placement = 'top' }: Props) {
  const [open, setOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef  = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <span
      ref={wrapRef}
      className={s.wrap}
      onMouseEnter={() => {
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => setOpen(true), 200)
      }}
      onMouseLeave={() => {
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => setOpen(false), 100)
      }}
    >
      <button
        type="button"
        className={s.trigger}
        onClick={() => setOpen(v => !v)}
        aria-label="ajuda"
        aria-expanded={open}
      >
        <HelpCircle size={size === 'sm' ? 12 : 14} strokeWidth={2} />
      </button>
      {open && <span className={`${s.tooltip} ${s[`placement-${placement}`]}`} role="tooltip">{content}</span>}
    </span>
  )
}
