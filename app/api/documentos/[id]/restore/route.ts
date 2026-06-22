import { NextRequest, NextResponse } from 'next/server'
import { getAuthCookie } from '@/lib/cookie'
import { verifyToken, isManager } from '@/lib/jwt'
import { db } from '@/lib/db'

// Restaura um documento soft-deleted (apenas coordenação/admin, escopado à escola)
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getAuthCookie()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let payload: Awaited<ReturnType<typeof verifyToken>>
  try { payload = await verifyToken(token) } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!isManager(payload.role) && !payload.isAdmin) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { id } = await params
  const school = payload.isAdmin && !payload.orgSlug ? null
    : await db.school.findFirst({ where: { organization: { slug: payload.orgSlug } }, select: { id: true } })

  const doc = await db.lessDocument.findFirst({
    where: { id: Number(id), deletedAt: { not: null }, ...(school ? { schoolId: school.id } : {}) },
  })
  if (!doc) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  await db.lessDocument.update({ where: { id: doc.id }, data: { deletedAt: null } })
  return NextResponse.json({ ok: true })
}
