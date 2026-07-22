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

// POST /api/messages/threads/[id]/messages → envia mensagem no thread
// body: { body: string, attachmentUrl?: string }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = await auth()
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: idStr } = await params
  const threadId = Number(idStr)

  const membership = await db.threadParticipant.findUnique({
    where: { threadId_userId: { threadId, userId: payload.userId } },
  })
  if (!membership) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => null) as { body?: string; attachmentUrl?: string } | null
  const text = body?.body?.trim()
  if (!text) return NextResponse.json({ error: 'empty message' }, { status: 400 })

  const msg = await db.message.create({
    data: { threadId, senderId: payload.userId, body: text, attachmentUrl: body?.attachmentUrl ?? null },
    include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
  })
  // Trigger no DB já disparou pg_notify pros outros participantes + atualiza Thread.lastMessageAt

  return NextResponse.json({ message: msg })
}
