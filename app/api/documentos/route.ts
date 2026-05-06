import { NextRequest, NextResponse } from 'next/server'
import { getAuthCookie } from '@/lib/cookie'
import { verifyToken } from '@/lib/jwt'
import { db } from '@/lib/db'
import { ALL_DOC_TYPES, type DocType } from '@/lib/doc-types'

export const dynamic = 'force-dynamic'

async function auth() {
  const token = await getAuthCookie()
  if (!token) return null
  try {
    const payload = await verifyToken(token)
    const school  = await db.school.findUnique({ where: { slug: payload.schoolSlug } })
    return school ? { payload, school } : null
  } catch { return null }
}

export async function GET() {
  const ctx = await auth()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const docs = await db.lessDocument.findMany({
    where:   { schoolId: ctx.school.id, userId: ctx.payload.userId },
    orderBy: { updatedAt: 'desc' },
    select:  { id: true, type: true, title: true, status: true, updatedAt: true },
  })

  return NextResponse.json(docs)
}

export async function POST(req: NextRequest) {
  const ctx = await auth()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (ctx.payload.role === 'SECRETARY')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { type, title } = await req.json()
  if (!ALL_DOC_TYPES.includes(type as DocType))
    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  if (!title?.trim())
    return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 })

  const doc = await db.lessDocument.create({
    data: {
      schoolId: ctx.school.id,
      userId:   ctx.payload.userId,
      type:     type as DocType,
      title:    title.trim(),
      content:  {},
      status:   'DRAFT',
    },
  })

  return NextResponse.json(doc, { status: 201 })
}
