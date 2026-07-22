import s from './skeleton.module.css'

// Skeleton placeholder pra estados de loading. Aditivo — sistemas adotam
// gradualmente. Uso: <Skeleton width="60%" height={20} /> ou <SkeletonText lines={3} />

type Props = {
  width?:   string | number
  height?:  string | number
  radius?:  string | number
  className?: string
}

function toSize(v: string | number | undefined, fallback: string) {
  if (v === undefined) return fallback
  return typeof v === 'number' ? `${v}px` : v
}

export function Skeleton({ width, height, radius = 6, className }: Props) {
  return (
    <span
      className={`${s.block} ${className ?? ''}`}
      style={{
        width:        toSize(width, '100%'),
        height:       toSize(height, '16px'),
        borderRadius: toSize(radius, '6px'),
      }}
      aria-hidden="true"
    />
  )
}

// Bloco de N linhas — última é 80% pra parecer natural
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <span className={`${s.text} ${className ?? ''}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={12} width={i === lines - 1 ? '75%' : '100%'} />
      ))}
    </span>
  )
}

// Card genérico — avatar + 2 linhas
export function SkeletonCard() {
  return (
    <span className={s.card} aria-hidden="true">
      <Skeleton width={32} height={32} radius="50%" />
      <span className={s.cardText}>
        <Skeleton height={14} width="55%" />
        <Skeleton height={11} width="90%" />
      </span>
    </span>
  )
}
