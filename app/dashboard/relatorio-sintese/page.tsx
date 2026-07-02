export const metadata = { title: 'relatório-síntese' }

import { redirect } from 'next/navigation'
import { getAuthCookie } from '@/lib/cookie'
import { verifyToken, effectiveRole, isManager } from '@/lib/jwt'
import { getSchoolFromPayload } from '@/lib/school'
import {
  getRelatorioContext, getCatalogos, getMeusRelatorios,
  getCoordenacaoProfessores, getDesbloqueioPainel,
} from '@/lib/rs'
import { RelatorioSinteseClient } from './RelatorioSinteseClient'

export const dynamic = 'force-dynamic'

export default async function RelatorioSintesePage() {
  const token = await getAuthCookie()
  if (!token) redirect(process.env.NEXT_PUBLIC_SSO_URL + '/login')
  const payload = await verifyToken(token)
  const school = await getSchoolFromPayload(payload)
  if (!school) redirect(process.env.NEXT_PUBLIC_SSO_URL + '/login')

  const role = effectiveRole(payload)
  const canView = isManager(role)
  const canProduce = canView || ['TEACHER', 'TEACHER_COORDINATOR'].includes((payload.role ?? '').toUpperCase())
  if (!canProduce && !canView) redirect('/dashboard')

  const [ctxR, catR, meus, coordR, desbR] = await Promise.all([
    canProduce ? getRelatorioContext() : Promise.resolve({ ctx: undefined }),
    getCatalogos(),
    canProduce ? getMeusRelatorios() : Promise.resolve([]),
    canView ? getCoordenacaoProfessores() : Promise.resolve({ professores: undefined }),
    canView ? getDesbloqueioPainel() : Promise.resolve({ painel: undefined }),
  ])

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>relatório-síntese</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' }}>apontamento pedagógico por disciplina e turma</p>
      </div>
      <RelatorioSinteseClient
        ctx={ctxR.ctx ?? null}
        catalogos={catR.catalogos ?? null}
        meus={(meus ?? []).map(m => ({ ...m, updatedAt: (m.updatedAt as Date).toISOString?.() ?? String(m.updatedAt) }))}
        professores={coordR.professores ?? null}
        desbloqueio={desbR.painel ?? null}
        canProduce={canProduce}
        canView={canView}
        canManage={canView}
      />
    </div>
  )
}
