'use client'

import { useState, useEffect, useRef, type ReactNode, type MouseEvent as ReactMouseEvent } from 'react'
import { createPortal } from 'react-dom'
import s from './context-menu.module.css'

type MenuItem = {
  label:  string
  icon?:  ReactNode
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}

type Props = {
  items:    MenuItem[]
  children: (props: { onContextMenu: (e: ReactMouseEvent) => void }) => ReactNode
}

// ContextMenu — menu contextual (right-click) genérico. Passa render props
// pra o container. Ex:
// <ContextMenu items={[...]}>
//   {({ onContextMenu }) => <tr onContextMenu={onContextMenu}>...</tr>}
// </ContextMenu>
export function ContextMenu({ items, children }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const menuRef       = useRef<HTMLDivElement>(null)

  function onContextMenu(e: ReactMouseEvent) {
    e.preventDefault()
    setPos({ x: e.clientX, y: e.clientY })
  }

  useEffect(() => {
    if (!pos) return
    function onDown(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setPos(null)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setPos(null) }
    function onScroll() { setPos(null) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [pos])

  // Ajuste pra não sair da viewport
  const adjustedStyle = pos ? (() => {
    const menuW = 200, menuH = items.length * 32 + 16
    const vw = typeof window !== 'undefined' ? window.innerWidth : 0
    const vh = typeof window !== 'undefined' ? window.innerHeight : 0
    return {
      left: Math.min(pos.x, vw - menuW - 8),
      top:  Math.min(pos.y, vh - menuH - 8),
    }
  })() : {}

  // Renderiza o menu via portal — necessário quando o trigger está dentro
  // de <tbody>/<tr>, pois HTML não aceita <div> como filho de <tbody>.
  // typeof document check garante SSR safety.
  const menu = pos && typeof document !== 'undefined' ? createPortal(
    <div
      ref={menuRef}
      className={s.menu}
      style={adjustedStyle}
      role="menu"
    >
      {items.map((item, i) => (
        <button
          key={i}
          className={`${s.item} ${item.danger ? s.danger : ''}`}
          onClick={() => { item.onClick(); setPos(null) }}
          disabled={item.disabled}
          role="menuitem"
        >
          {item.icon && <span className={s.icon}>{item.icon}</span>}
          <span>{item.label}</span>
        </button>
      ))}
    </div>,
    document.body,
  ) : null

  return (
    <>
      {children({ onContextMenu })}
      {menu}
    </>
  )
}
