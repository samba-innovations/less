'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FileText, FilePlus, Users, Compass,
  HelpCircle, Sun, Moon, LogOut, PanelLeft, Menu, X,
} from 'lucide-react'
import type { JwtPayload } from '@/lib/jwt'
import { isManager } from '@/lib/jwt'
import { NotificationBell } from './_components/NotificationBell'
import { SupportWidget } from './_components/SupportWidget'
import { SpotlightTour } from './_components/SpotlightTour'
import s from './shell.module.css'

const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN ?? 'sambainnovations.local'
const TOUR_KEY = 'samba-less-tour-done'

const ROLE_PT: Record<string, string> = {
  PRINCIPAL:            'Diretor(a)',
  VICE_PRINCIPAL:       'Vice-Diretor(a)',
  COORDINATOR:          'Coordenador(a)',
  TEACHER_COORDINATOR:  'Prof. Coordenador(a)',
  TEACHER:              'Professor(a)',
  SECRETARY:            'Secretário(a)',
}

type NavItem = { label: string; href: string; icon: React.ElementType }

const NAV_PRINCIPAL: NavItem[] = [
  { label: 'início',           href: '/dashboard',                   icon: LayoutDashboard },
]

const NAV_DOCUMENTOS: NavItem[] = [
  { label: 'meus documentos', href: '/dashboard/documentos',        icon: FileText  },
  { label: 'novo documento',  href: '/dashboard/documentos/novo',   icon: FilePlus  },
]

const NAV_COORDENACAO: NavItem[] = [
  { label: 'equipe',          href: '/dashboard/coordenacao',       icon: Users     },
]

const NAV_SUPORTE: NavItem[] = [
  { label: 'suporte',         href: '/dashboard/suporte',           icon: HelpCircle },
]

type Props = {
  payload:  JwtPayload
  user:     { name: string; avatarUrl: string | null } | null
  children: React.ReactNode
}

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard'
  if (href === '/dashboard/documentos/novo') return pathname === '/dashboard/documentos/novo'
  if (href === '/dashboard/documentos') {
    return pathname.startsWith('/dashboard/documentos') && !pathname.startsWith('/dashboard/documentos/novo')
  }
  return pathname.startsWith(href)
}

export function DashboardShell({ payload, user, children }: Props) {
  const pathname = usePathname()
  const [dark, setDark]               = useState(false)
  const [collapsed, setCollapsed]     = useState(false)
  const [mobileOpen, setMobileOpen]   = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const [tourActive, setTourActive]   = useState(false)
  const [tourDone,   setTourDone]     = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('samba-theme')
    const isDark = saved ? saved === 'dark' : document.documentElement.classList.contains('dark')
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
    setCollapsed(localStorage.getItem('samba-sidebar-collapsed') === 'true')
  }, [])

  useEffect(() => {
    const done = localStorage.getItem(TOUR_KEY) === 'true'
    setTourDone(done)
    if (!done) {
      const id = setTimeout(() => setTourActive(true), 600)
      return () => clearTimeout(id)
    }
  }, [])

  function handleTourEnd() {
    setTourActive(false)
    setTourDone(true)
    localStorage.setItem(TOUR_KEY, 'true')
  }

  function toggleTheme() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('samba-theme', next ? 'dark' : 'light')
  }

  function toggleSidebar() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('samba-sidebar-collapsed', String(next))
  }

  const isManagerUser = isManager(payload.role) || payload.isAdmin
  const roleLabel     = payload.isAdmin ? 'Administrador(a)' : (ROLE_PT[payload.role] ?? payload.role)
  const initials      = user?.name
    ?.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('') ?? '?'

  const hubOrigin = payload.isAdmin
    ? `http://admin.${DOMAIN}`
    : `http://${payload.orgSlug}.${DOMAIN}`

  const hubUrl = `${hubOrigin}/painel`

  const resolvedAvatarUrl = user?.avatarUrl
    ? user.avatarUrl.startsWith('/')
      ? `${hubOrigin}${user.avatarUrl}`
      : user.avatarUrl
    : null

  function renderSection(items: NavItem[], label: string, col: boolean) {
    return (
      <div className={s.navSection}>
        {!col && <span className={s.navSectionLabel}>{label}</span>}
        {items.map(item => {
          const active = isActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${s.navItem} ${active ? s.navItemActive : ''} ${col ? s.navItemCollapsed : ''}`}
              onClick={() => setMobileOpen(false)}
              title={col ? item.label : undefined}
              data-tour={item.href.split('/').pop()}
            >
              <item.icon size={18} />
              {!col && <span>{item.label}</span>}
            </Link>
          )
        })}
      </div>
    )
  }

  function renderNav(forMobile = false) {
    const col = collapsed && !forMobile
    return (
      <div className={s.navScroll}>
        {renderSection(NAV_PRINCIPAL, 'principal', col)}
        {renderSection(NAV_DOCUMENTOS, 'documentos', col)}
        {isManagerUser && renderSection(NAV_COORDENACAO, 'coordenação', col)}
        {renderSection(NAV_SUPORTE, 'ajuda', col)}
      </div>
    )
  }

  function renderFooter(forMobile = false) {
    const col = collapsed && !forMobile
    return (
      <div className={s.sidebarFooter}>
        <a
          href={hubUrl}
          className={`${s.logoutBtn} ${col ? s.logoutBtnCollapsed : ''}`}
          title="Sair do sistema"
        >
          <LogOut size={16} />
          {!col && <span>sair do sistema</span>}
        </a>
      </div>
    )
  }

  return (
    <div className={s.shell}>

      {/* ── Desktop sidebar ── */}
      <aside className={`${s.sidebar} ${collapsed ? s.sidebarCollapsed : ''}`}>
        <div className={`${s.sidebarLogo} ${collapsed ? s.sidebarLogoCollapsed : ''}`}>
          {collapsed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/identidade/less-isotipo1.svg" alt="less" className={s.logoIso} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/identidade/less-logotipo1.svg" alt="less" className={s.logoFull} />
          )}
        </div>
        {renderNav()}
        {renderFooter()}
      </aside>

      {/* ── Mobile sidebar ── */}
      {mobileOpen && (
        <>
          <div className={s.overlay} onClick={() => setMobileOpen(false)} />
          <aside className={s.sidebarMobile}>
            <div className={s.sidebarLogo}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/identidade/less-logotipo1.svg" alt="less" className={s.logoFull} />
              <button className={s.mobileClose} onClick={() => setMobileOpen(false)}>
                <X size={20} />
              </button>
            </div>
            {renderNav(true)}
            {renderFooter(true)}
          </aside>
        </>
      )}

      {/* ── Main ── */}
      <div className={s.main}>

        <header className={s.topbar}>
          <div className={s.topbarLeft}>
            <button className={s.hamburger} onClick={() => setMobileOpen(true)} aria-label="Menu">
              <Menu size={20} />
            </button>
            <button className={s.sidebarToggle} onClick={toggleSidebar} aria-label="Alternar sidebar">
              <PanelLeft size={20} />
            </button>
            <div className={s.systemInfo}>
              <span className={s.systemName}>samba less</span>
              <span className={s.systemDesc}>geração de documentos</span>
            </div>
          </div>

          <div className={s.topbarRight}>
            {tourDone && (
              <button className={s.topbarBtn} onClick={() => setTourActive(true)} title="Explorar sistema" aria-label="Replay tour">
                <Compass size={18} />
              </button>
            )}
            <button className={s.topbarBtn} onClick={toggleTheme} aria-label="Alternar tema">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className={s.topbarDivider} />

            <NotificationBell />

            <div className={s.userInfo}>
              <div className={s.userText}>
                <span className={s.userName}>{user?.name ?? 'usuário'}</span>
                <span className={s.userRole}>{roleLabel}</span>
              </div>
              <div className={s.avatarWrap}>
                {resolvedAvatarUrl && !avatarError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolvedAvatarUrl}
                    alt={user?.name ?? ''}
                    className={s.avatarImg}
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <span className={s.avatarFallback}>{initials}</span>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className={s.content}>
          <div key={pathname} className={s.pageTransition}>
            {children}
          </div>
        </main>

        <SupportWidget />
        <SpotlightTour active={tourActive} onEnd={handleTourEnd} />
      </div>
    </div>
  )
}
