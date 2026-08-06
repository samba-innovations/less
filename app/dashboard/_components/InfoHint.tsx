'use client'

import { HelpCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Tooltip } from './Tooltip'
import s from './info-hint.module.css'

// InfoHint — mini-helper: um ícone de ajuda discreto ao lado de um termo pouco
// conhecido (ex.: RA, PEI, bimestre). No hover/focus mostra a explicação.
// Uso:  RA <InfoHint text="Registro do Aluno — número único do estudante." />
export function InfoHint({
  text, size = 13, className,
}: {
  text:       ReactNode
  size?:      number
  className?: string
}) {
  return (
    <Tooltip content={text} size="sm" position="top">
      <span
        className={`${s.hint} ${className ?? ''}`}
        tabIndex={0}
        role="button"
        aria-label={typeof text === 'string' ? text : 'ajuda'}
      >
        <HelpCircle size={size} />
      </span>
    </Tooltip>
  )
}
