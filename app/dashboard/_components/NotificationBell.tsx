'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Bell, CheckCheck, BellOff } from 'lucide-react'
import { playSound } from '@/lib/sounds'
import s from './notification-bell.module.css'
import { Chip } from '../_components/Chip'

type Notif = {
  id:        number
  type:      string
  title:     string
  body:      string
  link:      string | null
  read:      boolean
  createdAt: string
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'agora'
  if (m < 60) return `${m}min atrás`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h atrás`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function NotificationBell() {
  const [open, setOpen]       = useState(false)
  const [notifs, setNotifs]   = useState<Notif[]>([])
  const [loading, setLoading] = useState(true)
  const wrapRef               = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then((data: Notif[]) => { setNotifs(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    const es = new EventSource('/api/notifications/stream')
    es.addEventListener('notification', (e) => {
      const n = JSON.parse(e.data) as Notif & { system?: string }
      if (n.system && n.system !== 'less') return
      setNotifs(prev => [n, ...prev])
      playSound('less')
      window.dispatchEvent(new CustomEvent('samba:notification', { detail: n }))
    })
    es.addEventListener('school_event', (e) => {
      const d = JSON.parse(e.data)
      window.dispatchEvent(new CustomEvent('samba:live', { detail: d }))
    })
    es.onerror = () => {}
    return () => es.close()
  }, [])

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const unread = notifs.filter(n => !n.read).length

  const markOne = useCallback(async (id: number) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
  }, [])

  const markAll = useCallback(async () => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
    await fetch('/api/notifications', { method: 'PATCH' })
  }, [])

  return (
    <div ref={wrapRef} className={s.wrap}>
      <button
        className={`${s.bell} ${unread > 0 ? s.bellActive : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-label="Notificações"
        title="Notificações"
      >
        <Bell size={17} />
        {unread > 0 && (
          <Chip>{unread > 9 ? '9+' : unread}</Chip>
        )}
      </button>

      {open && (
        <div className={s.panel}>
          <div className={s.panelHead}>
            <span className={s.panelTitle}>notificações</span>
            {unread > 0 && (
              <button className={s.markAll} onClick={markAll} title="Marcar todas como lidas">
                <CheckCheck size={13} />
                marcar todas
              </button>
            )}
          </div>

          <div className={s.list}>
            {loading ? (
              <div className={s.empty}>carregando...</div>
            ) : notifs.length === 0 ? (
              <div className={s.empty}>
                <BellOff size={22} strokeWidth={1.5} />
                <span>nenhuma notificação</span>
              </div>
            ) : (
              notifs.map(n => (
                <button
                  key={n.id}
                  className={`${s.item} ${!n.read ? s.itemUnread : ''}`}
                  onClick={() => markOne(n.id)}
                >
                  <span className={`${s.dot} ${!n.read ? s.dotUnread : ''}`} />
                  <div className={s.itemBody}>
                    <span className={s.itemTitle}>{n.title}</span>
                    <span className={s.itemText}>{n.body}</span>
                    <span className={s.itemTime}>{timeAgo(n.createdAt)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
