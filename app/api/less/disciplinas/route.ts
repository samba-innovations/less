import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { isManager, effectiveRole } from '@/lib/jwt'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const classId = Number(searchParams.get('classId'))
  if (!classId) return NextResponse.json({ error: 'classId obrigatório' }, { status: 400 })

  const manager = isManager(effectiveRole(session))

  type Disc = { id: number; name: string; aulasNome: string | null }

  // Gestor/admin: todas as disciplinas da turma. Fonte = união de ClassDiscipline
  // (vínculo oficial) + TeacherAssignment (disciplinas com professor). Em produção
  // ClassDiscipline pode estar vazia, então o TeacherAssignment garante a lista.
  if (manager) {
    const [cds, tas] = await Promise.all([
      db.classDiscipline.findMany({
        where:  { classId },
        select: { discipline: { select: { id: true, name: true, aulasNome: true } } },
      }),
      db.teacherAssignment.findMany({
        where:  { classId },
        select: { discipline: { select: { id: true, name: true, aulasNome: true } } },
      }),
    ])

    const byId = new Map<number, Disc>()
    for (const x of [...cds, ...tas]) byId.set(x.discipline.id, x.discipline)

    const disciplines = [...byId.values()]
      .map(d => ({ id: d.id, name: d.name, aulasNome: d.aulasNome ?? d.name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

    return NextResponse.json(disciplines)
  }

  const school = await db.school.findFirst({ where: { organization: { slug: session.orgSlug } } })
  if (!school) return NextResponse.json({ error: 'Escola não encontrada' }, { status: 404 })

  const assignments = await db.teacherAssignment.findMany({
    where:  { userId: session.userId, schoolId: school.id, classId },
    select: { discipline: { select: { id: true, name: true, aulasNome: true } } },
  })

  return NextResponse.json(assignments.map(a => ({
    id:        a.discipline.id,
    name:      a.discipline.name,
    aulasNome: a.discipline.aulasNome ?? a.discipline.name,
  })))
}
