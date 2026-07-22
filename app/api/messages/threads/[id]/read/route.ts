import { NextRequest, NextResponse } from 'next/server'
import { getAuthCookie } from '@/lib/cookie'
import { verifyToken } from '@/lib/jwt'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// PATCH /api/messages/threads/[id]/read → atualiza lastReadAt do user no thread
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getAuthCookie()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let payload
  try { payload = await verifyToken(token) }
  catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { id: idStr } = await params
  const threadId = Number(idStr)

  await db.threadParticipant.update({
    where: { threadId_userId: { threadId, userId: payload.userId } },
    data:  { lastReadAt: new Date() },
  }).catch(() => null)

  return NextResponse.json({ ok: true })
}
