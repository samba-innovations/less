import { NextRequest, NextResponse } from 'next/server'
import { getAuthCookie } from '@/lib/cookie'
import { verifyToken } from '@/lib/jwt'
import { getSchoolFromPayload } from '@/lib/school'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function auth() {
  const token = await getAuthCookie()
  if (!token) return null
  try {
    const payload = await verifyToken(token)
    const school  = await getSchoolFromPayload(payload)
    return school ? { payload, school } : null
  } catch { return null }
}

// GET /api/messages/threads → threads onde user é participante, com última mensagem + unread count
export async function GET() {
  const ctx = await auth()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const threads = await db.thread.findMany({
    where: {
      schoolId: ctx.school.id,
      participants: { some: { userId: ctx.payload.userId } },
    },
    include: {
      participants: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, body: true, senderId: true, createdAt: true },
      },
    },
    orderBy: { lastMessageAt: 'desc' },
    take: 60,
  })

  // Unread count por thread (mensagens depois do lastReadAt do user)
  const withUnread = await Promise.all(threads.map(async t => {
    const me = t.participants.find(p => p.userId === ctx.payload.userId)
    const lastRead = me?.lastReadAt ?? new Date(0)
    const unread = await db.message.count({
      where: { threadId: t.id, createdAt: { gt: lastRead }, senderId: { not: ctx.payload.userId } },
    })
    return { ...t, unread }
  }))

  return NextResponse.json({ threads: withUnread })
}

// POST /api/messages/threads → cria novo thread (1:1 ou grupo)
// body: { participantIds: number[], subject?: string, firstMessage?: string }
export async function POST(req: NextRequest) {
  const ctx = await auth()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null) as { participantIds?: number[]; subject?: string; firstMessage?: string } | null
  const participantIds = body?.participantIds ?? []
  if (participantIds.length === 0) return NextResponse.json({ error: 'no participants' }, { status: 400 })

  // Inclui o criador se não estiver na lista
  const allIds = [...new Set([ctx.payload.userId, ...participantIds])]

  // 1:1: reusa thread existente entre esses 2 users (sem subject)
  if (allIds.length === 2 && !body?.subject) {
    const existing = await db.thread.findFirst({
      where: {
        schoolId: ctx.school.id,
        subject:  null,
        participants: { every: { userId: { in: allIds } } },
      },
    })
    if (existing) {
      // Reusa
      if (body?.firstMessage?.trim()) {
        await db.message.create({
          data: { threadId: existing.id, senderId: ctx.payload.userId, body: body.firstMessage.trim() },
        })
      }
      return NextResponse.json({ threadId: existing.id, reused: true })
    }
  }

  const thread = await db.thread.create({
    data: {
      schoolId:     ctx.school.id,
      subject:      body?.subject?.trim() || null,
      participants: { create: allIds.map(userId => ({ userId })) },
    },
  })
  if (body?.firstMessage?.trim()) {
    await db.message.create({
      data: { threadId: thread.id, senderId: ctx.payload.userId, body: body.firstMessage.trim() },
    })
  }
  return NextResponse.json({ threadId: thread.id, reused: false })
}
