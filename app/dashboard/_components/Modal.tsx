'use client'

import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import s from './modal.module.css'

type Props = {
  title:    string
  subtitle?: string
  onClose:  () => void
  children: React.ReactNode
  size?:    'sm' | 'md' | 'lg'
}

export function Modal({ title, subtitle, onClose, children, size = 'md' }: Props) {
  const [mounted, setMounted]  = useState(false)
  const [closing, setClosing]  = useState(false)

  const handleClose = useCallback(() => {
    setClosing(true)
    setTimeout(onClose, 190)
  }, [onClose])

  useEffect(() => {
    setMounted(true)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [handleClose])

  if (!mounted) return null

  return createPortal(
    <div
      className={`${s.overlay} ${closing ? s.overlayClosing : ''}`}
      onMouseDown={e => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className={`${s.panel} ${s[size]} ${closing ? s.panelClosing : ''}`}>

        <div className={s.header}>
          <div className={s.headerAccent} />
          <div className={s.headerTop}>
            <div className={s.headerLeft}>
              <h2 className={s.title}>{title}</h2>
              {subtitle && <p className={s.subtitle}>{subtitle}</p>}
            </div>
            <button className={s.close} onClick={handleClose} aria-label="Fechar">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className={s.body}>
          {children}
        </div>

      </div>
    </div>,
    document.body
  )
}

export { s as ms }
