import { NextRequest, NextResponse } from 'next/server'
import { getAuthCookie } from '@/lib/cookie'
import { verifyToken } from '@/lib/jwt'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function auth() {
  const token = await getAuthCookie()
  if (!token) return null
  try { return await verifyToken(token) } catch { return null }
}

// GET /api/messages/threads/[id]?before=<msgId>&limit=30 → detalhes do thread + mensagens paginadas
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = await auth()
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: idStr } = await params
  const id = Number(idStr)
  const before = Number(req.nextUrl.searchParams.get('before')) || null
  const limit  = Math.min(Number(req.nextUrl.searchParams.get('limit')) || 30, 80)

  // Autorização: user precisa ser participante
  const membership = await db.threadParticipant.findUnique({
    where: { threadId_userId: { threadId: id, userId: payload.userId } },
  })
  if (!membership) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const thread = await db.thread.findUnique({
    where: { id },
    include: {
      participants: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      },
    },
  })
  if (!thread) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const messages = await db.message.findMany({
    where: { threadId: id, ...(before ? { id: { lt: before } } : {}) },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
  })

  return NextResponse.json({
    thread,
    messages: messages.reverse(),  // mais antiga primeiro no client
    hasMore: messages.length === limit,
  })
}
