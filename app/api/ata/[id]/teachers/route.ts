import { NextRequest, NextResponse } from 'next/server'
import { getAuthCookie } from '@/lib/cookie'
import { verifyToken, canCreateAta } from '@/lib/jwt'
import { db } from '@/lib/db'

// Retorna professores vinculados a uma turma (para a aba de assinaturas da ATA)
export async function GET(req: NextRequest) {
  const token = await getAuthCookie()
  if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  let payload: Awaited<ReturnType<typeof verifyToken>>
  try { payload = await verifyToken(token) } catch { return NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) }
  if (!canCreateAta(payload.role) && !payload.isAdmin) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const classId = Number(new URL(req.url).searchParams.get('classId'))
  if (!classId) return NextResponse.json({ teachers: [] })

  const assignments = await db.teacherAssignment.findMany({
    where:   { classId },
    include: { user: { select: { name: true } }, discipline: { select: { name: true } } },
    orderBy: { user: { name: 'asc' } },
  })

  // dedup por (nome + disciplina)
  const seen = new Set<string>()
  const teachers = assignments
    .map(a => ({ name: a.user.name, discipline: a.discipline.name }))
    .filter(t => { const k = `${t.name}|${t.discipline}`; if (seen.has(k)) return false; seen.add(k); return true })

  return NextResponse.json({ teachers })
}
