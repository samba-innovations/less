'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import s from './bottom-nav-mobile.module.css'

type NavItem = { label: string; href: string; icon: LucideIcon }

type Props = {
  items: NavItem[]
}

// BottomNavMobile — barra fixa embaixo em telas <=768px.
// Mostra top 5 destinos principais. Fácil alcance com polegar.
// Cada sistema passa suas próprias top 5.
export function BottomNavMobile({ items }: Props) {
  const pathname = usePathname()
  const visible = items.slice(0, 5)

  function isActive(href: string) {
    return href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href)
  }

  if (visible.length === 0) return null

  return (
    <nav className={s.nav} aria-label="navegação principal">
      {visible.map(item => {
        const active = isActive(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${s.item} ${active ? s.itemActive : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={18} strokeWidth={active ? 2.4 : 1.8} />
            <span className={s.label}>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
