'use client'

import { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react'
import { createPortal } from 'react-dom'
import { Clock, ChevronUp, ChevronDown, X } from 'lucide-react'
import s from './timepicker.module.css'
import { Button } from '../_components/Button'

// TimePicker — alternativa ao <input type="time">.
// Valor em "HH:MM" 24h. Painel via Portal com duas colunas scroll-snap
// (horas e minutos) + atalhos rápidos. Suporta step em minutos (5, 15,
// 30 etc.), min/max, teclado.

type Props = {
  value:        string | null    // "HH:MM"
  onChange:     (v: string) => void
  min?:         string           // "HH:MM"
  max?:         string
  step?:        number           // minutos, default 5
  placeholder?: string
  size?:        'sm' | 'md'
  disabled?:    boolean
  label?:       string
  className?:   string
}

function parseHM(s: string | null): { h: number; m: number } | null {
  if (!s) return null
  const [h, m] = s.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  if (h < 0 || h > 23 || m < 0 || m > 59) return null
  return { h, m }
}
function pad(n: number) { return String(n).padStart(2, '0') }
function formatHM(h: number, m: number) { return `${pad(h)}:${pad(m)}` }

function inRange(hm: string, minS?: string, maxS?: string) {
  if (minS && hm < minS) return false
  if (maxS && hm > maxS) return false
  return true
}

function TimePickerImpl({
  value, onChange, min, max, step = 5,
  placeholder = 'selecionar hora…',
  size = 'md', disabled, label, className,
}: Props) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [pos,  setPos]  = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef   = useRef<HTMLDivElement>(null)

  const parsed = useMemo(() => parseHM(value), [value])
  const [hour,   setHour]   = useState(parsed?.h ?? new Date().getHours())
  const [minute, setMinute] = useState(parsed ? Math.round(parsed.m / step) * step : 0)

  useEffect(() => {
    if (parsed) { setHour(parsed.h); setMinute(parsed.m) }
  }, [parsed])

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), [])
  const minutes = useMemo(() => {
    const arr: number[] = []
    for (let m = 0; m < 60; m += step) arr.push(m)
    return arr
  }, [step])

  const canPick = useCallback((h: number, m: number) => inRange(formatHM(h, m), min, max), [min, max])

  // Outside-click / Escape
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      const t = e.target as Node
      if (triggerRef.current?.contains(t)) return
      if (panelRef.current?.contains(t))   return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
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

  // Ao abrir, faz scroll pro item selecionado nas duas colunas.
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => {
      panelRef.current?.querySelectorAll(`.${s.colItemActive}`).forEach(el => {
        el.scrollIntoView({ block: 'center', behavior: 'auto' })
      })
    }, 20)
    return () => clearTimeout(t)
  }, [open])

  // Posiciona o painel: abre pra baixo; se nao couber, vira pra cima; sempre dentro da viewport.
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
    const r = triggerRef.current?.getBoundingClientRect() ?? null
    setRect(r)
    setOpen(true)
  }

  function commit(h: number, m: number) {
    if (!canPick(h, m)) return
    setHour(h); setMinute(m)
    onChange(formatHM(h, m))
  }

  function commitAndClose(h: number, m: number) {
    commit(h, m); setOpen(false)
  }

  function chooseNow() {
    const now = new Date()
    const m = Math.round(now.getMinutes() / step) * step % 60
    const h = m === 0 && now.getMinutes() > 30 ? (now.getHours() + 1) % 24 : now.getHours()
    commitAndClose(h, m)
  }

  function chooseNextHour() {
    const nh = (hour + 1) % 24
    commitAndClose(nh, 0)
  }

  function clearValue(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
  }

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      className={`${s.trigger} ${size === 'sm' ? s.triggerSm : ''} ${!parsed ? s.triggerEmpty : ''} ${disabled ? s.triggerDisabled : ''} ${className ?? ''}`}
      onClick={() => (open ? setOpen(false) : openPanel())}
      disabled={disabled}
      aria-haspopup="dialog"
      aria-expanded={open}
    >
      <Clock size={size === 'sm' ? 13 : 14} className={s.triggerIcon} />
      <span className={s.triggerText}>
        {parsed ? formatHM(parsed.h, parsed.m) : placeholder}
      </span>
      {parsed && !disabled && (
        <span
          className={s.clearBtn}
          onClick={clearValue}
          aria-label="limpar hora"
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
    >
      {/* Big preview no topo */}
      <div className={s.preview}>
        <span className={s.previewNumber}>{pad(hour)}</span>
        <span className={s.previewSep}>:</span>
        <span className={s.previewNumber}>{pad(minute)}</span>
      </div>

      {/* Duas colunas scrolláveis com snap */}
      <div className={s.columns}>
        <div className={s.col} role="listbox" aria-label="hora">
          <button
            type="button"
            className={s.colStep}
            onClick={() => commit((hour + 23) % 24, minute)}
            aria-label="hora anterior"
          >
            <ChevronUp size={14} />
          </button>
          <div className={s.colScroll}>
            {hours.map(h => {
              const active = h === hour
              const dis = !canPick(h, minute)
              return (
                <button
                  key={h}
                  type="button"
                  className={`${s.colItem} ${active ? s.colItemActive : ''} ${dis ? s.colItemDisabled : ''}`}
                  onClick={() => commit(h, minute)}
                  disabled={dis}
                  role="option"
                  aria-selected={active}
                >
                  {pad(h)}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            className={s.colStep}
            onClick={() => commit((hour + 1) % 24, minute)}
            aria-label="próxima hora"
          >
            <ChevronDown size={14} />
          </button>
        </div>

        <div className={s.colSepWrap}>
          <span className={s.colSep}>:</span>
        </div>

        <div className={s.col} role="listbox" aria-label="minuto">
          <button
            type="button"
            className={s.colStep}
            onClick={() => commit(hour, (minute - step + 60) % 60)}
            aria-label="minuto anterior"
          >
            <ChevronUp size={14} />
          </button>
          <div className={s.colScroll}>
            {minutes.map(m => {
              const active = m === minute
              const dis = !canPick(hour, m)
              return (
                <button
                  key={m}
                  type="button"
                  className={`${s.colItem} ${active ? s.colItemActive : ''} ${dis ? s.colItemDisabled : ''}`}
                  onClick={() => commit(hour, m)}
                  disabled={dis}
                  role="option"
                  aria-selected={active}
                >
                  {pad(m)}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            className={s.colStep}
            onClick={() => commit(hour, (minute + step) % 60)}
            aria-label="próximo minuto"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* Atalhos */}
      <div className={s.footer}>
        <Button
          variant="ghost"
          onClick={chooseNow}
          type="button"
        >agora</Button>
        <Button
          variant="ghost"
          onClick={chooseNextHour}
          type="button"
        >próxima hora</Button>
        <Button
          variant="primary"
          onClick={() => commitAndClose(hour, minute)}
          type="button"
        >confirmar</Button>
      </div>
    </div>,
    document.body,
  ) : null

  return (
    <>
      {label ? (
        <div className={s.fieldWrap}>
          <label className={s.fieldLabel}>{label}</label>
          {trigger}
        </div>
      ) : trigger}
      {panel}
    </>
  )
}

// memo — evita re-render quando pai muda mas value/onChange são estáveis
export const TimePicker = memo(TimePickerImpl)
