'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Loader2 } from 'lucide-react'
import s from './input-dialog.module.css'
import { Button } from '../_components/Button'
import { IconButton } from '../_components/IconButton'

type Props = {
  open:        boolean
  title:       string
  description?: string
  placeholder?: string
  initialValue?: string
  submitLabel?: string
  cancelLabel?: string
  required?:    boolean
  rows?:        number
  onCancel:    () => void
  onSubmit:    (value: string) => void | Promise<void>
}

// Substitui window.prompt() com estilo do sistema. Rows > 1 vira textarea.
// Enter (sem shift) envia; Esc cancela.
export function InputDialog({
  open, title, description, placeholder, initialValue = '',
  submitLabel = 'confirmar', cancelLabel = 'cancelar', required = true,
  rows = 3, onCancel, onSubmit,
}: Props) {
  const [value, setValue]     = useState(initialValue)
  const [submitting, setSubmitting] = useState(false)
  const inputRef              = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setValue(initialValue)
      setSubmitting(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open, initialValue])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onCancel() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  const canSubmit = !required || value.trim().length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || submitting) return
    setSubmitting(true)
    try { await onSubmit(value.trim()) }
    finally { setSubmitting(false) }
  }

  return (
    <div className={s.backdrop} onClick={onCancel} role="dialog" aria-modal="true">
      <div className={s.dialog} onClick={e => e.stopPropagation()}>
        <div className={s.head}>
          <div className={s.headText}>
            <span className={s.title}>{title}</span>
            {description && <span className={s.description}>{description}</span>}
          </div>
          <IconButton
            icon={<X size={14} />}
            label="Fechar"
            onClick={onCancel}
          />
        </div>

        <form onSubmit={handleSubmit} className={s.form}>
          <textarea
            ref={inputRef}
            className={s.input}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && rows === 1) {
                e.preventDefault()
                void handleSubmit(e as unknown as React.FormEvent)
              }
            }}
          />
          <div className={s.actions}>
            <Button
              variant="secondary"
              onClick={onCancel}
              disabled={submitting}
              type="button"
            >{cancelLabel}</Button>
            <Button
              variant="primary"
              disabled={!canSubmit || submitting}
              type="submit"
            >{submitting ? <Loader2 size={13} className={s.spin}/> : null}
              {submitLabel}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
