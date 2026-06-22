import { NextRequest, NextResponse } from 'next/server'
import { getAuthCookie } from '@/lib/cookie'
import { verifyToken } from '@/lib/jwt'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getAuthCookie()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let payload: Awaited<ReturnType<typeof verifyToken>>
  try { payload = await verifyToken(token) } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { id } = await params
  const studentId = Number(id)
  if (!studentId) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  // Scoping multi-tenant: o aluno deve pertencer à escola da sessão (LGPD — dados de menores e responsáveis)
  const school = payload.isAdmin && !payload.orgSlug
    ? null
    : await db.school.findFirst({ where: { organization: { slug: payload.orgSlug } }, select: { id: true } })
  if (!school && !payload.isAdmin) return NextResponse.json({ error: 'Escola não encontrada' }, { status: 404 })

  const student = await db.student.findFirst({
    where: { id: studentId, ...(school ? { schoolId: school.id } : {}) },
    include: {
      enrollments: {
        include: { class: { include: { grade: { select: { name: true } } } } },
        take: 5,
      },      responsibles: { orderBy: { id: 'asc' } },    },
  })

  if (!student) return NextResponse.json({ error: 'not found' }, { status: 404 })

  return NextResponse.json({
    id:          student.id,
    name:        student.name,
    ra:          student.ra,
    birthDate:   student.birthDate ? student.birthDate.toISOString() : null,
    photoUrl:    student.photoUrl ?? null,
    isActive:    student.isActive,
    enrollments: student.enrollments,
    responsibles: student.responsibles,
  })
}