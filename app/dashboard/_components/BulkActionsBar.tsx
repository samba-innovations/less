'use client'

import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import s from './bulk-actions-bar.module.css'

type Props = {
  count:   number
  onClear: () => void
  children: ReactNode  // botões de ação
}

// BulkActionsBar — barra flutuante que aparece quando há items selecionados
// numa lista. Fica no centro-inferior da tela. Ex:
// "12 selecionados · [Ativar] [Inativar] [Exportar] [X]"
export function BulkActionsBar({ count, onClear, children }: Props) {
  if (count === 0) return null
  return (
    <div className={s.bar} role="toolbar" aria-label={`${count} selecionados`}>
      <span className={s.count}>
        <span className={s.countNum}>{count}</span>
        selecionado{count === 1 ? '' : 's'}
      </span>
      <span className={s.divider} />
      <div className={s.actions}>
        {children}
      </div>
      <button className={s.clear} onClick={onClear} aria-label="Limpar seleção" title="Limpar seleção">
        <X size={13}/>
      </button>
    </div>
  )
}
