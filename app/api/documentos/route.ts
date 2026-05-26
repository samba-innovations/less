import { NextRequest, NextResponse } from 'next/server'
import { getAuthCookie } from '@/lib/cookie'
import { verifyToken, isManager } from '@/lib/jwt'
import { db } from '@/lib/db'
import { ALL_DOC_TYPES, type DocType } from '@/lib/doc-types'
import { pushToSchool } from '@/lib/sse-broadcaster'

export const dynamic = 'force-dynamic'

async function auth(orgSlugOverride?: string) {
  const token = await getAuthCookie()
  if (!token) return null
  try {
    const payload = await verifyToken(token)
    const slug    = orgSlugOverride || payload.orgSlug
    if (!slug) return payload.isAdmin ? { payload, school: null } : null
    const school  = await db.school.findFirst({ where: { organization: { slug } } })
    return school ? { payload, school } : (payload.isAdmin ? { payload, school: null } : null)
  } catch { return null }
}

export async function GET(req: NextRequest) {
  const ctx = await auth()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allDocs = req.nextUrl.searchParams.get('all') === 'true'
  const canViewAll = isManager(ctx.payload.role) || ctx.payload.isAdmin

  const where = ctx.school
    ? (allDocs && canViewAll
        ? { schoolId: ctx.school.id }
        : { schoolId: ctx.school.id, userId: ctx.payload.userId })
    : { userId: ctx.payload.userId }

  const docs = await db.lessDocument.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    select:  { id: true, type: true, title: true, status: true, updatedAt: true, user: { select: { name: true } } },
  })

  return NextResponse.json(docs)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const ctx  = await auth(body.orgSlug)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (ctx.payload.role === 'SECRETARY')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { type, title } = body
  if (!ALL_DOC_TYPES.includes(type as DocType))
    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  if (!title?.trim())
    return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 })
  if (!ctx.school)
    return NextResponse.json({ error: 'Selecione uma escola.' }, { status: 400 })

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

  if (ctx.school) pushToSchool(ctx.school.id, 'document_created', { id: doc.id })
  return NextResponse.json(doc, { status: 201 })
}
