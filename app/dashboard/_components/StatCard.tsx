'use client'

import { memo, type ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import s from './stat-card.module.css'

// StatCard — card de estatística para dashboards (KPI).
// Substitui ~130 variantes: statValue, statLabel, statCard, kpi,
// kpiValue, kpiLabel, kpiSub, statCard, summary…
//
// Estrutura:
//  [ícone opcional] label
//  VALOR grande
//  sub-texto opcional / trend (↑ +12% vs ontem)
//
// Variants (afeta cor do accent e ícone):
//  - neutral  : fg
//  - brand    : cor do sistema
//  - success  : verde
//  - warning  : âmbar
//  - danger   : vermelho
//
// Tone:
//  - filled    : fundo brand-alpha, accent brand
//  - outlined  : borda + fundo bg (padrão)
//  - subtle    : sem borda, fundo surface

type Variant = 'neutral' | 'brand' | 'success' | 'warning' | 'danger'
type Tone    = 'filled' | 'outlined' | 'subtle'
type Size    = 'sm' | 'md' | 'lg'

type Trend = {
  value:  number   // +12, -3.5
  label?: string   // "vs ontem", "vs semana passada"
}

type Props = {
  label:      string
  value:      ReactNode          // "42", "R$ 1.230", "89%"
  sub?:       ReactNode          // sub-texto abaixo do valor
  icon?:      ReactNode
  trend?:     Trend
  variant?:   Variant
  tone?:      Tone
  size?:      Size
  onClick?:   () => void
  href?:      string             // se link, componente vira <a>
  className?: string
}

function StatCardImpl({
  label, value, sub, icon, trend,
  variant = 'neutral', tone = 'outlined', size = 'md',
  onClick, href, className,
}: Props) {
  const cls = [
    s.card,
    s[variant],
    s[tone],
    s[size],
    (onClick || href) ? s.clickable : '',
    className ?? '',
  ].filter(Boolean).join(' ')

  const content = (
    <>
      <div className={s.head}>
        {icon && <span className={s.icon}>{icon}</span>}
        <span className={s.label}>{label}</span>
      </div>
      <div className={s.value}>{value}</div>
      {(sub || trend) && (
        <div className={s.footer}>
          {trend && (
            <span className={`${s.trend} ${trend.value > 0 ? s.trendUp : trend.value < 0 ? s.trendDown : s.trendFlat}`}>
              {trend.value > 0 ? <TrendingUp size={11} /> : trend.value < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
              {trend.value > 0 ? '+' : ''}{trend.value}%
              {trend.label && <span className={s.trendLabel}>{trend.label}</span>}
            </span>
          )}
          {sub && <span className={s.sub}>{sub}</span>}
        </div>
      )}
    </>
  )

  if (href) {
    return (
      <a href={href} className={cls}>
        {content}
      </a>
    )
  }
  if (onClick) {
    return (
      <button type="button" className={cls} onClick={onClick}>
        {content}
      </button>
    )
  }
  return (
    <div className={cls}>
      {content}
    </div>
  )
}

export const StatCard = memo(StatCardImpl)
