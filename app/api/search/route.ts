import { NextRequest, NextResponse } from 'next/server'
import { getAuthCookie } from '@/lib/cookie'
import { verifyToken } from '@/lib/jwt'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = await getAuthCookie()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let payload: Awaited<ReturnType<typeof verifyToken>>
  try { payload = await verifyToken(token) } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()
  if (q.length < 2) return NextResponse.json({ students: [], classes: [], teachers: [] })

  // Scoping multi-tenant (LGPD) — busca restrita à escola/organização da sessão
  const school = payload.isAdmin && !payload.orgSlug
    ? null
    : await db.school.findFirst({ where: { organization: { slug: payload.orgSlug } }, select: { id: true, organizationId: true } })
  if (!school && !payload.isAdmin) return NextResponse.json({ students: [], classes: [], teachers: [] })

  const limit = 6
  const schoolFilter = school ? { schoolId: school.id } : {}

  const studentRows = await db.student.findMany({
    where: {
      isActive: true,
      ...schoolFilter,
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { ra:   { contains: q, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, ra: true },
    take: limit,
    orderBy: { name: 'asc' },
  })
  const students = studentRows.map(st => ({
    kind: 'student' as const,
    label: st.name,
    href:  `?view=${st.id}`,
    sub:   st.ra ?? '',
  }))

  const classRows = await db.class.findMany({
    where: {
      ...schoolFilter,
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { grade: { name: { contains: q, mode: 'insensitive' } } },
      ],
    },
    include: { grade: { select: { name: true } } },
    take: limit,
    orderBy: { name: 'asc' },
  })
  const classes = classRows.map(c => ({
    kind: 'class' as const,
    label: `${c.grade.name} ${c.name}`,
    href:  `/dashboard/turmas/${c.id}`,
    sub:   c.shift ?? '',
  }))

  const teacherRows = await db.user.findMany({
    where: {
      name:     { contains: q, mode: 'insensitive' },
      orgRoles: { some: {
        role: { in: ['TEACHER', 'TEACHER_COORDINATOR'] },
        ...(school ? { organizationId: school.organizationId } : {}),
      } },
    },
    select: { id: true, name: true, email: true },
    take: limit,
  })
  const teachers = teacherRows.map(t => ({
    kind: 'teacher' as const,
    label: t.name,
    href:  `/dashboard/professores?q=${encodeURIComponent(t.name)}`,
    sub:   'professor',
  }))

  return NextResponse.json({ students, classes, teachers })
}