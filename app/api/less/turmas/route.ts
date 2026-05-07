import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { isManager } from '@/lib/jwt'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  // Admin global sem escola: retorna turmas de todas as escolas com info da escola
  if (session.isAdmin && !session.schoolSlug) {
    const { searchParams } = new URL(req.url)
    const schoolSlug = searchParams.get('school')

    if (!schoolSlug) {
      // Retorna lista de escolas para o admin escolher
      const schools = await db.school.findMany({
        select: { id: true, slug: true, name: true },
        orderBy: { name: 'asc' },
      })
      return NextResponse.json({ needsSchool: true, schools })
    }

    const school = await db.school.findUnique({ where: { slug: schoolSlug } })
    if (!school) return NextResponse.json([], { status: 200 })

    const classes = await db.class.findMany({
      where:  { schoolId: school.id, isActive: true },
      select: { id: true, name: true, grade: { select: { name: true, level: true, order: true } } },
      orderBy: [{ grade: { order: 'asc' } }, { name: 'asc' }],
    })
    return NextResponse.json(classes.map(c => mapClass(c)))
  }

  const school = await db.school.findUnique({ where: { slug: session.schoolSlug } })
  if (!school) return NextResponse.json([], { status: 200 })

  let classIds: number[]

  if (isManager(session.role)) {
    const allClasses = await db.class.findMany({
      where:  { schoolId: school.id, isActive: true },
      select: { id: true },
    })
    classIds = allClasses.map(c => c.id)
  } else {
    const assignments = await db.teacherAssignment.findMany({
      where:    { userId: session.userId, schoolId: school.id },
      select:   { classId: true },
      distinct: ['classId'],
    })
    classIds = assignments.map(a => a.classId)
  }

  if (classIds.length === 0) return NextResponse.json([])

  const classes = await db.class.findMany({
    where:  { id: { in: classIds }, isActive: true },
    select: { id: true, name: true, grade: { select: { name: true, level: true, order: true } } },
    orderBy: [{ grade: { order: 'asc' } }, { name: 'asc' }],
  })

  return NextResponse.json(classes.map(c => mapClass(c)))
}

function mapClass(c: { id: number; name: string; grade: { name: string; level: string; order: number } }) {
  const isEF = c.grade.level === 'EF2' || c.grade.level === 'EF1'
  const ciclo = isEF ? 'fundamental' : 'medio'
  const serie = String(isEF ? c.grade.order : c.grade.order - 9)
  return { id: c.id, name: c.name, grade: c.grade.name, ciclo, serie }
}
