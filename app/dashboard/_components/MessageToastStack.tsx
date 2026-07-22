'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { MessageCircle, X } from 'lucide-react'
import s from './message-toast.module.css'
import { Avatar } from '../_components/Avatar'

type MsgEvent = {
  id:              number
  threadId:        number
  senderId:        number
  senderName:      string
  senderAvatarUrl: string | null
  body:            string
  createdAt:       string
}

type Toast = MsgEvent

const DURATION_MS   = 6_500
const MAX_STACK     = 3
const EXIT_MS       = 240

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?'
}

// Toast individual com timer próprio: hover pausa, progress bar mostra tempo,
// exit animation antes de sumir. Padrão espelhado do NotificationBell mas
// visualmente distinto (top-right, avatar, sem action buttons).
function MessageToast({ toast, onDismiss, onOpen }: {
  toast:     Toast
  onDismiss: (id: number) => void
  onOpen:    (t: Toast) => void
}) {
  const [progress, setProgress] = useState(0)
  const [exiting, setExiting]   = useState(false)
  const pausedRef               = useRef(false)
  const elapsedRef              = useRef(0)
  const lastFrameRef            = useRef(0)

  useEffect(() => {
    let raf = 0
    function tick(now: number) {
      if (!lastFrameRef.current) lastFrameRef.current = now
      const dt = now - lastFrameRef.current
      lastFrameRef.current = now
      if (!pausedRef.current) {
        elapsedRef.current += dt
        const p = Math.min(1, elapsedRef.current / DURATION_MS)
        setProgress(p)
        if (elapsedRef.current >= DURATION_MS) {
          setExiting(true)
          setTimeout(() => onDismiss(toast.id), EXIT_MS)
          return
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [toast.id, onDismiss])

  const dismissAnim = useCallback(() => {
    setExiting(true)
    setTimeout(() => onDismiss(toast.id), EXIT_MS)
  }, [toast.id, onDismiss])

  return (
    <div
      className={`${s.toast} ${exiting ? s.exiting : ''}`}
      role="alert"
      onMouseEnter={() => { pausedRef.current = true }}
      onMouseLeave={() => { pausedRef.current = false }}
      onClick={() => { dismissAnim(); onOpen(toast) }}
    >
      <div className={s.avatar}>
        {toast.senderAvatarUrl
          ? <Avatar name={toast.senderName} url={toast.senderAvatarUrl} />
          : initials(toast.senderName)}
      </div>
      <div className={s.content}>
        <div className={s.head}>
          <MessageCircle size={10} className={s.msgIcon}/>
          <span className={s.sender}>{toast.senderName}</span>
        </div>
        <span className={s.body}>{toast.body}</span>
      </div>
      <button
        className={s.close}
        onClick={(e) => { e.stopPropagation(); dismissAnim() }}
        aria-label="Dispensar"
      >
        <X size={11}/>
      </button>
      <div className={s.progressBar}>
        <div className={s.progressFill} style={{ transform: `scaleX(${1 - progress})` }}/>
      </div>
    </div>
  )
}

// Container ouve SSE 'message' e renderiza stack. Emite evento customizado
// 'samba:open-messages-thread' quando user clica pra abrir — o MessagesWidget
// escuta e abre o thread correto.
export function MessageToastStack() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const es = new EventSource('/api/notifications/stream')
    es.addEventListener('message', (e) => {
      try {
        const raw = JSON.parse(e.data) as MsgEvent
        // Sender name + avatar já vêm no envelope (trigger DB inclui)
        setToasts(prev => {
          if (prev.some(p => p.id === raw.id)) return prev
          return [raw, ...prev].slice(0, MAX_STACK)
        })
      } catch { /* ignore */ }
    })
    return () => es.close()
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const openThread = useCallback((t: Toast) => {
    window.dispatchEvent(new CustomEvent('samba:open-messages-thread', { detail: { threadId: t.threadId } }))
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className={s.stack} role="region" aria-label="Mensagens novas">
      {toasts.map(t => (
        <MessageToast key={t.id} toast={t} onDismiss={dismiss} onOpen={openThread}/>
      ))}
    </div>
  )
}
