export const metadata = { title: 'orientação de estudos' }
export const dynamic  = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { canAccessOECard, effectiveRole } from '@/lib/jwt'
import { OEClient } from './OEClient'

export default async function OEPage() {
  const session = await getSession()
  if (!session) redirect(process.env.NEXT_PUBLIC_SSO_URL + '/login')

  if (!canAccessOECard(effectiveRole(session))) {
    redirect('/dashboard')
  }

  const school = await db.school.findFirst({
    where: { organization: { slug: session.orgSlug } },
    select: { id: true },
  })
  if (!school) redirect(process.env.NEXT_PUBLIC_SSO_URL + '/login')

  // Find OE disciplines assigned to this teacher (disciplines with 'OE' or 'Orientação' in name)
  const assignments = await db.teacherAssignment.findMany({
    where: {
      userId:   session.userId,
      schoolId: school.id,
      discipline: {
        OR: [
          { name: { contains: 'OE', mode: 'insensitive' } },
          { name: { contains: 'Orientação', mode: 'insensitive' } },
          { name: { contains: 'Orientacao', mode: 'insensitive' } },
          { type: 'REGULAR', aulasNome: { not: null } },
        ],
      },
    },
    include: {
      discipline: { select: { id: true, name: true, aulasNome: true } },
      class:      { select: { id: true, name: true, grade: { select: { name: true } } } },
    },
  })

  // Agrupa por disciplina, carregando as TURMAS de cada uma. A turma é o que dá a
  // série → o roteamento do livro OE (regra dos livros em actions.ts). Antes o
  // page colapsava em `distinct: disciplineId`, perdia a turma, e o client fixava
  // série=1 (sem currículo). Agora o professor escolhe disciplina → turma.
  const porDisc = new Map<number, {
    id: number; name: string; aulasNome: string | null
    turmas: { id: number; name: string; gradeName: string }[]
  }>()
  for (const a of assignments) {
    let d = porDisc.get(a.discipline.id)
    if (!d) { d = { id: a.discipline.id, name: a.discipline.name, aulasNome: a.discipline.aulasNome, turmas: [] }; porDisc.set(a.discipline.id, d) }
    if (!d.turmas.some(t => t.id === a.class.id)) {
      d.turmas.push({ id: a.class.id, name: a.class.name, gradeName: a.class.grade.name })
    }
  }
  const disciplinasOE = [...porDisc.values()]

  return (
    <OEClient
      disciplinasOE={disciplinasOE}
      role={session.role}
      isAdmin={session.isAdmin}
    />
  )
}
