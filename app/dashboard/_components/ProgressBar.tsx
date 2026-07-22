'use client'

import { memo } from 'react'
import s from './progress-bar.module.css'

// ProgressBar — barra de progresso padrão.
// Substitui ~41 variantes: progressFill, progressBar, progress,
// phaseBar, phaseBarFill, barFill…
//
// Features:
//  - value + max (padrão 100)
//  - variant: brand | success | warning | danger | auto (baseado em %)
//  - showLabel: mostra "N%" ao lado
//  - showValue: mostra "N/M" (útil pra passos)
//  - striped: listras visuais
//  - animated: pulso sutil (útil pra indicar "processando")
//  - size: sm | md | lg
//  - indeterminate: barra deslizante quando não sabe valor
//
// Uso:
//   <ProgressBar value={45} showLabel />
//   <ProgressBar value={3} max={7} showValue variant="brand" />
//   <ProgressBar indeterminate variant="brand" />

type Variant = 'brand' | 'success' | 'warning' | 'danger' | 'auto'
type Size    = 'sm' | 'md' | 'lg'

type Props = {
  value?:         number
  max?:           number
  variant?:       Variant
  size?:          Size
  showLabel?:     boolean
  showValue?:     boolean
  striped?:       boolean
  animated?:      boolean
  indeterminate?: boolean
  className?:     string
  label?:         string        // texto acima da barra
  ariaLabel?:     string
}

function autoVariant(pct: number): 'success' | 'brand' | 'warning' | 'danger' {
  if (pct >= 100) return 'success'
  if (pct >= 75)  return 'brand'
  if (pct >= 40)  return 'warning'
  return 'danger'
}

function ProgressBarImpl({
  value = 0, max = 100,
  variant = 'brand', size = 'md',
  showLabel, showValue, striped, animated, indeterminate,
  className, label, ariaLabel,
}: Props) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const resolvedVariant = variant === 'auto' ? autoVariant(pct) : variant

  const barCls = [
    s.wrap,
    s[size],
    s[resolvedVariant],
    striped ? s.striped : '',
    animated ? s.animated : '',
    indeterminate ? s.indeterminate : '',
    className ?? '',
  ].filter(Boolean).join(' ')

  return (
    <div className={s.root}>
      {(label || showLabel || showValue) && (
        <div className={s.head}>
          {label && <span className={s.label}>{label}</span>}
          {(showLabel || showValue) && (
            <span className={s.headValue}>
              {showValue ? `${value}/${max}` : `${Math.round(pct)}%`}
            </span>
          )}
        </div>
      )}
      <div
        className={barCls}
        role="progressbar"
        aria-label={ariaLabel ?? label}
        aria-valuenow={indeterminate ? undefined : value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={s.fill}
          style={{ width: indeterminate ? undefined : `${pct}%` }}
        />
      </div>
    </div>
  )
}

export const ProgressBar = memo(ProgressBarImpl)
