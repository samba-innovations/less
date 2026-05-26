import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const school = await db.school.findFirst({ where: { organization: { slug: session.orgSlug } } })
  if (!school) return NextResponse.json({ error: 'Escola não encontrada' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const classId = Number(searchParams.get('classId'))
  if (!classId) return NextResponse.json({ error: 'classId obrigatório' }, { status: 400 })

  const assignments = await db.teacherAssignment.findMany({
    where:  { userId: session.userId, schoolId: school.id, classId },
    select: { discipline: { select: { id: true, name: true, aulasNome: true } } },
  })

  const disciplines = assignments.map(a => ({
    id:        a.discipline.id,
    name:      a.discipline.name,
    aulasNome: a.discipline.aulasNome ?? a.discipline.name,
  }))

  return NextResponse.json(disciplines)
}
