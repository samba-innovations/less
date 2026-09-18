export const metadata = { title: 'diagnóstico de turma' }

import { redirect } from 'next/navigation'
import { exigirEscola } from '@/lib/auth'
import { effectiveRole, isManager } from '@/lib/jwt'
import { getTurmasParaDiagnostico } from '@/lib/diagnostico'
import { DiagnosticoTurmaClient } from './DiagnosticoTurmaClient'

export const dynamic = 'force-dynamic'

export default async function DiagnosticoTurmaPage() {
  const { payload, school } = await exigirEscola()

  const canManage = isManager(effectiveRole(payload))
  if (!canManage) redirect('/dashboard')

  const r = await getTurmasParaDiagnostico()

  return <DiagnosticoTurmaClient turmas={r.turmas ?? []} canManage={canManage} />
}
