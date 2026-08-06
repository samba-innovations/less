'use client'

import { Tooltip } from './Tooltip'
import { relativeDate } from '@/lib/relative-date'

// RelativeDate — mostra a data de forma relativa ("há 3 dias") e, no hover,
// a data/hora completa. Uso: <RelativeDate date={t.createdAt} />
export function RelativeDate({ date }: { date: string | Date | null | undefined }) {
  if (!date) return <>—</>
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return <>—</>
  return (
    <Tooltip content={d.toLocaleString('pt-BR')} size="sm">
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{relativeDate(date)}</span>
    </Tooltip>
  )
}
