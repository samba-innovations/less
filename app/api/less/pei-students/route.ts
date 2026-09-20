import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { isManager, effectiveRole } from '@/lib/jwt'
import { anoDaSerie } from '@/lib/matriz-curricular'

export const dynamic = 'force-dynamic'

/**
 * Rótulo de turma no formato do less ("8ªA", "1ªC"). O control guarda só a
 * seção em Class.name; sem a série o editor não encontra a turma e as
 * disciplinas ficam vazias. Mesma regra do mapClass em /api/less/turmas.
 */
function turmaLabel(secao: string | null, nomeSerie: string | null, level: string | null, order: number | null): string {
  const nome = (secao ?? '').trim()
  if (!nome) return ''
  if (/^\d/.test(nome)) return nome            // já veio completo
  if (nomeSerie == null || level == null || order == null) return nome
  return `${anoDaSerie({ name: nomeSerie, level, order })}ª${nome}`
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const school = await db.school.findFirst({ where: { organization: { slug: session.orgSlug } } })
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

  // Alunos marcados como PEI no control — é lá que fica o cadastro do aluno.
  // StudentPei é model do control; aqui vai por SQL direto para não importar o
  // model inteiro no schema do less (mesmo padrão usado com Bimestre).
  const doControl = await db.$queryRaw<Array<{
    id: number; name: string; ra: string | null
    secao: string | null; gradeName: string | null; gradeLevel: string | null; gradeOrder: number | null
  }>>`
    SELECT sp.id, s.name, s.ra,
           c.name AS secao, g.name AS "gradeName", g.level AS "gradeLevel", g."order" AS "gradeOrder"
    FROM "StudentPei" sp
    JOIN "Student" s ON s.id = sp."studentId"
    LEFT JOIN "StudentEnrollment" e ON e."studentId" = s.id
    LEFT JOIN "Class" c ON c.id = e."classId"
    LEFT JOIN "Grade" g ON g.id = c."gradeId"
    WHERE sp."schoolId" = ${school.id}
      AND sp."isActive" = true
      AND sp."deletedAt" IS NULL
  `.catch(() => [])

  // Faixa separada de ids: os dois cadastros são sequências independentes e
  // colidiriam. O id só referencia a seleção — nome, RA e turma é que contam.
  const CONTROL_ID_OFFSET = 1_000_000
  const jaListados = new Set(students.map(s => (s.ra ?? '').trim()).filter(Boolean))

  const extras = doControl
    .filter(r => !jaListados.has((r.ra ?? '').trim()))
    .map(r => ({
      id:               CONTROL_ID_OFFSET + r.id,
      name:             r.name,
      ra:               r.ra ?? '',
      turma:            turmaLabel(r.secao, r.gradeName, r.gradeLevel, r.gradeOrder),
      diagnostico:      null,
      profColaborativo: null,
      profAee:          null,
    }))

  const todos = [...students, ...extras].sort((a, b) =>
    (a.turma ?? '').localeCompare(b.turma ?? '') || a.name.localeCompare(b.name))

  return NextResponse.json(todos)
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session || (!isManager(effectiveRole(session))))
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const school = await db.school.findFirst({ where: { organization: { slug: session.orgSlug } } })
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
