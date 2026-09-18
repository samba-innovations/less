export const metadata = { title: 'relatório-síntese' }

import { redirect } from 'next/navigation'
import { exigirEscola } from '@/lib/auth'
import { effectiveRole, isManager } from '@/lib/jwt'
import {
  getRelatorioContext, getCatalogos, getMeusRelatorios,
  getCoordenacaoProfessores, getDesbloqueioPainel,
} from '@/lib/rs'
import { RelatorioSinteseClient } from './RelatorioSinteseClient'

export const dynamic = 'force-dynamic'

export default async function RelatorioSintesePage() {
  const { payload, school } = await exigirEscola()

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
  )
}
