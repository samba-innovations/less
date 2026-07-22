'use client'

/**
 * Toast simples de erro — position: fixed no bottom-right.
 * Auto-fecha em 5s ou manual via X.
 */

import { useEffect } from 'react'
import { X, AlertCircle } from 'lucide-react'

type Props = { msg: string | null; onDismiss: () => void; autoCloseMs?: number }

export function ErrorToast({ msg, onDismiss, autoCloseMs = 5000 }: Props) {
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(onDismiss, autoCloseMs)
    return () => clearTimeout(t)
  }, [msg, onDismiss, autoCloseMs])

  if (!msg) return null
  return (
    <div
      style={{
        position:      'fixed',
        bottom:        '1.25rem',
        right:         '1.25rem',
        zIndex:        9999,
        display:       'flex',
        alignItems:    'center',
        gap:           '0.625rem',
        maxWidth:      '360px',
        padding:       '0.625rem 0.875rem',
        borderRadius:  '10px',
        border:        '1px solid rgba(220,38,38,0.35)',
        background:    'rgba(220,38,38,0.10)',
        color:         '#dc2626',
        fontSize:      '0.8125rem',
        fontWeight:    600,
        boxShadow:     '0 8px 24px rgba(0,0,0,0.12)',
        animation:     'errToastIn 0.24s cubic-bezier(0.22, 1, 0.36, 1) both',
      }}
      role="alert"
    >
      <AlertCircle size={16} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0 }}>{msg}</span>
      <button
        onClick={onDismiss}
        style={{
          display:       'inline-flex',
          alignItems:    'center',
          justifyContent: 'center',
          width:         18,
          height:        18,
          border:        'none',
          background:    'rgba(220,38,38,0.15)',
          borderRadius:  '50%',
          color:         '#dc2626',
          cursor:        'pointer',
          flexShrink:    0,
        }}
        aria-label="fechar"
      >
        <X size={11} strokeWidth={2.5} />
      </button>
      <style>{`
        @keyframes errToastIn {
          from { opacity: 0; transform: translateY(8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
