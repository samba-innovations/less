export const metadata = { title: 'orientação de estudos' }
export const dynamic  = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { canAccessOECard, effectiveRole } from '@/lib/jwt'
import { OEClient } from './OEClient'

export default async function OEPage() {
  const session = await getSession()
  if (!session) redirect(process.env.NEXT_PUBLIC_SSO_URL + '/login')

  if (!canAccessOECard(effectiveRole(session))) {
    redirect('/dashboard')
  }

  const school = await db.school.findFirst({
    where: { organization: { slug: session.orgSlug } },
    select: { id: true },
  })
  if (!school) redirect(process.env.NEXT_PUBLIC_SSO_URL + '/login')

  // Find OE disciplines assigned to this teacher (disciplines with 'OE' or 'Orientação' in name)
  const assignments = await db.teacherAssignment.findMany({
    where: {
      userId:   session.userId,
      schoolId: school.id,
      discipline: {
        OR: [
          { name: { contains: 'OE', mode: 'insensitive' } },
          { name: { contains: 'Orientação', mode: 'insensitive' } },
          { name: { contains: 'Orientacao', mode: 'insensitive' } },
          { type: 'REGULAR', aulasNome: { not: null } },
        ],
      },
    },
    include: {
      discipline: { select: { id: true, name: true, aulasNome: true } },
    },
    distinct: ['disciplineId'],
  })

  // Deduplicate disciplines
  const seen = new Set<number>()
  const disciplinasOE = assignments
    .map(a => a.discipline)
    .filter(d => { if (seen.has(d.id)) return false; seen.add(d.id); return true })

  return (
    <OEClient
      disciplinasOE={disciplinasOE}
      role={session.role}
      isAdmin={session.isAdmin}
    />
  )
}
