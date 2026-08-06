'use client'

import { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'
import s from './datepicker.module.css'
import { Button } from '../_components/Button'
import { IconButton } from '../_components/IconButton'

// DatePicker — calendário custom, alternativa ao <input type="date">.
// Guarda valor em ISO YYYY-MM-DD, mostra em pt-BR. Portal p/ escapar
// containers com overflow. Teclado: arrows navegam, Enter seleciona,
// Esc fecha. Hoje/amanhã disponíveis como atalhos.

type Props = {
  value:        string | null       // YYYY-MM-DD
  onChange:     (v: string) => void
  min?:         string
  max?:         string
  placeholder?: string
  size?:        'sm' | 'md'
  disabled?:    boolean
  className?:   string
  label?:       string
}

const WEEK_HEADERS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const MONTH_LABELS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

// Parse "YYYY-MM-DD" para Date local (evita timezone shift do new Date(iso)).
function parseISO(iso: string | null): Date | null {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}
function formatISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate()
}
function formatDisplay(d: Date): string {
  const today = new Date()
  const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1)
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1)
  if (isSameDay(d, today))     return 'hoje'
  if (isSameDay(d, tomorrow))  return 'amanhã'
  if (isSameDay(d, yesterday)) return 'ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    .replace('.', '')
}

function DatePickerImpl({ value, onChange, min, max, placeholder = 'selecionar data…', size = 'md', disabled, className, label }: Props) {
  const [open, setOpen]         = useState(false)
  const [viewDate, setViewDate] = useState<Date>(() => parseISO(value) ?? new Date())
  const [focusDate, setFocusDate] = useState<Date | null>(null)
  const [rect, setRect]         = useState<DOMRect | null>(null)
  const [pos,  setPos]          = useState<{ top: number; left: number } | null>(null)
  const triggerRef              = useRef<HTMLButtonElement>(null)
  const panelRef                = useRef<HTMLDivElement>(null)

  const selected = useMemo(() => parseISO(value), [value])
  const minDate  = useMemo(() => parseISO(min ?? null), [min])
  const maxDate  = useMemo(() => parseISO(max ?? null), [max])

  const canSelect = useCallback((d: Date) => {
    if (minDate && d < minDate) return false
    if (maxDate && d > maxDate) return false
    return true
  }, [minDate, maxDate])

  // Fecha em outside-click / scroll / resize
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      const t = e.target as Node
      if (triggerRef.current?.contains(t)) return
      if (panelRef.current?.contains(t))   return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setOpen(false); return }
      if (!focusDate) return
      let next: Date | null = null
      if (e.key === 'ArrowLeft')  { next = new Date(focusDate); next.setDate(next.getDate() - 1) }
      if (e.key === 'ArrowRight') { next = new Date(focusDate); next.setDate(next.getDate() + 1) }
      if (e.key === 'ArrowUp')    { next = new Date(focusDate); next.setDate(next.getDate() - 7) }
      if (e.key === 'ArrowDown')  { next = new Date(focusDate); next.setDate(next.getDate() + 7) }
      if (e.key === 'Enter' && canSelect(focusDate)) {
        e.preventDefault()
        onChange(formatISO(focusDate)); setOpen(false); return
      }
      if (next) {
        e.preventDefault()
        setFocusDate(next)
        if (next.getMonth() !== viewDate.getMonth() || next.getFullYear() !== viewDate.getFullYear()) {
          setViewDate(next)
        }
      }
    }
    function onScroll(e: Event) {
      if (panelRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown',   onKey)
    window.addEventListener('scroll',      onScroll, true)
    window.addEventListener('resize',      () => setOpen(false))
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown',   onKey)
      window.removeEventListener('scroll',      onScroll, true)
    }
  }, [open, focusDate, viewDate, onChange, canSelect])

  // Posiciona o painel: abre pra baixo; se nao couber, vira pra cima; sempre dentro da viewport.
  useEffect(() => {
    if (!open) { setPos(null); return }
    if (!rect || !panelRef.current) return
    const ph = panelRef.current.offsetHeight
    const gap = 6
    const left = Math.max(8, Math.min(window.innerWidth - 348, rect.left))
    let top = rect.bottom + gap
    if (top + ph + 8 > window.innerHeight) {
      const above = rect.top - ph - gap
      top = above >= 8 ? above : Math.max(8, window.innerHeight - ph - 8)
    }
    setPos({ top, left })
  }, [open, rect])

  function openPanel() {
    if (disabled) return
    const r = triggerRef.current?.getBoundingClientRect() ?? null
    setRect(r)
    setViewDate(selected ?? new Date())
    setFocusDate(selected ?? new Date())
    setOpen(true)
  }

  // Grid: dias de 42 células (6 semanas). Preenche com prev/next month para
  // deixar a grade sempre alinhada.
  const cells = useMemo(() => {
    const y = viewDate.getFullYear()
    const m = viewDate.getMonth()
    const first = new Date(y, m, 1)
    const firstWeekday = first.getDay() // 0=dom
    const start = new Date(y, m, 1 - firstWeekday)
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [viewDate])

  function stepMonth(delta: number) {
    const d = new Date(viewDate)
    d.setDate(1)
    d.setMonth(d.getMonth() + delta)
    setViewDate(d)
    if (focusDate) {
      const nf = new Date(focusDate); nf.setMonth(nf.getMonth() + delta)
      setFocusDate(nf)
    }
  }

  function selectDate(d: Date) {
    if (!canSelect(d)) return
    onChange(formatISO(d))
    setOpen(false)
  }

  function selectQuick(offsetDays: number) {
    const d = new Date(); d.setDate(d.getDate() + offsetDays)
    selectDate(d)
  }

  function clearDate(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
  }

  const today = new Date()

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      className={`${s.trigger} ${size === 'sm' ? s.triggerSm : ''} ${!selected ? s.triggerEmpty : ''} ${className ?? ''}`}
      onClick={() => (open ? setOpen(false) : openPanel())}
      disabled={disabled}
      aria-haspopup="dialog"
      aria-expanded={open}
    >
      <Calendar size={size === 'sm' ? 13 : 14} className={s.triggerIcon} />
      <span className={s.triggerText}>
        {selected ? formatDisplay(selected) : placeholder}
      </span>
      {selected && !disabled && (
        <span className={s.clearBtn} onClick={clearDate} aria-label="limpar data" role="button" tabIndex={-1}>
          <X size={11} />
        </span>
      )}
    </button>
  )

  return (
    <>
      {label ? (
        <div className={s.fieldWrap}>
          <label className={s.fieldLabel}>{label}</label>
          {trigger}
        </div>
      ) : trigger}

      {open && rect && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          className={s.panel}
          style={{
            top:  pos?.top ?? rect.bottom + 6,
            left: pos?.left ?? Math.max(8, Math.min(window.innerWidth - 340, rect.left)),
            visibility: pos ? 'visible' : 'hidden',
          }}
          role="dialog"
        >
          <div className={s.header}>
            <IconButton
              icon={<ChevronLeft size={16} />}
              label="mês anterior"
              onClick={() => stepMonth(-1)}
              type="button"
            />
            <div className={s.headerLabel}>
              <strong>{MONTH_LABELS[viewDate.getMonth()]}</strong>
              <span className={s.headerYear}>{viewDate.getFullYear()}</span>
            </div>
            <IconButton
              icon={<ChevronRight size={16} />}
              label="próximo mês"
              onClick={() => stepMonth(1)}
              type="button"
            />
          </div>

          <div className={s.weekHeader}>
            {WEEK_HEADERS.map((wd, i) => (
              <span
                key={wd}
                className={`${s.weekLabel} ${i === 0 || i === 6 ? s.weekLabelEnd : ''}`}
              >{wd}</span>
            ))}
          </div>

          <div className={s.grid}>
            {cells.map((d, i) => {
              const inMonth = d.getMonth() === viewDate.getMonth()
              const isToday    = isSameDay(d, today)
              const isSelected = selected ? isSameDay(d, selected) : false
              const isFocus    = focusDate ? isSameDay(d, focusDate) : false
              const isWeekend  = d.getDay() === 0 || d.getDay() === 6
              const disabledDay = !canSelect(d)
              return (
                <button
                  key={i}
                  type="button"
                  className={`
                    ${s.cell}
                    ${inMonth ? '' : s.cellOut}
                    ${isToday && !isSelected ? s.cellToday : ''}
                    ${isSelected ? s.cellSelected : ''}
                    ${isFocus && !isSelected ? s.cellFocus : ''}
                    ${isWeekend ? s.cellWeekend : ''}
                    ${disabledDay ? s.cellDisabled : ''}
                  `.replace(/\s+/g, ' ').trim()}
                  onClick={() => selectDate(d)}
                  onMouseEnter={() => setFocusDate(d)}
                  disabled={disabledDay}
                  tabIndex={-1}
                >
                  {d.getDate()}
                </button>
              )
            })}
          </div>

          <div className={s.footer}>
            <Button
              variant="ghost"
              onClick={() => selectQuick(0)}
              type="button"
            >hoje</Button>
            <Button
              variant="ghost"
              onClick={() => selectQuick(1)}
              type="button"
            >amanhã</Button>
            <Button
              variant="ghost"
              onClick={() => selectQuick(7)}
              type="button"
            >daqui a 7 dias</Button>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

// memo — evita re-render quando pai muda mas value/onChange são estáveis
export const DatePicker = memo(DatePickerImpl)
