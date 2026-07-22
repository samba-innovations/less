'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Clock, ChevronRight } from 'lucide-react'
import s from './recent-activity.module.css'

type ActivityItem = {
  id:        number
  type:      string
  title:     string
  body:      string
  link:      string | null
  system:    string | null
  priority:  string
  createdAt: string
}

// RecentActivity — timeline das últimas notificações (cross-system) do user.
// Puxa do /api/notifications que já existe. Ideal em dashboards de managers.
export function RecentActivity({ limit = 8, systemFilter }: { limit?: number; systemFilter?: string }) {
  const [items, setItems]     = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const qs = new URLSearchParams({ limit: String(limit) })
    if (systemFilter) qs.set('system', systemFilter)
    fetch(`/api/notifications?${qs}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setItems(data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [limit, systemFilter])

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'agora'
    if (m < 60) return `${m}min`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h`
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }

  if (loading) return (
    <div className={s.wrap}>
      <div className={s.head}><Clock size={13}/> <span>atividade recente</span></div>
      <div className={s.list}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={s.rowSkeleton} />
        ))}
      </div>
    </div>
  )

  if (items.length === 0) return (
    <div className={s.wrap}>
      <div className={s.head}><Clock size={13}/> <span>atividade recente</span></div>
      <div className={s.empty}>nenhuma atividade nas últimas 24h</div>
    </div>
  )

  return (
    <div className={s.wrap}>
      <div className={s.head}>
        <span className={s.headLeft}><Clock size={13}/> atividade recente</span>
      </div>
      <div className={s.list}>
        {items.map(item => (
          <Link
            key={item.id}
            href={item.link ?? '#'}
            className={`${s.row} ${item.priority === 'URGENT' ? s.urgent : ''} ${item.priority === 'HIGH' ? s.high : ''}`}
          >
            <div className={s.rowInfo}>
              <div className={s.rowHead}>
                {item.system && <span className={s.system} data-system={item.system}>{item.system}</span>}
                <span className={s.title}>{item.title}</span>
              </div>
              <span className={s.body}>{item.body}</span>
            </div>
            <div className={s.rowRight}>
              <span className={s.time}>{timeAgo(item.createdAt)}</span>
              <ChevronRight size={12} className={s.arrow}/>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
