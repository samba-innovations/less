import { NextRequest, NextResponse } from 'next/server'
import { getAuthCookie } from '@/lib/cookie'
import { verifyToken, isManager, effectiveRole } from '@/lib/jwt'
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
  const manager = isManager(effectiveRole(ctx.payload))
  return db.lessDocument.findFirst({
    where: {
      id,
      schoolId: ctx.school.id,
      deletedAt: null,
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

  // Guards de robustez/segurança
  if (body.title !== undefined && typeof body.title !== 'string')
    return NextResponse.json({ error: 'Título inválido' }, { status: 400 })
  if (body.content !== undefined) {
    if (typeof body.content !== 'object' || body.content === null)
      return NextResponse.json({ error: 'Conteúdo inválido' }, { status: 400 })
    if (JSON.stringify(body.content).length > 500_000)
      return NextResponse.json({ error: 'Conteúdo muito grande' }, { status: 413 })
  }
  if (body.status !== undefined && !['DRAFT', 'FINAL'].includes(body.status))
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 })

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

  // Soft delete — preserva o registro para auditoria/retenção (ATA/PEI têm valor legal)
  await db.lessDocument.update({ where: { id: doc.id }, data: { deletedAt: new Date() } })
  return NextResponse.json({ ok: true })
}
