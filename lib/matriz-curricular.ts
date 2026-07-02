// Matriz curricular oficial (SP/PEI) que exige o Relatório-Síntese. (migrado do v1)
// EF (anos finais): Base Nacional Comum. EM: Formação Geral Básica.
// Itinerários/aprofundamento/parte diversificada NÃO entram.

export function norm(s: string): string {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim()
}

const MATRIZ_EF = new Set([
  'LINGUA PORTUGUESA', 'LINGUA INGLESA', 'INGLES',
  'MATEMATICA', 'ENSINO RELIGIOSO', 'CIENCIAS', 'GEOGRAFIA', 'HISTORIA',
  'ARTE', 'EDUCACAO FISICA',
])
const MATRIZ_EM = new Set([
  'LINGUA PORTUGUESA', 'REDACAO E LEITURA', 'LINGUA INGLESA', 'INGLES',
  'MATEMATICA', 'EDUCACAO FINANCEIRA', 'BIOLOGIA', 'FISICA',
  'QUIMICA', 'FILOSOFIA', 'GEOGRAFIA', 'HISTORIA', 'SOCIOLOGIA',
  'ARTE', 'EDUCACAO FISICA',
])

/** ciclo: 'medio' | 'fundamental' (derive do grade.level da v2 antes de chamar). */
export function disciplinaElegivel(nome: string, ciclo: string): boolean {
  return (ciclo === 'medio' ? MATRIZ_EM : MATRIZ_EF).has(norm(nome))
}

export function disciplinaEmMatriz(nome: string): boolean {
  const n = norm(nome)
  return MATRIZ_EF.has(n) || MATRIZ_EM.has(n)
}

/** Deriva ciclo/serie a partir do grade da v2 (level EF1/EF2/EM + order). */
export function cicloSerieFromGrade(grade: { level: string; order: number }): { ciclo: string; serie: string } {
  const isEF = grade.level === 'EF1' || grade.level === 'EF2'
  return { ciclo: isEF ? 'fundamental' : 'medio', serie: String(isEF ? grade.order : grade.order - 9) }
}
