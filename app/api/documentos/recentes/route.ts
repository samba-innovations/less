import { NextRequest, NextResponse } from 'next/server'
import { getAuthCookie } from '@/lib/cookie'
import { verifyToken } from '@/lib/jwt'
import { db } from '@/lib/db'
import { ALL_DOC_TYPES, type DocType } from '@/lib/doc-types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = await getAuthCookie()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let payload
  try { payload = await verifyToken(token) } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const type  = req.nextUrl.searchParams.get('type')
  const limit = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get('limit') ?? '5', 10) || 5, 1), 20)
  if (!type || !ALL_DOC_TYPES.includes(type as DocType))
    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })

  const school = payload.orgSlug
    ? await db.school.findFirst({ where: { organization: { slug: payload.orgSlug } }, select: { id: true } })
    : null

  const where = school
    ? { schoolId: school.id, userId: payload.userId, type: type as DocType, deletedAt: null }
    : { userId: payload.userId, type: type as DocType, deletedAt: null }

  const docs = await db.lessDocument.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: { id: true, title: true, content: true, updatedAt: true },
  })

  return NextResponse.json(docs)
}
