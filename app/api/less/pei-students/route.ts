import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { isManager } from '@/lib/jwt'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const school = await db.school.findUnique({ where: { slug: session.schoolSlug } })
  if (!school) return NextResponse.json({ error: 'Escola não encontrada' }, { status: 404 })

  const students = await db.lessPeiStudent.findMany({
    where:   { schoolId: school.id, ativo: true },
    select:  {
      id:               true,
      name:             true,
      ra:               true,
      turma:            true,
      diagnostico:      true,
      profColaborativo: true,
      profAee:          true,
    },
    orderBy: [{ turma: 'asc' }, { name: 'asc' }],
  })

  return NextResponse.json(students)
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session || !isManager(session.role))
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const school = await db.school.findUnique({ where: { slug: session.schoolSlug } })
  if (!school) return NextResponse.json({ error: 'Escola não encontrada' }, { status: 404 })

  const body = await req.json()
  const { name, ra, turma, diagnostico, profColaborativo, profAee, dataNascimento } = body

  if (!name?.trim() || !ra?.trim() || !turma?.trim()) {
    return NextResponse.json({ error: 'Nome, RA e turma são obrigatórios' }, { status: 400 })
  }

  const student = await db.lessPeiStudent.create({
    data: {
      schoolId: school.id,
      name: name.trim(),
      ra: ra.trim(),
      turma: turma.trim(),
      diagnostico: diagnostico?.trim() || null,
      profColaborativo: profColaborativo?.trim() || null,
      profAee: profAee?.trim() || null,
      dataNascimento: dataNascimento?.trim() || null,
    },
  })

  return NextResponse.json(student, { status: 201 })
}
