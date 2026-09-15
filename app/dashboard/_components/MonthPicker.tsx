'use client'

// MonthPicker — mês/ano, no formato "YYYY-MM".
//
// Substitui <input type="month">, cujo painel é desenhado pelo navegador e
// ignora o tema do sistema. Segue o mesmo trigger e painel do DatePicker.

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CalendarRange, X, ChevronLeft, ChevronRight } from 'lucide-react'
import s from './monthpicker.module.css'

type Props = {
  value:        string | null      // "YYYY-MM"
  onChange:     (v: string) => void
  min?:         string             // "YYYY-MM"
  max?:         string
  placeholder?: string
  size?:        'sm' | 'md'
  disabled?:    boolean
  className?:   string
}

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
                      'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MONTHS_LONG  = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

function parse(v: string | null): { y: number; m: number } | null {
  if (!v) return null
  const [y, m] = v.split('-').map(Number)
  if (!y || !m || m < 1 || m > 12) return null
  return { y, m: m - 1 }
}
const fmt = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}`
/** "2026-09" → "setembro de 2026" */
export const formatMonth = (v: string) => {
  const p = parse(v)
  return p ? `${MONTHS_LONG[p.m]} de ${p.y}` : ''
}

export function MonthPicker({
  value, onChange, min, max,
  placeholder = 'mês', size = 'md', disabled, className,
}: Props) {
  const parsed = parse(value)
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [pos, setPos]   = useState<{ top: number; left: number } | null>(null)
  const [year, setYear] = useState(parsed?.y ?? new Date().getFullYear())
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef   = useRef<HTMLDivElement>(null)

  useEffect(() => { if (parsed) setYear(parsed.y) }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      const t = e.target as Node
      if (triggerRef.current?.contains(t)) return
      if (panelRef.current?.contains(t))   return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    function onScroll(e: Event) {
      if (panelRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown',   onKey)
    window.addEventListener('scroll',      onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown',   onKey)
      window.removeEventListener('scroll',      onScroll, true)
    }
  }, [open])

  // Abre pra baixo; se não couber, vira pra cima — sempre dentro da viewport.
  useEffect(() => {
    if (!open) { setPos(null); return }
    if (!rect || !panelRef.current) return
    const ph = panelRef.current.offsetHeight
    const gap = 6
    const left = Math.max(8, Math.min(window.innerWidth - 248, rect.left))
    let top = rect.bottom + gap
    if (top + ph + 8 > window.innerHeight) {
      const above = rect.top - ph - gap
      top = above >= 8 ? above : Math.max(8, window.innerHeight - ph - 8)
    }
    setPos({ top, left })
  }, [open, rect])

  function openPanel() {
    if (disabled) return
    setRect(triggerRef.current?.getBoundingClientRect() ?? null)
    setOpen(true)
  }

  function canPick(y: number, m: number) {
    const v = fmt(y, m)
    if (min && v < min) return false
    if (max && v > max) return false
    return true
  }

  function pick(m: number) {
    if (!canPick(year, m)) return
    onChange(fmt(year, m))
    setOpen(false)
  }

  function clearValue(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
  }

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      className={[
        s.trigger,
        size === 'sm' ? s.triggerSm : '',
        !parsed ? s.triggerEmpty : '',
        disabled ? s.triggerDisabled : '',
        className ?? '',
      ].filter(Boolean).join(' ')}
      onClick={() => (open ? setOpen(false) : openPanel())}
      disabled={disabled}
      aria-haspopup="dialog"
      aria-expanded={open}
    >
      <CalendarRange size={size === 'sm' ? 13 : 14} className={s.triggerIcon} />
      <span className={s.triggerText}>
        {parsed ? `${MONTHS_SHORT[parsed.m]} ${parsed.y}` : placeholder}
      </span>
      {parsed && !disabled && (
        <span
          className={s.clearBtn}
          onClick={clearValue}
          aria-label="limpar mês"
          role="button"
          tabIndex={-1}
        >
          <X size={11} />
        </span>
      )}
    </button>
  )

  const panel = open && rect && typeof document !== 'undefined' ? createPortal(
    <div
      ref={panelRef}
      className={s.panel}
      style={{
        top:  pos?.top ?? rect.bottom + 6,
        left: pos?.left ?? Math.max(8, Math.min(window.innerWidth - 248, rect.left)),
        visibility: pos ? 'visible' : 'hidden',
      }}
      role="dialog"
      aria-label="escolher mês"
    >
      <div className={s.head}>
        <button type="button" className={s.navBtn} onClick={() => setYear(y => y - 1)} aria-label="ano anterior">
          <ChevronLeft size={15} />
        </button>
        <span className={s.year}>{year}</span>
        <button type="button" className={s.navBtn} onClick={() => setYear(y => y + 1)} aria-label="próximo ano">
          <ChevronRight size={15} />
        </button>
      </div>

      <div className={s.grid} role="listbox">
        {MONTHS_SHORT.map((label, m) => {
          const active = parsed?.y === year && parsed?.m === m
          const dis = !canPick(year, m)
          return (
            <button
              key={label}
              type="button"
              className={`${s.month} ${active ? s.monthActive : ''}`}
              onClick={() => pick(m)}
              disabled={dis}
              role="option"
              aria-selected={active}
            >
              {label}
            </button>
          )
        })}
      </div>

      <div className={s.footer}>
        <button type="button" className={s.quickBtn} onClick={() => { onChange(''); setOpen(false) }}>
          limpar
        </button>
        <button
          type="button"
          className={s.quickBtn}
          onClick={() => {
            const now = new Date()
            setYear(now.getFullYear())
            if (canPick(now.getFullYear(), now.getMonth())) {
              onChange(fmt(now.getFullYear(), now.getMonth()))
              setOpen(false)
            }
          }}
        >
          este mês
        </button>
      </div>
    </div>,
    document.body,
  ) : null

  return <>{trigger}{panel}</>
}
