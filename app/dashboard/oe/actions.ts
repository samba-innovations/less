'use server'

import { acaoComEscola } from '@/lib/auth'
import { oeMissoesForClass, type OEMissoesResult, type OEMissaoFull, type OEHabilidade } from '@/lib/oe'

export type { OEMissoesResult, OEMissaoFull, OEHabilidade }

/**
 * Missões OE de uma turma aplicando a regra dos livros (ver lib/oe.ts).
 * Usado pelo launcher /dashboard/oe. O editor do plano usa a rota
 * /api/less/oe-curriculo (mesma lógica, via useFetch).
 */
export async function getOEMissoesForClass(
  classId: number, disciplinaTipo: string, bimestre?: number,
): Promise<OEMissoesResult> {
  const { school } = await acaoComEscola()
  return oeMissoesForClass(school.id, classId, disciplinaTipo, bimestre)
}
