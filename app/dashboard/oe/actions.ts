'use server'

import { db } from '@/lib/db'
import { acaoComEscola } from '@/lib/auth'
import { cicloSerieFromGrade, anoDaSerie } from '@/lib/matriz-curricular'

// =============================================================================
// Currículo OE por TURMA — porta a "regra dos livros" da v1 (getOEAllMissoes do
// samba-paper) para a v2, usando o helper canônico cicloSerieFromGrade/anoDaSerie
// (NÃO derivar série de Grade.order — ver matriz-curricular.ts).
//
// Regra dos livros:
//   • 6º/7º/8º/9º EF  → livro do Fundamental (ciclo=fundamental, serie=-1; habilidades serie=9)
//   • 1ª série EM     → MESMO livro do Fundamental (acompanha o 8º/9º)
//   • 2ª/3ª série EM  → livro do Ensino Médio (ciclo=medio, serie=3; habilidades serie=3)
//
// O launcher antigo fixava (ciclo='medio', serie='1') — combinação que NÃO tem
// nenhuma linha no currículo importado (só existem fundamental/-1 e medio/3),
// então nunca carregava missão nenhuma para EF nem para a 1ª série EM.
// =============================================================================

export type OEHabilidade = {
  id: number; codigo: string; descricao: string
  eixoConhecimento: string; eixoCognitivo: number; eixoCognitivoLabel: string | null
  bnccCodigo: string | null
}
export type OEMissaoFull = {
  id: number; missaoNum: number; bimestre: number; tema: string | null
  semanasLabel: string; aulasLabel: string; totalAulas: number
  saebDescritores: string | null; objetivosAprendizagem: string | null; objetosConhecimento: string | null
  habilidades: OEHabilidade[]
}
export type OEMissoesResult = {
  error?: string
  missoes?: OEMissaoFull[]
  ciclo?: string; serieNum?: number; usaLivroEM?: boolean
}

export async function getOEMissoesForClass(
  classId: number, disciplinaTipo: string, bimestre?: number,
): Promise<OEMissoesResult> {
  const { school } = await acaoComEscola()

  const cls = await db.class.findFirst({
    where: { id: classId, schoolId: school.id },
    include: { grade: { select: { name: true, level: true, order: true } } },
  })
  if (!cls) return { error: 'Turma não encontrada.' }

  const { ciclo } = cicloSerieFromGrade(cls.grade)
  const serieNum  = anoDaSerie(cls.grade)

  const usaLivroEM  = ciclo === 'medio' && serieNum >= 2
  const cicloFiltro = usaLivroEM ? 'medio' : 'fundamental'
  const serieFiltro = usaLivroEM ? '3' : '-1'
  const habSerie    = usaLivroEM ? '3' : '9'

  const missoes = await db.lessOeMissao.findMany({
    where: { disciplinaTipo, ciclo: cicloFiltro, serie: serieFiltro, ...(bimestre ? { bimestre } : {}) },
    orderBy: { missaoNum: 'asc' },
    include: { missaoHabilidades: { include: { habilidade: true } } },
  })

  const missoesFull: OEMissaoFull[] = missoes.map(m => ({
    id: m.id, missaoNum: m.missaoNum, bimestre: m.bimestre, tema: m.tema,
    semanasLabel: m.semanasLabel, aulasLabel: m.aulasLabel, totalAulas: m.totalAulas,
    saebDescritores: m.saebDescritores,
    objetivosAprendizagem: m.objetivosAprendizagem,
    objetosConhecimento: m.objetosConhecimento,
    habilidades: m.missaoHabilidades
      .map(mh => mh.habilidade)
      .filter(h => h.serie === habSerie)
      .sort((a, b) =>
        a.eixoConhecimento.localeCompare(b.eixoConhecimento) ||
        (a.eixoCognitivo - b.eixoCognitivo) ||
        a.codigo.localeCompare(b.codigo))
      .map(h => ({
        id: h.id, codigo: h.codigo, descricao: h.descricao,
        eixoConhecimento: h.eixoConhecimento, eixoCognitivo: h.eixoCognitivo,
        eixoCognitivoLabel: h.eixoCognitivoLabel, bnccCodigo: h.bnccCodigo,
      })),
  }))

  return { missoes: missoesFull, ciclo, serieNum, usaLivroEM }
}
