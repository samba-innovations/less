import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import s from './pageheader.module.css'

type Props = {
  title: string
  subtitle?: string
  action?: React.ReactNode
  backHref?: string
  backLabel?: string
}

export function PageHeader({ title, subtitle, action, backHref, backLabel }: Props) {
  return (
    <div className={s.header}>
      <div className={s.titleBlock}>
        {backHref && (
          <Link href={backHref} className={s.back}>
            <ChevronLeft size={14} /> {backLabel ?? 'voltar'}
          </Link>
        )}
        <h1 className={s.title}>{title}</h1>
        {subtitle && <p className={s.subtitle}>{subtitle}</p>}
      </div>
      {action && <div className={s.action}>{action}</div>}
    </div>
  )
}
