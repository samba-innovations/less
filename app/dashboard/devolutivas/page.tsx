export const metadata = { title: 'devolutivas' }
export const dynamic  = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { DOC_TYPES, type DocType } from '@/lib/doc-types'
import { MessageSquare, FileText, CheckCircle2, Clock } from 'lucide-react'
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

      <div className={s.header}>
        <div className={s.headerIcon}><MessageSquare size={20} /></div>
        <div>
          <h1 className={s.title}>Devolutivas recebidas</h1>
          <p className={s.sub}>Feedbacks da coordenação sobre seus documentos</p>
        </div>
        <span className={s.countBadge}>{feedbacks.length}</span>
      </div>

      {feedbacks.length === 0 ? (
        <div className={s.empty}>
          <MessageSquare size={40} strokeWidth={1.2} />
          <p className={s.emptyTitle}>Nenhuma devolutiva recebida ainda</p>
          <p className={s.emptySub}>Quando a coordenação revisar seus documentos, os comentários aparecem aqui.</p>
        </div>
      ) : (
        <div className={s.list}>
          {feedbacks.map(fb => {
            const meta = DOC_TYPES[fb.document.type as DocType]
            return (
              <Link key={fb.id} href={`/dashboard/documentos/${fb.document.id}`} className={s.card}>
                <div className={s.cardAccent} style={{ background: meta?.color ?? '#6b7280' }} />

                <div className={s.cardTop}>
                  <div className={s.docInfo}>
                    <div className={s.docIcon} style={{ background: (meta?.color ?? '#6b7280') + '18' }}>
                      <FileText size={14} color={meta?.color ?? '#6b7280'} />
                    </div>
                    <div>
                      <p className={s.docTitle}>{fb.document.title}</p>
                      <p className={s.docMeta}>{meta?.label ?? fb.document.type}</p>
                    </div>
                  </div>
                  <div className={s.statusBadge}>
                    {fb.document.status === 'FINAL'
                      ? <><CheckCircle2 size={12} /> final</>
                      : <><Clock size={12} /> rascunho</>
                    }
                  </div>
                </div>

                <blockquote className={s.feedbackText}>{fb.text}</blockquote>

                <div className={s.cardMeta}>
                  <span className={s.coordName}>{fb.coordinator.name}</span>
                  <span className={s.dot}>·</span>
                  <span className={s.date}>
                    {new Date(fb.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                    })}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

    </div>
  )
}
