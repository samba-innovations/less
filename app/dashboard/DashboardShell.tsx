'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FileText, FilePlus, Users, Compass,
  HelpCircle, Sun, Moon, Rows3, Rows2, LogOut, PanelLeft, Menu, X, MessageSquare, Layers, BookMarked, FileBarChart2, ClipboardList, Settings,
} from 'lucide-react'
import type { JwtPayload } from '@/lib/jwt'
import { formatName } from '@/lib/format-name'
import { isManager, effectiveRole } from '@/lib/jwt'
import { formatName } from '@/lib/format-name'
import { NotificationBell } from './_components/NotificationBell'
import { useDensity } from './_components/useDensity'
import { SupportWidget } from './_components/SupportWidget'
import { MessagesWidget } from './_components/MessagesWidget'
import { MessageToastStack } from './_components/MessageToastStack'
import { LoadingBar } from './_components/LoadingBar'
import { KeyboardShortcuts } from './_components/KeyboardShortcuts'
import { PWAInstallBanner } from './_components/PWAInstallBanner'
import { ErrorBoundary } from './_components/ErrorBoundary'
import { SpotlightTour } from './_components/SpotlightTour'
import { Breadcrumb } from './_components/Breadcrumb'
import { BreadcrumbProvider } from './_components/BreadcrumbContext'
import { PeriodChip } from './_components/PeriodChip'
import { CommandPaletteTrigger } from './_components/CommandPalette'
import { StudentLookup } from './_components/StudentLookup'
import s from './shell.module.css'
import { IconButton } from './_components/IconButton'
import { Avatar } from './_components/Avatar'

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
  { label: 'meus documentos', href: '/dashboard/documentos',        icon: FileText      },
  { label: 'novo documento',  href: '/dashboard/documentos/novo',   icon: FilePlus      },
  { label: 'devolutivas',     href: '/dashboard/devolutivas',       icon: MessageSquare },
  { label: 'orient. estudos', href: '/dashboard/oe',                icon: BookMarked    },
  { label: 'relatório-síntese', href: '/dashboard/relatorio-sintese', icon: FileBarChart2 },
]

const NAV_COORDENACAO: NavItem[] = [
  { label: 'equipe',            href: '/dashboard/coordenacao',       icon: Users        },
  { label: 'diagnóstico turma', href: '/dashboard/diagnostico-turma', icon: ClipboardList },
  { label: 'considerações',     href: '/dashboard/consideracoes',     icon: Layers       },
]

const NAV_SUPORTE: NavItem[] = [
  { label: 'suporte',         href: '/dashboard/suporte',           icon: HelpCircle },
]

type Props = {
  payload:  JwtPayload
  user:     { name: string; avatarUrl: string | null } | null
  children: React.ReactNode
  activeYear:      number | null
  currentBimester: number | null
}

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard'
  if (href === '/dashboard/documentos/novo') return pathname === '/dashboard/documentos/novo'
  if (href === '/dashboard/documentos') {
    return pathname.startsWith('/dashboard/documentos') && !pathname.startsWith('/dashboard/documentos/novo')
  }
  return pathname.startsWith(href)
}

export function DashboardShell({ payload, user, children, activeYear, currentBimester }: Props) {
  const pathname = usePathname()
  const density = useDensity()
  const [dark, setDark]               = useState(false)
  const [collapsed, setCollapsed]     = useState(false)
  const [mobileOpen, setMobileOpen]   = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef                     = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!userMenuOpen) return
    function onClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setUserMenuOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [userMenuOpen])
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

  const isManagerUser = isManager(effectiveRole(payload))
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
    <BreadcrumbProvider>
    <div className={s.shell}>
      <a href="#main-content" className="samba-skip-link">pular pro conteúdo</a>

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
      <div id="main-content" className={s.main}>

        <header className={s.topbar}>
          <div className={s.topbarLeft}>
            <button className={s.hamburger} onClick={() => setMobileOpen(true)} aria-label="Menu">
              <Menu size={20} />
            </button>
            <button className={s.sidebarToggle} onClick={toggleSidebar} aria-label="Alternar sidebar">
              <PanelLeft size={20} />
            </button>
            <Breadcrumb />
          </div>


          <div className={s.topbarCenter}>
            <CommandPaletteTrigger />
          </div>
          <div className={s.topbarRight}>
            <PeriodChip year={activeYear} bimester={currentBimester} />
            {tourDone && (
              <IconButton
                icon={<Compass size={18} />}
                label="Explorar sistema"
                onClick={() => setTourActive(true)}
              />
            )}
            <button className={s.topbarBtn} onClick={density.toggle} aria-label="Alternar densidade" title={density.isCompact ? 'densidade confortável' : 'densidade compacta'}>
              {density.isCompact ? <Rows3 size={18} /> : <Rows2 size={18} />}
            </button>
            <button className={s.topbarBtn} onClick={toggleTheme} aria-label="Alternar tema">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <NotificationBell />

            <div className={s.userMenuWrap} ref={userMenuRef}>
              <button
                type="button"
                className={s.userInfo}
                onClick={() => setUserMenuOpen(v => !v)}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
              >
                <div className={s.userText}>
                  <span className={s.userName}>{formatName(user?.name) || 'usuário'}</span>
                  <span className={s.userRole}>{roleLabel}</span>
                </div>
                <div className={s.avatarWrap}>
                  {resolvedAvatarUrl && !avatarError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <Avatar name={user?.name ?? ''} url={resolvedAvatarUrl} />
                  ) : (
                    <span className={s.avatarFallback}>{initials}</span>
                  )}
                </div>
              </button>
              {userMenuOpen && (
                <div className={s.userDropdown} role="menu">
                  <Link
                    href="/dashboard/preferencias"
                    className={s.userDropdownItem}
                    onClick={() => setUserMenuOpen(false)}
                    role="menuitem"
                  >
                    <Settings size={14} />
                    <span>preferências</span>
                  </Link>
                  <div className={s.userDropdownDivider} />
                  <a href={hubUrl} className={s.userDropdownItem} role="menuitem">
                    <LogOut size={14} />
                    <span>sair do sistema</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className={s.content}>
          <div key={pathname} className={s.pageTransition}>
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
        <StudentLookup />

        <SupportWidget />
        <MessagesWidget />
        <MessageToastStack />
        <LoadingBar />
        <KeyboardShortcuts />
        <PWAInstallBanner />
        <SpotlightTour active={tourActive} onEnd={handleTourEnd} />
      </div>
    </div>
    </BreadcrumbProvider>
  )
}
