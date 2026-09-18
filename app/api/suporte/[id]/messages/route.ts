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

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const ticketId = Number(id)
  const { body } = await req.json()
  if (!body?.trim()) return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })

  const ticket = await db.supportTicket.findFirst({
    where: { id: ticketId, organizationId: ctx.school.organizationId, userId: ctx.user.id, system: 'less' },
  })
  if (!ticket) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  if (ticket.status === 'CLOSED') return NextResponse.json({ error: 'Chamado encerrado' }, { status: 400 })

  const [message] = await db.$transaction([
    db.supportMessage.create({
      data: {
        ticketId,
        body:        body.trim(),
        authorId:    ctx.user.id,
        authorName:  ctx.user.name,
        isFromAdmin: false,
      },
    }),
    db.supportTicket.update({
      where: { id: ticketId },
      data:  { updatedAt: new Date() },
    }),
  ])

  return NextResponse.json({ message })
}
