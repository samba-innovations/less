'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import s from './toast-provider.module.css'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

type ToastItem = {
  id:       string
  variant:  ToastVariant
  title:    string
  message?: string
  duration: number
}

type ToastContextValue = {
  toast: (opts: Omit<ToastItem, 'id' | 'duration'> & { duration?: number }) => string
  dismiss: (id: string) => void
  success: (title: string, message?: string) => void
  error:   (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info:    (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

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

const MAX_STACK = 4

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    const t = timersRef.current.get(id)
    if (t) { clearTimeout(t); timersRef.current.delete(id) }
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const toast = useCallback((opts: Omit<ToastItem, 'id' | 'duration'> & { duration?: number }) => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const duration = opts.duration ?? DEFAULT_DURATION[opts.variant]
    setItems(prev => [{ id, ...opts, duration }, ...prev].slice(0, MAX_STACK))
    const timer = setTimeout(() => dismiss(id), duration)
    timersRef.current.set(id, timer)
    return id
  }, [dismiss])

  const value: ToastContextValue = {
    toast,
    dismiss,
    success: (title, message) => { toast({ variant: 'success', title, message }) },
    error:   (title, message) => { toast({ variant: 'error',   title, message }) },
    warning: (title, message) => { toast({ variant: 'warning', title, message }) },
    info:    (title, message) => { toast({ variant: 'info',    title, message }) },
  }

  // Cleanup timers on unmount
  useEffect(() => () => {
    timersRef.current.forEach(t => clearTimeout(t))
    timersRef.current.clear()
  }, [])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {items.length > 0 && (
        <div className={s.stack}>
          {items.map(t => {
            const Icon = ICON[t.variant]
            return (
              <div key={t.id} className={`${s.toast} ${s[t.variant]}`} role={t.variant === 'error' ? 'alert' : 'status'}>
                <div className={s.iconWrap}><Icon size={16}/></div>
                <div className={s.content}>
                  <span className={s.title}>{t.title}</span>
                  {t.message && <span className={s.message}>{t.message}</span>}
                </div>
                <button className={s.close} onClick={() => dismiss(t.id)} aria-label="Dispensar">
                  <X size={11}/>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast precisa estar dentro de <ToastProvider>')
  return ctx
}
