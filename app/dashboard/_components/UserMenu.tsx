'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { LogOut, ChevronDown, Settings } from 'lucide-react'
import s from './user-menu.module.css'
import { Avatar } from '../_components/Avatar'
import { formatName } from '@/lib/format-name'

type Props = {
  name:       string
  roleLabel:  string
  avatarUrl:  string | null
  initials:   string
  hubUrl:     string
}

export function UserMenu({ name: rawName, roleLabel, avatarUrl, initials, hubUrl }: Props) {
  const name = formatName(rawName)
  const [open, setOpen]             = useState(false)
  const [avatarFailed, setAvFailed] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={s.wrap} ref={ref}>
      <button className={`${s.trigger} ${open ? s.triggerOpen : ''}`} onClick={() => setOpen(v => !v)}>
        <div className={s.text}>
          <span className={s.name}>{name}</span>
          <span className={s.role}>{roleLabel}</span>
        </div>
        <div className={s.avatar}>
          {avatarUrl && !avatarFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <Avatar name="" url={avatarUrl} />
          ) : (
            <span className={s.avatarFb}>{initials}</span>
          )}
        </div>
        <ChevronDown size={12} className={`${s.chev} ${open ? s.chevOpen : ''}`} />
      </button>

      {open && (
        <div className={s.menu}>
          <div className={s.menuHeader}>
            <div className={s.avatarLg}>
              {avatarUrl && !avatarFailed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <Avatar name="" url={avatarUrl} />
              ) : (
                <span className={s.avatarFb}>{initials}</span>
              )}
            </div>
            <div className={s.headerText}>
              <span className={s.hName}>{name}</span>
              <span className={s.hRole}>{roleLabel}</span>
            </div>
          </div>

          <div className={s.divider} />

          <Link href="/dashboard/preferencias" className={s.item} onClick={() => setOpen(false)}>
            <Settings size={15} />
            <span>preferências</span>
          </Link>

          <div className={s.divider} />

          <a href={hubUrl} className={s.item}>
            <LogOut size={15} />
            <span>sair do sistema</span>
          </a>
        </div>
      )}
    </div>
  )
}
