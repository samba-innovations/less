import { NextRequest, NextResponse } from 'next/server'
import { getAuthCookie } from '@/lib/cookie'
import { verifyToken, isManager } from '@/lib/jwt'
import { db } from '@/lib/db'
import { generatePdf } from '@/lib/pdf'
import type { DocType } from '@/lib/doc-types'

async function auth() {
  const token = await getAuthCookie()
  if (!token) return null
  try {
    const payload = await verifyToken(token)
    const school  = await db.school.findUnique({ where: { slug: payload.schoolSlug } })
    return school ? { payload, school } : null
  } catch { return null }
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await auth()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const manager = isManager(ctx.payload.role) || ctx.payload.isAdmin

  const doc = await db.lessDocument.findFirst({
    where: {
      id:       Number(id),
      schoolId: ctx.school.id,
      ...(manager ? {} : { userId: ctx.payload.userId }),
    },
    include: { user: { select: { name: true } } },
  })
  if (!doc) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  const buffer = await generatePdf({
    type:       doc.type as DocType,
    title:      doc.title,
    content:    doc.content as Record<string, string>,
    schoolName: ctx.school.name,
    authorName: doc.user.name,
    createdAt:  new Date(),
  })

  await db.lessDocument.update({
    where: { id: doc.id },
    data:  { status: 'FINAL' },
  })

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${doc.id}.pdf"`,
    },
  })
}
