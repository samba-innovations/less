import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { DashboardShell } from './DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const payload = await getSession()
  if (!payload) redirect(process.env.NEXT_PUBLIC_SSO_URL + '/login')

  // Aluno (STUDENT) não acessa este sistema — volta pro painel do hub.
  if (payload.role === 'STUDENT') {
    redirect(`http://${payload.orgSlug}.${process.env.NEXT_PUBLIC_DOMAIN ?? 'sambainnovations.local'}/painel`)
  }

  const user = await db.user.findUnique({
    where:  { id: payload.userId },
    select: { name: true, avatarUrl: true },
  })
  if (!user) redirect(process.env.NEXT_PUBLIC_SSO_URL + '/login')

  const school = payload.orgSlug
    ? await db.school.findFirst({ where: { organization: { slug: payload.orgSlug } }, select: { id: true } })
    : null

  // Active school year + bimestre atual (baseado na data de hoje).
  // Bimestre é model do control — no less consultamos via raw SQL pra
  // não precisar importar o model inteiro com todas as relações.
  let activeYear: number | null = null
  let currentBimester: number | null = null
  if (school) {
    const sy = await db.schoolYear.findFirst({
      where: { schoolId: school.id, isActive: true },
      orderBy: { year: 'desc' },
      select: { id: true, year: true },
    })
    if (sy) {
      activeYear = sy.year
      const rows = await db.$queryRaw<Array<{ order: number }>>`
        SELECT "order" FROM "Bimestre"
        WHERE "schoolYearId" = ${sy.id}
          AND "startDate" <= NOW()
          AND "endDate"   >= NOW()
        LIMIT 1
      `
      if (rows[0]) currentBimester = rows[0].order
    }
  }

  return (
    <DashboardShell payload={payload} user={user} activeYear={activeYear} currentBimester={currentBimester}>
      {children}
    </DashboardShell>
  )
}