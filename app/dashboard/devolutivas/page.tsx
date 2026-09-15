export const metadata = { title: 'devolutivas' }
export const dynamic  = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { DOC_TYPES, type DocType } from '@/lib/doc-types'
import { MessageSquare, FileText, CheckCircle2, Clock } from 'lucide-react'
import { PageHeader } from '../_components/PageHeader'
import { Badge } from '../_components/Badge'
import s from './devolutivas.module.css'

export default async function DevolutivasPage() {
  const session = await getSession()
  if (!session) redirect(process.env.NEXT_PUBLIC_SSO_URL + '/login')

  const school = await db.school.findFirst({
    where:  { organization: { slug: session.orgSlug } },
    select: { id: true },
  })
  if (!school) redirect(process.env.NEXT_PUBLIC_SSO_URL + '/login')

  const feedbacks = await db.lessDocumentFeedback.findMany({
    where: { document: { userId: session.userId, schoolId: school.id, deletedAt: null } },
    include: {
      document:    { select: { id: true, title: true, type: true, status: true } },
      coordinator: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className={s.page}>
      <PageHeader
        title="devolutivas"
        subtitle={feedbacks.length === 0 ? 'nenhuma devolutiva recebida ainda' : `${feedbacks.length} feedback${feedbacks.length === 1 ? '' : 's'} da coordenação`}
      />

      {feedbacks.length === 0 ? (
        <div className={s.empty}>
          <MessageSquare size={40} strokeWidth={1.2} />
          <p className={s.emptyTitle}>Sem devolutivas por enquanto</p>
          <p className={s.emptySub}>Quando a coordenação revisar seus documentos, os comentários aparecem aqui.</p>
        </div>
      ) : (
        <div className={s.list}>
          {feedbacks.map(fb => {
            const meta   = DOC_TYPES[fb.document.type as DocType]
            const color  = meta?.color ?? 'var(--fg-secondary)'
            const isFinal = fb.document.status === 'FINAL'
            return (
              <Link key={fb.id} href={`/dashboard/documentos/${fb.document.id}`} className={s.card}>
                <span className={s.accent} style={{ background: color }} aria-hidden />

                <header className={s.cardTop}>
                  <div className={s.docInfo}>
                    <span className={s.docIcon} style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>
                      <FileText size={13} />
                    </span>
                    <div className={s.docText}>
                      <span className={s.docTitle}>{fb.document.title}</span>
                      <span className={s.docMeta}>{meta?.label ?? fb.document.type}</span>
                    </div>
                  </div>
                  <Badge
                    tone={isFinal ? 'success' : 'amber'}
                    icon={isFinal ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                  >
                    {isFinal ? 'final' : 'rascunho'}
                  </Badge>
                </header>

                <blockquote className={s.feedbackText}>{fb.text}</blockquote>

                <footer className={s.cardFoot}>
                  <span className={s.coordName}>{fb.coordinator.name}</span>
                  <span aria-hidden>·</span>
                  <span className={s.date}>
                    {new Date(fb.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                    })}
                  </span>
                </footer>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
