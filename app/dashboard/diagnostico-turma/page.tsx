export const metadata = { title: 'diagnóstico de turma' }

import { redirect } from 'next/navigation'
import { getAuthCookie } from '@/lib/cookie'
import { verifyToken, effectiveRole, isManager } from '@/lib/jwt'
import { getSchoolFromPayload } from '@/lib/school'
import { getTurmasParaDiagnostico } from '@/lib/diagnostico'
import { DiagnosticoTurmaClient } from './DiagnosticoTurmaClient'

export const dynamic = 'force-dynamic'

export default async function DiagnosticoTurmaPage() {
  const token = await getAuthCookie()
  if (!token) redirect(process.env.NEXT_PUBLIC_SSO_URL + '/login')
  const payload = await verifyToken(token)
  const school = await getSchoolFromPayload(payload)
  if (!school) redirect(process.env.NEXT_PUBLIC_SSO_URL + '/login')

  const canManage = isManager(effectiveRole(payload))
  if (!canManage) redirect('/dashboard')

  const r = await getTurmasParaDiagnostico()

  return <DiagnosticoTurmaClient turmas={r.turmas ?? []} canManage={canManage} />
}
