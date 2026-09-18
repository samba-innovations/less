import { db } from '@/lib/db'
import { exigirEscola } from '@/lib/auth'
import { SuporteClient } from './SuporteClient'

export const metadata = { title: 'suporte' }

export default async function SuportePage() {
  const { payload, school } = await exigirEscola()

  const tickets = await db.supportTicket.findMany({
    where: { userId: payload.userId, organizationId: school.organizationId, system: 'control' },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return <SuporteClient tickets={tickets} systemName="control" videoUrl={process.env.NEXT_PUBLIC_SUPPORT_VIDEO_URL} />
}
