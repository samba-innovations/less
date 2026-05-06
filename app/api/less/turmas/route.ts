import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const school = await db.school.findUnique({ where: { slug: session.schoolSlug } })
  if (!school) return NextResponse.json({ error: 'Escola não encontrada' }, { status: 404 })

  const assignments = await db.teacherAssignment.findMany({
    where:   { userId: session.userId, schoolId: school.id },
    select:  { classId: true },
    distinct: ['classId'],
  })

  const classIds = assignments.map(a => a.classId)

  const classes = await db.class.findMany({
    where:  { id: { in: classIds }, isActive: true },
    select: {
      id:   true,
      name: true,
      grade: { select: { id: true, name: true, level: true, order: true } },
    },
    orderBy: [{ grade: { order: 'asc' } }, { name: 'asc' }],
  })

  return NextResponse.json(classes.map(c => {
    const isEF = c.grade.level === 'EF2' || c.grade.level === 'EF1'
    const ciclo = isEF ? 'fundamental' : 'medio'
    // EM orders 10/11/12 → series 1/2/3; EF orders 6-9 stay as-is
    const serie = String(isEF ? c.grade.order : c.grade.order - 9)
    return { id: c.id, name: c.name, grade: c.grade.name, ciclo, serie }
  }))
}
