'use client'

import { memo, useMemo, useState } from 'react'
import s from './avatar.module.css'
import { formatName, initialsFromName } from '@/lib/format-name'

// Avatar — foto de usuário/aluno com fallback em iniciais.
// Substitui as ~148 variantes espalhadas (avatarImg, avatar, avatarFb,
// avatarFallback, avatarWrap, avatarLg, avatarBox…).
//
// Features:
//  - foto se url válida
//  - fallback: iniciais + cor determinística baseada no nome
//  - dot de presence (online/offline/busy/away)
//  - 4 tamanhos (sm/md/lg/xl)
//  - shape circle/square
//  - onError automático → fallback
//
// Uso simples:
//   <Avatar name="Marcos Afonso" url={user.photoUrl} />
//
// Com presença:
//   <Avatar name="Ana" url={photo} presence="online" size="lg" />
//
// Só iniciais (sem tentar url):
//   <Avatar name="Prof. Silva" />

type Size     = 'sm' | 'md' | 'lg' | 'xl'
type Presence = 'online' | 'offline' | 'busy' | 'away'
type Shape    = 'circle' | 'square'

type Props = {
  name:       string
  url?:       string | null
  size?:      Size
  presence?:  Presence
  shape?:     Shape
  className?: string
  onClick?:   () => void
  title?:     string
}

// Cor determinística: sempre a mesma cor pra um dado nome
const PALETTE = [
  '#0053D4', '#00577a', '#5e2c9c', '#00875a', '#b06d00',
  '#c62828', '#00838f', '#6a1b9a', '#2e7d32', '#e65100',
]

function colorFromName(name: string): string {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return PALETTE[h % PALETTE.length]
}

function AvatarImpl({
  name, url, size = 'md', presence, shape = 'circle',
  className, onClick, title,
}: Props) {
  const [failed, setFailed] = useState(false)
  const displayName = useMemo(() => formatName(name), [name])
  const initials    = useMemo(() => initialsFromName(name), [name])
  const bgColor     = useMemo(() => colorFromName(name), [name])

  const showImage = url && !failed
  const clickable = Boolean(onClick)

  const cls = [
    s.wrap,
    s[size],
    shape === 'square' ? s.square : '',
    clickable ? s.clickable : '',
    className ?? '',
  ].filter(Boolean).join(' ')

  return (
    <span
      className={cls}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={title ?? displayName}
      style={showImage ? undefined : { background: bgColor }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={displayName}
          className={s.img}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className={s.initials}>{initials}</span>
      )}
      {presence && (
        <span
          className={`${s.presence} ${s[presence]}`}
          aria-label={presence}
          title={presence}
        />
      )}
    </span>
  )
}

export const Avatar = memo(AvatarImpl)
