import { NextRequest, NextResponse } from 'next/server'
import { apiComEscola } from '@/lib/auth'
import { oeMissoesForClass } from '@/lib/oe'

// GET /api/less/oe-curriculo?classId=&disciplinaTipo=&bimestre=
// Missões OE + habilidades da turma, com a regra dos livros aplicada (lib/oe.ts).
// Usado pelo editor do plano de aula OE (EditorClient).
export async function GET(req: NextRequest) {
  const s = await apiComEscola()
  if (!s.ok) return s.resposta

  const { searchParams } = new URL(req.url)
  const classId        = Number(searchParams.get('classId') ?? '')
  const disciplinaTipo = searchParams.get('disciplinaTipo') ?? ''
  const bimestre       = searchParams.get('bimestre') ? Number(searchParams.get('bimestre')) : undefined

  if (!classId || !disciplinaTipo) {
    return NextResponse.json({ error: 'classId e disciplinaTipo são obrigatórios.' }, { status: 400 })
  }

  const r = await oeMissoesForClass(s.school.id, classId, disciplinaTipo, bimestre)
  if (r.error) return NextResponse.json({ error: r.error }, { status: 404 })
  return NextResponse.json(r)
}
