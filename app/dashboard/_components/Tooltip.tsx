'use client'

import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import s from './tooltip.module.css'

// Tooltip — popup contextual no hover/focus.
// Substitui ~16 variantes de tooltip espalhadas + reforça a11y do
// atributo `title` nativo (que só aparece após ~700ms e não é
// mostrado em keyboard focus).
//
// Features:
//  - portal (escapa containers com overflow)
//  - posições: top | bottom | left | right + auto-flip se cortar viewport
//  - delay configurável (padrão 200ms show, 0ms hide)
//  - abre por hover E focus (a11y keyboard)
//  - variants: default (surface) | dark (contraste)
//  - size: sm | md
//  - align: start | center | end
//
// Uso:
//   <Tooltip content="editar aluno">
//     <IconButton icon={<Pencil/>} label="editar" />
//   </Tooltip>

type Position = 'top' | 'bottom' | 'left' | 'right'
type Align    = 'start' | 'center' | 'end'
type Variant  = 'default' | 'dark'
type Size     = 'sm' | 'md'

type Props = {
  content:   ReactNode
  children:  ReactNode
  position?: Position
  align?:    Align
  variant?:  Variant
  size?:     Size
  delay?:    number       // ms para abrir
  disabled?: boolean
  className?: string
}

const OFFSET = 8

export function Tooltip({
  content, children,
  position = 'top', align = 'center',
  variant = 'default', size = 'md',
  delay = 200, disabled, className,
}: Props) {
  const [open, setOpen]           = useState(false)
  const [coords, setCoords]       = useState<{ top: number; left: number; pos: Position }>({ top: 0, left: 0, pos: position })
  const openTimerRef              = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef                = useRef<HTMLSpanElement>(null)
  const tooltipRef                = useRef<HTMLDivElement>(null)

  const calcPos = useCallback(() => {
    const el = wrapperRef.current?.firstElementChild as HTMLElement | null
    if (!el) return
    const r = el.getBoundingClientRect()
    // Estimate tooltip size (não medimos exatamente pra evitar dupla-medida)
    const tw = tooltipRef.current?.offsetWidth  ?? 160
    const th = tooltipRef.current?.offsetHeight ?? 32
    const vw = window.innerWidth
    const vh = window.innerHeight

    // Tenta a posição preferida, faz auto-flip se cortar
    const tryPositions: Position[] = [position, 'top', 'bottom', 'right', 'left']
    let chosen: Position = position
    let top = 0, left = 0

    for (const p of tryPositions) {
      chosen = p
      switch (p) {
        case 'top':
          top  = r.top - th - OFFSET
          left = r.left + r.width / 2 - tw / 2
          break
        case 'bottom':
          top  = r.bottom + OFFSET
          left = r.left + r.width / 2 - tw / 2
          break
        case 'left':
          top  = r.top + r.height / 2 - th / 2
          left = r.left - tw - OFFSET
          break
        case 'right':
          top  = r.top + r.height / 2 - th / 2
          left = r.right + OFFSET
          break
      }
      // ajusta align
      if (p === 'top' || p === 'bottom') {
        if (align === 'start') left = r.left
        if (align === 'end')   left = r.right - tw
      } else {
        if (align === 'start') top = r.top
        if (align === 'end')   top = r.bottom - th
      }
      // se cabe, usa
      if (top >= 4 && left >= 4 && top + th <= vh - 4 && left + tw <= vw - 4) break
    }

    // clamp final pra não sair da viewport
    top  = Math.max(4, Math.min(vh - th - 4, top))
    left = Math.max(4, Math.min(vw - tw - 4, left))
    setCoords({ top, left, pos: chosen })
  }, [position, align])

  useEffect(() => {
    if (!open) return
    // Passo 1: calcula com estimativa (evita popup em 0,0)
    calcPos()
    // Passo 2: reflow após render pra medir o tamanho real e reposicionar
    const raf = requestAnimationFrame(() => calcPos())
    const onScroll = () => calcPos()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open, calcPos])

  function scheduleOpen() {
    if (disabled) return
    if (openTimerRef.current) clearTimeout(openTimerRef.current)
    openTimerRef.current = setTimeout(() => setOpen(true), delay)
  }
  function close() {
    if (openTimerRef.current) clearTimeout(openTimerRef.current)
    setOpen(false)
  }

  const cls = [
    s.tooltip,
    s[variant],
    s[size],
    s[`pos-${coords.pos}`],
    className ?? '',
  ].filter(Boolean).join(' ')

  return (
    <>
      <span
        ref={wrapperRef}
        className={s.wrap}
        onMouseEnter={scheduleOpen}
        onMouseLeave={close}
        onFocus={scheduleOpen}
        onBlur={close}
      >
        {children}
      </span>
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={tooltipRef}
          className={cls}
          role="tooltip"
          style={{ top: coords.top, left: coords.left }}
        >
          {content}
        </div>,
        document.body,
      )}
    </>
  )
}
