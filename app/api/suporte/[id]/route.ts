import { NextRequest, NextResponse } from 'next/server'
import { apiComEscola } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function getCtx() {
  const s = await apiComEscola()
  if (!s.ok) return null
  const { payload, school } = s
  const user = await db.user.findUnique({ where: { id: payload.userId } })
  if (!user) return null
  return { school, user }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const ticketId = Number(id)

  await db.supportTicket.updateMany({
    where: { id: ticketId, organizationId: ctx.school.organizationId, userId: ctx.user.id, system: 'less' },
    data:  { status: 'CLOSED' },
  })

  return NextResponse.json({ ok: true })
}
