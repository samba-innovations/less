import { NextRequest, NextResponse } from 'next/server'
import { getAuthCookie } from '@/lib/cookie'
import { verifyToken } from '@/lib/jwt'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST   /api/messages/reactions  { messageId, emoji }  → toggle (add se não existe, remove se existe)
// GET    /api/messages/reactions?threadId=N  → todas as reactions dos msgs do thread
//
// Trigger DB dispara pg_notify pra participants receberem live.

export async function POST(req: NextRequest) {
  const token = await getAuthCookie()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let payload
  try { payload = await verifyToken(token) }
  catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const body = await req.json().catch(() => null) as { messageId?: number; emoji?: string } | null
  const messageId = Number(body?.messageId)
  const emoji     = body?.emoji?.trim()
  if (!messageId || !emoji || emoji.length > 16) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  // Verifica que user é participant do thread
  const msg = await db.message.findUnique({
    where: { id: messageId },
    select: { threadId: true },
  })
  if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const membership = await db.threadParticipant.findUnique({
    where: { threadId_userId: { threadId: msg.threadId, userId: payload.userId } },
  })
  if (!membership) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Toggle
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = await (db as any).messageReaction.findUnique({
    where: { messageId_userId_emoji: { messageId, userId: payload.userId, emoji } },
  }).catch(() => null)

  if (existing) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).messageReaction.delete({
      where: { messageId_userId_emoji: { messageId, userId: payload.userId, emoji } },
    })
    return NextResponse.json({ ok: true, action: 'removed' })
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).messageReaction.create({
      data: { messageId, userId: payload.userId, emoji },
    })
    return NextResponse.json({ ok: true, action: 'added' })
  }
}

export async function GET(req: NextRequest) {
  const token = await getAuthCookie()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let payload
  try { payload = await verifyToken(token) }
  catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const threadId = Number(req.nextUrl.searchParams.get('threadId'))
  if (!threadId) return NextResponse.json({ error: 'threadId required' }, { status: 400 })

  const membership = await db.threadParticipant.findUnique({
    where: { threadId_userId: { threadId, userId: payload.userId } },
  })
  if (!membership) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reactions = await (db as any).messageReaction.findMany({
    where: { message: { threadId } },
    select: { messageId: true, userId: true, emoji: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  }).catch(() => [])

  return NextResponse.json({ reactions })
}
