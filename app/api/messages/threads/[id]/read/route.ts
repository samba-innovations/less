import { NextRequest, NextResponse } from 'next/server'
import { sessaoApi } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// PATCH /api/messages/threads/[id]/read → atualiza lastReadAt do user no thread
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await sessaoApi()
  if (!s.ok) return s.resposta
  const { payload } = s

  const { id: idStr } = await params
  const threadId = Number(idStr)

  await db.threadParticipant.update({
    where: { threadId_userId: { threadId, userId: payload.userId } },
    data:  { lastReadAt: new Date() },
  }).catch(() => null)

  return NextResponse.json({ ok: true })
}
