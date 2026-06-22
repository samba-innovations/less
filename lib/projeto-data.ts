// Projeto científico — dados (ported from samba-paper v1)

export const GRANDES_AREAS_PROJ = [
  'Ciências Exatas', 'Ciências da Natureza', 'Ciências Humanas', 'Sociais Aplicadas',
  'Linguagens', 'Engenharias', 'Saúde', 'Multidisciplinar',
]

export const SUBAREAS_PROJ: Record<string, string[]> = {
  'Ciências Exatas':      ['Matemática', 'Física', 'Química', 'Estatística', 'Computação'],
  'Ciências da Natureza': ['Ecologia', 'Biologia', 'Química', 'Física', 'Geociências'],
  'Ciências Humanas':     ['Sociologia', 'Filosofia', 'História', 'Geografia', 'Psicologia'],
  'Sociais Aplicadas':    ['Direito', 'Economia', 'Administração', 'Comunicação'],
  'Linguagens':           ['Produção textual', 'Literatura', 'Comunicação', 'Língua Inglesa', 'Arte'],
  'Engenharias':          ['Robótica', 'Programação', 'Eletrônica', 'Sustentabilidade'],
  'Saúde':                ['Biologia', 'Educação Física', 'Nutrição', 'Saúde Mental'],
  'Multidisciplinar':     ['STEAM', 'Projeto de Vida', 'Empreendedorismo', 'Inovação Social'],
}

export const LINHAS_PROJ = [
  { value: 'Pesquisa teórica',           desc: 'Revisão e análise bibliográfica' },
  { value: 'Pesquisa aplicada',          desc: 'Investigação com coleta de dados' },
  { value: 'Desenvolvimento de produto', desc: 'Protótipo, app ou artefato' },
  { value: 'Intervenção social',         desc: 'Ação em comunidade ou escola' },
  { value: 'Análise de dados',           desc: 'Tratamento e visualização de dados' },
  { value: 'Estudo de caso',             desc: 'Aprofundamento em situação específica' },
  { value: 'Relato de experiência',      desc: 'Narrativa de vivência ou experimento' },
  { value: 'Revisão bibliográfica',      desc: 'Síntese do estado da arte' },
]

export const TIPOS_PROJ = ['Projeto de Pesquisa', 'Projeto Interdisciplinar', 'Intervenção', 'Extensão']
export const ACOES_PROJ = ['Analisar','Desenvolver','Investigar','Comparar','Mapear','Produzir','Avaliar','Propor','Implementar','Relatar']
export const RECURSOS_PROJ = ['Literatura científica','Questionários','Entrevistas','Observação de campo','Laboratório','Computador / Software','Câmera / Vídeo','Materiais de baixo custo','Dados públicos','Plataformas digitais']

const PT_STOP = new Set([
  'a','o','as','os','um','uma','uns','umas','de','do','da','dos','das','em','no','na','nos','nas',
  'por','para','com','sem','sob','sobre','que','e','ou','mas','se','ao','à','aos','às','pelo','pela',
  'este','esta','estes','estas','esse','essa','esses','essas','como','mais','muito','ser','ter','foi',
  'são','está','entre','deve','pode','será','não','também','quando','onde','porque','através','partir',
  'forma','meio','modo','sendo','tendo','fazer','cada','outro','outra','isso','isto','aquele','aquela',
])

export function suggestKeywords(c: Record<string, string>): string[] {
  const raw = [
    c.grande_area, c.subarea, c.linha_aplicacao,
    c.problema, c.justificativa, c.objetivo_geral,
    c.objetivos_especificos, c.metodologia, c.resultados, c.impacto,
  ].filter(Boolean).join(' ')

  const words = raw.toLowerCase().replace(/[^\wÀ-ÿ\s]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !PT_STOP.has(w))
  const freq = new Map<string, number>()
  words.forEach(w => freq.set(w, (freq.get(w) ?? 0) + 1))
  const extras = [c.subarea, c.grande_area].filter(Boolean) as string[]
  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([w]) => w)
  return [...new Set([...extras, ...sorted])].slice(0, 5)
}

export function currentSemestre() {
  const y = new Date().getFullYear()
  return (new Date().getMonth() + 1) <= 6 ? `1º Semestre ${y}` : `2º Semestre ${y}`
}
