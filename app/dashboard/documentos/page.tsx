import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { DOC_TYPES, type DocType } from '@/lib/doc-types'
import { FileText, Plus } from 'lucide-react'
import s from './documentos.module.css'

export const dynamic = 'force-dynamic'

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const session = await getSession()
  if (!session) redirect(process.env.NEXT_PUBLIC_SSO_URL + '/login')

  const school = await db.school.findFirst({ where: { organization: { slug: session.orgSlug } } })
  if (!school) redirect(process.env.NEXT_PUBLIC_SSO_URL + '/login')

  const { status } = await searchParams
  const statusFilter = status === 'DRAFT' ? 'DRAFT' : status === 'FINAL' ? 'FINAL' : undefined

  const docs = await db.lessDocument.findMany({
    where: {
      schoolId: school.id,
      userId:   session.userId,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, type: true, status: true, updatedAt: true },
  })

  function fmtDate(d: Date) {
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <div className={s.wrap}>
        <div className={s.toolbar}>
          <Link href="/dashboard/documentos/novo" className={s.newBtn}>
            <Plus size={14} /> novo documento
          </Link>
          <div className={s.filterBtns}>
            <Link href="/dashboard/documentos" className={`${s.filterBtn} ${!statusFilter ? s.filterBtnActive : ''}`}>
              todos
            </Link>
            <Link href="?status=DRAFT" className={`${s.filterBtn} ${statusFilter === 'DRAFT' ? s.filterBtnActive : ''}`}>
              rascunhos
            </Link>
            <Link href="?status=FINAL" className={`${s.filterBtn} ${statusFilter === 'FINAL' ? s.filterBtnActive : ''}`}>
              finalizados
            </Link>
          </div>
        </div>

        {docs.length === 0 ? (
          <div className={s.empty}>
            <FileText size={36} strokeWidth={1.2} />
            <p className={s.emptyTitle}>nenhum documento{statusFilter ? ' com este filtro' : ''}</p>
            <p className={s.emptyText}>comece criando seu primeiro documento pedagógico.</p>
            <Link href="/dashboard/documentos/novo" className={s.emptyBtn}>
              <Plus size={13} /> criar documento
            </Link>
          </div>
        ) : (
          <div className={s.list}>
            {docs.map(doc => {
              const meta = DOC_TYPES[doc.type as DocType]
              return (
                <Link key={doc.id} href={`/dashboard/documentos/${doc.id}`} className={s.docCard}>
                  <div className={s.docCardAccent} style={{ background: meta?.color ?? '#6b7280' }} />
                  <div className={s.docIcon} style={{ background: (meta?.color ?? '#6b7280') + '18' }}>
                    <FileText size={16} color={meta?.color ?? '#6b7280'} />
                  </div>
                  <div className={s.docInfo}>
                    <p className={s.docTitle}>{doc.title}</p>
                    <div className={s.docMeta}>
                      <span>{meta?.label ?? doc.type}</span>
                    </div>
                  </div>
                  <span className={`${s.badge} ${doc.status === 'FINAL' ? s.badgeFinal : s.badgeDraft}`}>
                    {doc.status === 'FINAL' ? 'final' : 'rascunho'}
                  </span>
                  <span className={s.docDate}>{fmtDate(doc.updatedAt)}</span>
                </Link>
              )
            })}
          </div>
        )}
    </div>
  )
}
