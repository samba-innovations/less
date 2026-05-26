import { NextRequest, NextResponse } from 'next/server'
import { getAuthCookie } from '@/lib/cookie'
import { verifyToken, isManager } from '@/lib/jwt'
import { db } from '@/lib/db'
import { pushToSchool } from '@/lib/sse-broadcaster'

async function auth() {
  const token = await getAuthCookie()
  if (!token) return null
  try {
    const payload = await verifyToken(token)
    const school  = await db.school.findFirst({ where: { organization: { slug: payload.orgSlug } } })
    return school ? { payload, school } : null
  } catch { return null }
}

async function getDoc(id: number, ctx: Awaited<ReturnType<typeof auth>>) {
  if (!ctx) return null
  const manager = isManager(ctx.payload.role) || ctx.payload.isAdmin
  return db.lessDocument.findFirst({
    where: {
      id,
      schoolId: ctx.school.id,
      ...(manager ? {} : { userId: ctx.payload.userId }),
    },
  })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await auth()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const doc = await getDoc(Number(id), ctx)
  if (!doc) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  return NextResponse.json(doc)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await auth()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const doc = await getDoc(Number(id), ctx)
  if (!doc) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  const body = await req.json()
  const updated = await db.lessDocument.update({
    where: { id: doc.id },
    data: {
      ...(body.title   !== undefined ? { title:   body.title.trim() } : {}),
      ...(body.content !== undefined ? { content: body.content }     : {}),
      ...(body.status  !== undefined ? { status:  body.status }      : {}),
    },
  })

  if (ctx.school) pushToSchool(ctx.school.id, 'document_updated', { id: updated.id, status: updated.status })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await auth()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const doc = await getDoc(Number(id), ctx)
  if (!doc) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  await db.lessDocument.delete({ where: { id: doc.id } })
  return NextResponse.json({ ok: true })
}
