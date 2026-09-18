import { NextRequest, NextResponse } from 'next/server'
import { sessaoApi } from '@/lib/auth'
import { db } from '@/lib/db'
import { ALL_DOC_TYPES, type DocType } from '@/lib/doc-types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const s = await sessaoApi()
  if (!s.ok) return s.resposta
  const { payload } = s

  const type  = req.nextUrl.searchParams.get('type')
  const title = (req.nextUrl.searchParams.get('title') ?? '').trim()
  if (!type || !ALL_DOC_TYPES.includes(type as DocType))
    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  if (!title)
    return NextResponse.json({ duplicate: false })

  const school = payload.orgSlug
    ? await db.school.findFirst({ where: { organization: { slug: payload.orgSlug } }, select: { id: true } })
    : null

  const where = school
    ? { schoolId: school.id, userId: payload.userId, type: type as DocType, deletedAt: null }
    : { userId: payload.userId, type: type as DocType, deletedAt: null }

  const doc = await db.lessDocument.findFirst({
    where: { ...where, title: { equals: title, mode: 'insensitive' } },
    select: { id: true, title: true },
  })

  return NextResponse.json({ duplicate: !!doc, doc })
}
