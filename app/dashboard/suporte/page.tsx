import { db } from '@/lib/db'
import { getAuthCookie } from '@/lib/cookie'
import { verifyToken } from '@/lib/jwt'
import { getSchoolFromPayload } from '@/lib/school'
import { redirect } from 'next/navigation'
import { SuporteClient } from './SuporteClient'

export const metadata = { title: 'suporte' }

export default async function SuportePage() {
  const token = await getAuthCookie()
  if (!token) redirect('/login')
  const payload = await verifyToken(token).catch(() => null)
  if (!payload) redirect('/login')

  const school = await getSchoolFromPayload(payload)
  if (!school) redirect('/login')

  const tickets = await db.supportTicket.findMany({
    where: { userId: payload.userId, organizationId: school.organizationId, system: 'control' },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return <SuporteClient tickets={tickets} systemName="control" videoUrl={process.env.NEXT_PUBLIC_SUPPORT_VIDEO_URL} />
}
