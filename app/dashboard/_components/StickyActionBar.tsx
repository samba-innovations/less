'use client'

import type { ReactNode } from 'react'
import s from './sticky-action-bar.module.css'

type Props = {
  children: ReactNode
  align?:   'left' | 'right' | 'space-between'
}

// StickyActionBar — barra de ações que gruda no fim do container (dentro de
// Modal, form, panel). Sempre visível — não some ao scrollar content longo.
// Respeita safe-area em iOS.
export function StickyActionBar({ children, align = 'right' }: Props) {
  return (
    <div className={`${s.bar} ${s[align]}`}>
      {children}
    </div>
  )
}
