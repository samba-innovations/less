'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import s from './breadcrumb.module.css'

const LABELS: Record<string, string> = {
  'novo': 'novo',
  'dashboard': 'início',
  'documentos': 'documentos',
  'coordenacao': 'equipe',
  'suporte': 'suporte',
}

export function Breadcrumb() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)
  const crumbs = segments.map((seg, i) => {
    const href  = '/' + segments.slice(0, i + 1).join('/')
    const label = LABELS[seg] ?? seg
    const isLast = i === segments.length - 1
    return { label, href, isLast, isDynamic: /^\d+$/.test(seg) }
  })

  return (
    <nav className={s.crumbs} aria-label="breadcrumb">
      {crumbs.map((c, i) => (
        <span key={c.href} className={s.crumb}>
          {i > 0 && <ChevronRight size={13} className={s.sep} />}
          {c.isLast || c.isDynamic ? (
            <span className={`${s.label} ${c.isLast ? s.current : ''}`}>{c.label}</span>
          ) : (
            <Link href={c.href} className={s.label}>{c.label}</Link>
          )}
        </span>
      ))}
    </nav>
  )
}