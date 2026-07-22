'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import s from './toast.module.css'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

type Props = {
  open:     boolean
  variant:  ToastVariant
  title:    string
  message?: string
  duration?: number
  onClose:  () => void
}

const ICON: Record<ToastVariant, LucideIcon> = {
  success: CheckCircle2,
  error:   AlertCircle,
  warning: AlertTriangle,
  info:    Info,
}

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 3000,
  info:    4000,
  warning: 5500,
  error:   6000,
}

// Toast unificado. Aparece no canto inferior-direito (não conflita com bell
// notifications que vão pro top-right no message toast stack).
// Auto-dismiss por variant; hover pausa; click no X fecha.
export function Toast({ open, variant, title, message, duration, onClose }: Props) {
  const [exiting, setExiting] = useState(false)
  const pausedRef = useRef(false)
  const elapsedRef = useRef(0)
  const lastFrameRef = useRef(0)

  const dur = duration ?? DEFAULT_DURATION[variant]
  const Icon = ICON[variant]

  const dismissWithAnim = useCallback(() => {
    setExiting(true)
    setTimeout(onClose, 220)
  }, [onClose])

  useEffect(() => {
    if (!open) { setExiting(false); elapsedRef.current = 0; lastFrameRef.current = 0; return }
    let raf = 0
    function tick(now: number) {
      if (!lastFrameRef.current) lastFrameRef.current = now
      const dt = now - lastFrameRef.current
      lastFrameRef.current = now
      if (!pausedRef.current) {
        elapsedRef.current += dt
        if (elapsedRef.current >= dur) { dismissWithAnim(); return }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [open, dur, dismissWithAnim])

  if (!open) return null

  return (
    <div
      className={`${s.toast} ${s[variant]} ${exiting ? s.exiting : ''}`}
      role={variant === 'error' || variant === 'warning' ? 'alert' : 'status'}
      onMouseEnter={() => { pausedRef.current = true }}
      onMouseLeave={() => { pausedRef.current = false }}
    >
      <div className={s.iconWrap}>
        <Icon size={16} />
      </div>
      <div className={s.content}>
        <span className={s.title}>{title}</span>
        {message && <span className={s.message}>{message}</span>}
      </div>
      <button className={s.close} onClick={dismissWithAnim} aria-label="Dispensar">
        <X size={12} />
      </button>
    </div>
  )
}
