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

export function ehFundamental(level: string | null | undefined): boolean {
  return level === 'EF1' || level === 'EF2'
}

/**
 * Número do ano/série, lido do NOME da série: "6º ano EF" → 6, "1ª série EM" → 1.
 *
 * NÃO derive isto de `Grade.order`. Quem cria as séries é o control, e lá o
 * `order` é só a ordem de exibição, que nasce 1..N por template — em
 * `onboarding-templates.ts`, "6º ano EF" e "1ª série EM" têm ambos order 1.
 *
 * O less tratava `order` como se fosse o ano escolar (EF) ou 9+ano (EM). Numa
 * escola configurada pelo control isso rotulava o 6º ano como "1ªA" e a 1ª
 * série EM como "-4ªA" — e, pior que o rótulo feio, mandava série negativa
 * para a busca na matriz, que então não achava aula nenhuma.
 */
export function anoDaSerie(grade: { name: string; level: string; order: number }): number {
  const m = /\d+/.exec(grade.name ?? '')
  // Sem número no nome não há de onde tirar; o order ao menos ordena.
  return m ? Number(m[0]) : grade.order
}

/** Deriva ciclo/serie a partir do grade da v2 (level EF1/EF2/EM + nome). */
export function cicloSerieFromGrade(grade: { name: string; level: string; order: number }): { ciclo: string; serie: string } {
  return { ciclo: ehFundamental(grade.level) ? 'fundamental' : 'medio', serie: String(anoDaSerie(grade)) }
}
