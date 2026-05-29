import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { DashboardShell } from './DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const payload = await getSession()
  if (!payload) redirect(process.env.NEXT_PUBLIC_SSO_URL + '/login')

  const user = await db.user.findUnique({
    where:  { id: payload.userId },
    select: { name: true, avatarUrl: true },
  })
  if (!user) redirect(process.env.NEXT_PUBLIC_SSO_URL + '/login')

  const school = payload.orgSlug
    ? await db.school.findFirst({ where: { organization: { slug: payload.orgSlug } }, select: { id: true } })
    : null

  let activeYear: number | null = null
  if (school) {
    const sy = await db.schoolYear.findFirst({
      where: { schoolId: school.id, isActive: true },
      orderBy: { year: 'desc' },
      select: { year: true },
    })
    if (sy) activeYear = sy.year
  }

  return (
    <DashboardShell payload={payload} user={user} activeYear={activeYear} currentBimester={null}>
      {children}
    </DashboardShell>
  )
}