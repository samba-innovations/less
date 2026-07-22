'use client'

import { memo, useState, type ReactNode } from 'react'
import { Info, CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react'
import s from './alert.module.css'

// Alert — banner de info/aviso/sucesso/erro.
// Substitui ~19 variantes espalhadas: banner, alert, noticeBox, infoBox,
// warningBox, alertText…
//
// Features:
//  - 4 variants: info | success | warning | danger
//  - ícone automático por variant (customizável)
//  - title + description
//  - dismissible (botão X + estado interno)
//  - actions (botões à direita)
//  - tone: filled (fundo) | outlined (borda) | subtle (fundo bg surface)
//  - size: sm | md
//
// Uso:
//   <Alert variant="success">salvo com sucesso</Alert>
//   <Alert variant="warning" title="Atenção" dismissible>...</Alert>
//   <Alert variant="danger" title="Erro" actions={<Button>tentar</Button>}>...</Alert>

type Variant = 'info' | 'success' | 'warning' | 'danger'
type Tone    = 'filled' | 'outlined' | 'subtle'
type Size    = 'sm' | 'md'

type Props = {
  children:     ReactNode
  variant?:     Variant
  tone?:        Tone
  size?:        Size
  title?:       string
  icon?:        ReactNode        // sobrepõe o ícone default
  dismissible?: boolean
  onDismiss?:   () => void
  actions?:     ReactNode        // botões à direita
  className?:   string
}

const DEFAULT_ICON: Record<Variant, ReactNode> = {
  info:    <Info size={16} />,
  success: <CheckCircle2 size={16} />,
  warning: <AlertTriangle size={16} />,
  danger:  <XCircle size={16} />,
}

function AlertImpl({
  children, variant = 'info', tone = 'subtle', size = 'md',
  title, icon, dismissible, onDismiss, actions, className,
}: Props) {
  const [visible, setVisible] = useState(true)
  if (!visible) return null

  const cls = [
    s.alert,
    s[variant],
    s[tone],
    s[size],
    className ?? '',
  ].filter(Boolean).join(' ')

  function dismiss() {
    setVisible(false)
    onDismiss?.()
  }

  return (
    <div className={cls} role={variant === 'danger' ? 'alert' : 'status'}>
      <span className={s.iconWrap} aria-hidden="true">
        {icon ?? DEFAULT_ICON[variant]}
      </span>
      <div className={s.body}>
        {title && <div className={s.title}>{title}</div>}
        <div className={s.desc}>{children}</div>
      </div>
      {actions && <div className={s.actions}>{actions}</div>}
      {dismissible && (
        <button
          type="button"
          className={s.dismiss}
          onClick={dismiss}
          aria-label="fechar aviso"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}

export const Alert = memo(AlertImpl)
