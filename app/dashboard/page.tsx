export const metadata = { title: 'visão geral' }
export const dynamic  = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { isManager, effectiveRole } from '@/lib/jwt'
import { DOC_TYPES, type DocType } from '@/lib/doc-types'
import {
  FileText, CheckCircle2, Clock, Users, FilePlus,
  ArrowRight, Plus,
} from 'lucide-react'
import s from './overview.module.css'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect(process.env.NEXT_PUBLIC_SSO_URL + '/login')

  const school = await db.school.findFirst({ where: { organization: { slug: session.orgSlug } }, include: { organization: true } })
  if (!school) redirect(process.env.NEXT_PUBLIC_SSO_URL + '/login')

  const manager = isManager(effectiveRole(session))

  const [totalDocs, draftDocs, finalDocs, teamDrafts] = await Promise.all([
    db.lessDocument.count({ where: { schoolId: school.id, userId: session.userId, deletedAt: null } }),
    db.lessDocument.count({ where: { schoolId: school.id, userId: session.userId, status: 'DRAFT', deletedAt: null } }),
    db.lessDocument.count({ where: { schoolId: school.id, userId: session.userId, status: 'FINAL', deletedAt: null } }),
    manager
      ? db.lessDocument.count({ where: { schoolId: school.id, status: 'DRAFT', deletedAt: null } })
      : Promise.resolve(0),
  ])

  const stats = [
    {
      label:  'documentos criados',
      value:  totalDocs,
      sub:    'total',
      icon:   FileText,
      href:   '/dashboard/documentos',
      accent: true,
    },
    {
      label:  'rascunhos',
      value:  draftDocs,
      sub:    'em edição',
      icon:   Clock,
      href:   '/dashboard/documentos',
      accent: false,
    },
    {
      label:  'finalizados',
      value:  finalDocs,
      sub:    'com PDF gerado',
      icon:   CheckCircle2,
      href:   '/dashboard/documentos',
      accent: false,
    },
    ...(manager ? [{
      label:  'rascunhos da equipe',
      value:  teamDrafts,
      sub:    'pendentes',
      icon:   Users,
      href:   '/dashboard/coordenacao',
      accent: false,
    }] : []),
  ]

  const docTypeEntries = (Object.entries(DOC_TYPES) as [DocType, typeof DOC_TYPES[DocType]][])
    .filter(([, m]) => !m.managerOnly || manager)
    .slice(0, 4)

  const quickActions = [
    { label: 'novo documento',    icon: FilePlus,   href: '/dashboard/documentos/novo', desc: 'criar documento'   },
    { label: 'meus documentos',   icon: FileText,   href: '/dashboard/documentos',      desc: 'ver meus arquivos' },
    ...(manager ? [
      { label: 'documentos da equipe', icon: Users, href: '/dashboard/coordenacao', desc: 'revisar equipe' },
    ] : []),
  ]

  return (
    <div className={s.page}>

      {/* ── Hero ── */}
      <div className={s.hero}>
        <div className={s.heroAccent} />
        <div className={s.heroBody}>
          <div className={s.heroLeft}>
            <div className={s.heroBadges}>
              <span className={s.badgeType}>
                {school.type === 'PUBLIC' ? 'escola pública' : 'escola particular'}
              </span>
              <span className={s.badgeSystem}>geração de documentos</span>
            </div>
            <h1 className={s.heroTitle}>{school.organization.name}</h1>
            <p className={s.heroSub}>visão geral dos seus documentos</p>
          </div>

          <div className={s.docTypes}>
            <span className={s.docTypesLabel}>tipos disponíveis</span>
            <div className={s.docTypePills}>
              {docTypeEntries.map(([type, meta]) => (
                <Link key={type} href={`/dashboard/documentos/novo?type=${type}`} className={s.docTypePill}>
                  <span className={s.docTypeDot} style={{ background: meta.color }} />
                  {meta.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className={s.stats}>
        {stats.map(stat => (
          <Link key={stat.label} href={stat.href} className={`${s.statCard} ${stat.accent ? s.statAccent : ''}`}>
            <div className={s.statTop}>
              <div className={s.statIcon}><stat.icon size={15} /></div>
              <ArrowRight size={13} className={s.statArrow} />
            </div>
            <div className={s.statValue}>{stat.value}</div>
            <div className={s.statBottom}>
              <span className={s.statLabel}>{stat.label}</span>
              <span className={s.statSub}>{stat.sub}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Quick actions ── */}
      <div className={s.section}>
        <h2 className={s.sectionTitle}>ações rápidas</h2>
        <div className={s.actions}>
          {quickActions.map(a => (
            <Link key={a.label} href={a.href} className={s.actionCard}>
              <div className={s.actionIcon}><a.icon size={17} /></div>
              <div className={s.actionText}>
                <span className={s.actionLabel}>{a.label}</span>
                <span className={s.actionDesc}>{a.desc}</span>
              </div>
              <Plus size={14} className={s.actionPlus} />
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}
