import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { isManager } from '@/lib/jwt'
import { CoordenacaoClient } from './CoordenacaoClient'

export const dynamic = 'force-dynamic'

export default async function CoordenacaoPage() {
  const session = await getSession()
  if (!session) redirect(process.env.NEXT_PUBLIC_SSO_URL + '/login')
  if (!isManager(session.role)) redirect('/dashboard')

  const school = await db.school.findFirst({ where: { organization: { slug: session.orgSlug } } })
  if (!school) redirect(process.env.NEXT_PUBLIC_SSO_URL + '/login')

  const [docs, peiStudents] = await Promise.all([
    db.lessDocument.findMany({
      where:   { schoolId: school.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, title: true, type: true, status: true,
        updatedAt: true, user: { select: { name: true } },
      },
    }),
    db.lessPeiStudent.findMany({
      where:   { schoolId: school.id },
      orderBy: [{ turma: 'asc' }, { name: 'asc' }],
      select: {
        id: true, name: true, ra: true, turma: true,
        diagnostico: true, profColaborativo: true, profAee: true, ativo: true,
      },
    }),
  ])

  return (
    <CoordenacaoClient
      docs={docs.map(d => ({ ...d, updatedAt: d.updatedAt.toISOString() }))}
      initialPeiStudents={peiStudents}
    />
  )
}
