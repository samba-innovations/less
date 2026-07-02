// Constantes e tipos do Relatório-Síntese (migrado do samba-paper v1). Sem 'use server'.

export const ENABLED_BIMESTRES = [1, 2]

export function periodoLabel(bimestres: number[]): string {
  const b = [...new Set((bimestres ?? []).map(Number))].filter(x => Number.isFinite(x)).sort((a, z) => a - z)
  if (b.length === 0) return '—'
  if (b.includes(1) && b.includes(2)) return '1º semestre'
  if (b.includes(3) && b.includes(4)) return '2º semestre'
  return b.map(x => `${x}º bimestre`).join(' e ')
}

export type RsTurma = { classId: number; name: string }
export type RsGrade = { gradeId: number; gradeLabel: string; ciclo: string; serie: string; turmas: RsTurma[] }
export type RsDisciplina = { disciplineId: number; name: string; disciplinaNome: string; grades: RsGrade[] }
export type RsContext = { professorNome: string; disciplinas: RsDisciplina[] }
export type RsAprendizagem = {
  tipo: 'AE' | 'HAB'; codigo: string; descricao: string; eixo?: string | null
  habilidade?: string | null
  descritores?: string[]
  descritoresPos?: string[]
  descritoresNeg?: string[]
}

export const DESCRITORES_POS_MAX = 2
export const DESCRITORES_NEG_MAX = 2
export type Valencia = 'pos' | 'neg'

export type Nivel = 'leve' | 'moderado' | 'acentuado'
export const NIVEIS: Nivel[] = ['leve', 'moderado', 'acentuado']
export const NIVEL_LABEL: Record<Nivel, string> = { leve: 'Leve', moderado: 'Moderado', acentuado: 'Acentuado' }

export type RsCategoriaT = { id: string; nome: string; cor: string; icone: string }
export type RsDificuldadeT = {
  id: string; categoriaId: string; titulo: string; descricaoCurta: string; descricaoCompleta: string
  textoRelatorio: string; nivel: { leve?: string; moderado?: string; acentuado?: string }
  indicadores: string[]; possiveisCausas: string[]; intervencoesSugeridas: string[]; competencias: string[]
  cor: string; icone: string
}
export type RsIntervencaoT = {
  id: string; categoria: string; titulo: string; objetivo: string; textoRelatorio: string; indicadaPara: string[]
}
export type RsCatalogos = { categorias: RsCategoriaT[]; dificuldades: RsDificuldadeT[]; intervencoes: RsIntervencaoT[] }

export type DificuldadeSel = { descritorId: string; nivel: Nivel } | { outro: string }
export type EstrategiaSel = { intervencaoId: string } | { outro: string }

export type CoordRelatorio = {
  id: number; title: string; status: string; updatedAt: string
  disciplinaLabel: string; serie: string; bimestre: number | null
}
export type CoordProfessor = { id: number; name: string; temDisciplinaElegivel: boolean; relatorios: CoordRelatorio[] }
export type DesbloqueioGrade = { gradeId: number; label: string; level: string; yearNumber: number }
export type DesbloqueioPainel = { ano: number; grades: DesbloqueioGrade[]; unlocks: { gradeId: number; bimestre: number }[] }

export const REFERENCIAS_PADRAO = `BRASIL. Ministério da Educação. Base Nacional Comum Curricular (BNCC). Brasília: MEC, 2018.

SÃO PAULO (Estado). Secretaria da Educação. Currículo Paulista: Etapa Ensino Médio. São Paulo: SEDUC-SP, 2020.

SÃO PAULO (Estado). Secretaria da Educação. Currículo de Educação Digital e Midiática. São Paulo: SEDUC-SP, 2025.

BLACK, Paul; WILIAM, Dylan. Inside the Black Box: Raising Standards Through Classroom Assessment. London: GL Assessment, 1998.

DEHAENE, Stanislas. Como Aprendemos. São Paulo: Contexto, 2020.

FREIRE, Paulo. Pedagogia da Autonomia. 66. ed. Rio de Janeiro: Paz e Terra, 2021.

HATTIE, John. Aprendizagem Visível para Professores. Porto Alegre: Penso, 2017.

LUCKESI, Cipriano Carlos. Avaliação da Aprendizagem Escolar. 22. ed. São Paulo: Cortez, 2018.

MORAN, José. Metodologias Ativas para uma Educação Inovadora. Porto Alegre: Penso, 2018.

PERRENOUD, Philippe. Dez Novas Competências para Ensinar. Porto Alegre: Artmed, 2000.`
