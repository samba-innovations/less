'use server'

import { acaoComEscola } from '@/lib/auth'
import { oeMissoesForClass, type OEMissoesResult } from '@/lib/oe'

// ⚠️ Arquivo 'use server': só pode EXPORTAR funções async. Os tipos vivem em
// '@/lib/oe' e são importados de lá pelos consumidores (não re-exportar aqui —
// `export type` num 'use server' quebra o `next build`, embora o tsc aceite).

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
