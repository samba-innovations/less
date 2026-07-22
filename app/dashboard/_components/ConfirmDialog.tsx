'use client'

import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle } from 'lucide-react'
import s from './confirm-dialog.module.css'
import { Button } from '../_components/Button'

type Props = {
  open:          boolean
  title:         string
  description?:  string
  confirmLabel?: string
  isPending?:    boolean
  onConfirm:     () => void
  onCancel:      () => void
}

export function ConfirmDialog({
  open, title, description,
  confirmLabel = 'confirmar', isPending,
  onConfirm, onCancel,
}: Props) {
  const [rendered, setRendered] = useState(false)
  const [closing,  setClosing]  = useState(false)

  const handleClose = useCallback((cb: () => void) => {
    setClosing(true)
    setTimeout(() => { setRendered(false); setClosing(false); cb() }, 170)
  }, [])

  const handleCancel = useCallback(() => handleClose(onCancel), [handleClose, onCancel])
  const handleConfirm = useCallback(() => handleClose(onConfirm), [handleClose, onConfirm])

  useEffect(() => {
    if (open) {
      setRendered(true)
      setClosing(false)
    }
  }, [open])

  useEffect(() => {
    if (!rendered) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleCancel() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [rendered, handleCancel])

  if (!rendered) return null

  return createPortal(
    <div
      className={`${s.overlay} ${closing ? s.overlayClosing : ''}`}
      onMouseDown={e => { if (e.target === e.currentTarget) handleCancel() }}
    >
      <div className={`${s.panel} ${closing ? s.panelClosing : ''}`}>

        <div className={s.accentStrip} />

        <div className={s.body}>
          <div className={s.iconWrap}>
            <AlertTriangle size={22} />
          </div>
          <div className={s.content}>
            <h2 className={s.title}>{title}</h2>
            {description && <p className={s.description}>{description}</p>}
          </div>
        </div>

        <div className={s.actions}>
          <Button
            variant="secondary"
            onClick={handleCancel}
            disabled={isPending}
          >cancelar</Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={isPending}
          >{isPending ? 'aguarde...' : confirmLabel}</Button>
        </div>

      </div>
    </div>,
    document.body
  )
}
