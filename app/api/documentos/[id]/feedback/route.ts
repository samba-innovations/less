import { NextRequest, NextResponse } from 'next/server'
import { sessaoApi } from '@/lib/auth'
import { verifyToken, isManager, effectiveRole } from '@/lib/jwt'
import { db } from '@/lib/db'

async function auth() {
  const s = await sessaoApi()
  if (!s.ok) return null
  const school = await db.school.findFirst({ where: { organization: { slug: s.payload.orgSlug } } })
  return school ? { payload: s.payload, school } : null
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await auth()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isManager(effectiveRole(ctx.payload)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const doc = await db.lessDocument.findFirst({
    where: { id: Number(id), schoolId: ctx.school.id },
  })
  if (!doc) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  const { text } = await req.json()
  if (!text?.trim()) return NextResponse.json({ error: 'Texto obrigatório' }, { status: 400 })

  const feedback = await db.lessDocumentFeedback.create({
    data: {
      documentId:    doc.id,
      coordinatorId: ctx.payload.userId,
      text:          text.trim(),
    },
    include: { coordinator: { select: { name: true } } },
  })

  return NextResponse.json(feedback, { status: 201 })
}
