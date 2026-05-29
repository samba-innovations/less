'use client'

import { Calendar } from 'lucide-react'
import s from './period-chip.module.css'

type Props = {
  year:     number | null
  bimester: number | null
}

export function PeriodChip({ year, bimester }: Props) {
  if (!year) return null
  return (
    <div className={s.chip} title="Ano letivo e bimestre ativos">
      <Calendar size={12} className={s.icon} />
      <span className={s.year}>{year}</span>
      {bimester && (
        <>
          <span className={s.dot}>·</span>
          <span className={s.bim}>{bimester}º bim</span>
        </>
      )}
    </div>
  )
}
