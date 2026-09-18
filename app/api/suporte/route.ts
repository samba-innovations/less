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
  return { payload, school, user }
}

export async function GET() {
  const ctx = await getCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tickets = await db.supportTicket.findMany({
    where: { userId: ctx.user.id, organizationId: ctx.school.organizationId, system: 'less' },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({ tickets })
}

export async function POST(req: NextRequest) {
  const ctx = await getCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { subject, body } = await req.json()
  if (!subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const ticket = await db.supportTicket.create({
    data: {
      userId:   ctx.user.id,
      organizationId: ctx.school.organizationId,
      system:   'less',
      subject:  subject.trim(),
      messages: {
        create: {
          body:        body.trim(),
          authorId:    ctx.user.id,
          authorName:  ctx.user.name,
          isFromAdmin: false,
        },
      },
    },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })

  return NextResponse.json({ ticket })
}
