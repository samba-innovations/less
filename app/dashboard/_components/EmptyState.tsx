import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import s from './empty-state.module.css'

type Props = {
  icon?:        LucideIcon
  title:        string
  description?: string
  action?:      ReactNode
  compact?:     boolean
}

// EmptyState universal — usa design tokens, ícone sutil, CTA opcional.
// Uso: <EmptyState icon={Users} title="Nenhum aluno cadastrado" description="..." action={<Button>...</Button>} />

export function EmptyState({ icon: Icon, title, description, action, compact }: Props) {
  return (
    <div className={`${s.wrap} ${compact ? s.compact : ''}`}>
      {Icon && (
        <div className={s.iconWrap}>
          <Icon size={compact ? 20 : 28} strokeWidth={1.5} />
        </div>
      )}
      <div className={s.textBlock}>
        <p className={s.title}>{title}</p>
        {description && <p className={s.description}>{description}</p>}
      </div>
      {action && <div className={s.action}>{action}</div>}
    </div>
  )
}
