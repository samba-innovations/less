import { NextRequest, NextResponse } from 'next/server'
import { getAuthCookie } from '@/lib/cookie'
import { verifyToken } from '@/lib/jwt'
import { getSchoolFromPayload } from '@/lib/school'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function getCtx() {
  const token = await getAuthCookie()
  if (!token) return null
  const payload = await verifyToken(token).catch(() => null)
  if (!payload) return null
  const school = await getSchoolFromPayload(payload)
  if (!school) return null
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
