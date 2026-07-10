'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { useBreadcrumbLabels } from './BreadcrumbContext'
import s from './breadcrumb.module.css'

const LABELS: Record<string, string> = {
  dashboard:     'início',
  documentos:    'documentos',
  novo:          'novo',
  editar:        'editar',
  coordenacao:   'equipe',
  consideracoes: 'considerações',
  devolutivas:   'devolutivas',
  oe:            'orientação de estudos',
  suporte:       'suporte',
  lixeira:       'lixeira',
}

export function Breadcrumb() {
  const pathname = usePathname()
  const dynamicLabels = useBreadcrumbLabels()
  const segments = pathname.split('/').filter(Boolean)

  const crumbs = segments.map((seg, i) => {
    const href = '/' + segments.slice(0, i + 1).join('/')
    const label = dynamicLabels[seg] ?? LABELS[seg] ?? seg
    const isLast = i === segments.length - 1
    const isDynamicSeg = /^\d+$/.test(seg)
    return { label, href, isLast, isDynamicSeg }
  })

  return (
    <nav className={s.crumbs} aria-label="breadcrumb">
      {crumbs.map((c, i) => (
        <span key={c.href} className={s.crumb}>
          {i > 0 && <ChevronRight size={13} className={s.sep} />}
          {c.isLast || c.isDynamicSeg ? (
            <span className={`${s.label} ${c.isLast ? s.current : ''}`}>{c.label}</span>
          ) : (
            <Link href={c.href} className={s.label}>{c.label}</Link>
          )}
        </span>
      ))}
    </nav>
  )
}
