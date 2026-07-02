// Tipos do Relatório Diagnóstico da Turma (migrado do samba-paper v1). Sem 'use server'.

export type DtTurma = {
  classId: number; className: string; gradeId: number; gradeLabel: string; ciclo: string; serie: string
  totalDisciplinas: number; entregues: number
  diagnosticoId: number | null; diagnosticoStatus: string | null
}
export type DtCompletudeItem = { disciplinaLabel: string; professor: string; status: 'ok' | 'pendente'; docId?: number | null }
export type DtPadrao = { categoria: string; count: number; disciplinas: string[] }
export type DtConsolidado = {
  fortes: { descritor: string; disciplina: string }[]
  fracos: { descritor: string; disciplina: string }[]
  padroes: DtPadrao[]
  estrategias: { titulo: string; disciplina: string }[]
}
export type DtPlanoMeta = { foco?: string; evidencia?: string; publico?: string; nivelOrigem?: string[]; nivelDestino?: string[] }
export type DtPlanoAcaoItem = { titulo: string; descricao: string; responsavel?: string; prazo?: string; meta?: DtPlanoMeta }
export type DtAcaoCatalogo = { id: string; titulo: string; descricao: string; foco: string; evidencia: string; publico: string; nivelOrigem: string[]; nivelDestino: string[]; prazoSugerido: string }
export type DtFonte = { docId: number; professor: string; disciplinaLabel: string; status: string }
export type DtContent = {
  classId: number; className: string; gradeId: number; gradeLabel: string; ciclo: string; serie: string; ano: number
  bimestres: number[]; fontes: DtFonte[]; completude: DtCompletudeItem[]; consolidado: DtConsolidado
  diagnostico: string; planoAcao: DtPlanoAcaoItem[]; geradoPorIA?: boolean
}
export type DtCruzamento = {
  classId: number; className: string; gradeId: number; gradeLabel: string; ciclo: string; serie: string
  bimestres: number[]; completude: DtCompletudeItem[]; consolidado: DtConsolidado; fontes: DtFonte[]
  diagnosticoId: number | null; diagnosticoStatus: string | null; diagnostico: string; planoAcao: DtPlanoAcaoItem[]
}

export const cicloLabel = (ciclo: string) => (ciclo === 'medio' ? 'Ensino Médio' : 'Ensino Fundamental')

export const PLANO_ACAO_CATALOGO: DtAcaoCatalogo[] = [
  { id: 'recomposicao-focalizada', titulo: 'Recomposição Focalizada de Habilidades', foco: 'Recomposição', evidencia: 'Alto Impacto', publico: 'Pequenos grupos', nivelOrigem: ['Abaixo do Básico'], nivelDestino: ['Básico'], prazoSugerido: 'Contínuo', descricao: 'Identificar habilidades prioritárias não consolidadas via diagnóstico e organizar intervenções em pequenos grupos, priorizando estudantes Abaixo do Básico, com verificações a cada ciclo.' },
  { id: 'tutoria-entre-pares', titulo: 'Tutoria Entre Pares', foco: 'Aprendizagem Colaborativa', evidencia: 'Alto Impacto', publico: 'Grupo', nivelOrigem: ['Abaixo do Básico', 'Básico'], nivelDestino: ['Básico', 'Adequado'], prazoSugerido: 'Bimestral', descricao: 'Duplas/trios estratégicos em que estudantes com maior domínio auxiliam colegas, fortalecendo quem ensina e quem recebe apoio.' },
  { id: 'trilhas-personalizadas', titulo: 'Trilhas Personalizadas de Aprendizagem', foco: 'Personalização', evidencia: 'Médio-Alto', publico: 'Individual', nivelOrigem: ['Abaixo do Básico', 'Básico', 'Adequado'], nivelDestino: ['Básico', 'Adequado', 'Avançado'], prazoSugerido: 'Contínuo', descricao: 'Percursos diferenciados conforme o nível de proficiência, permitindo ritmos distintos no desenvolvimento das habilidades essenciais.' },
  { id: 'metas-individuais', titulo: 'Metas Individuais de Evolução', foco: 'Metas e Monitoramento', evidencia: 'Alto Impacto', publico: 'Individual', nivelOrigem: ['Abaixo do Básico', 'Básico'], nivelDestino: ['Básico', 'Adequado'], prazoSugerido: 'Bimestral', descricao: 'Objetivos claros e alcançáveis por estudante, com acompanhamento periódico; foco na evolução individual, não só na nota final.' },
  { id: 'feedback-formativo', titulo: 'Rotina de Feedback Formativo', foco: 'Feedback', evidencia: 'Alto Impacto', publico: 'Turma', nivelOrigem: ['Abaixo do Básico', 'Básico', 'Adequado'], nivelDestino: ['Básico', 'Adequado', 'Avançado'], prazoSugerido: 'Contínuo', descricao: 'Devolutivas frequentes destacando pontos fortes, dificuldades e estratégias de melhoria, usadas como ferramenta de aprendizagem.' },
  { id: 'abp', titulo: 'Aprendizagem Baseada em Projetos', foco: 'Aprendizagem Ativa', evidencia: 'Médio-Alto', publico: 'Grupo', nivelOrigem: ['Básico', 'Adequado'], nivelDestino: ['Adequado', 'Avançado'], prazoSugerido: 'Semestral', descricao: 'Projetos que conectam conteúdos a problemas reais, desenvolvendo competências cognitivas, socioemocionais e de resolução de problemas.' },
  { id: 'oficina-estudo', titulo: 'Oficina de Estratégias de Estudo', foco: 'Metacognição', evidencia: 'Alto Impacto', publico: 'Turma', nivelOrigem: ['Abaixo do Básico', 'Básico', 'Adequado'], nivelDestino: ['Básico', 'Adequado', 'Avançado'], prazoSugerido: 'Bimestral', descricao: 'Técnicas validadas (prática espaçada, recuperação ativa, resumos, autoavaliação) para fortalecer a autonomia dos estudantes.' },
  { id: 'monitoramento-risco', titulo: 'Monitoramento Preventivo de Risco Escolar', foco: 'Prevenção e Risco', evidencia: 'Alto Impacto', publico: 'Individual', nivelOrigem: ['Abaixo do Básico'], nivelDestino: ['Básico'], prazoSugerido: 'Contínuo', descricao: 'Acompanhar frequência, participação e desempenho para identificar precocemente risco de defasagem e intervir antes do agravamento.' },
  { id: 'enriquecimento', titulo: 'Desafios de Enriquecimento Curricular', foco: 'Enriquecimento', evidencia: 'Médio', publico: 'Individual', nivelOrigem: ['Adequado', 'Avançado'], nivelDestino: ['Avançado'], prazoSugerido: 'Semestral', descricao: 'Aprofundamento para estudantes Adequado/Avançado: investigação científica, problemas complexos, olimpíadas e projetos de inovação.' },
  { id: 'recuperacao-continua', titulo: 'Recuperação Contínua Integrada', foco: 'Recomposição', evidencia: 'Alto Impacto', publico: 'Turma', nivelOrigem: ['Abaixo do Básico', 'Básico'], nivelDestino: ['Básico', 'Adequado'], prazoSugerido: 'Contínuo', descricao: 'Intervenções imediatas após identificar dificuldades, evitando acúmulo de defasagens e garantindo retomada das habilidades.' },
  { id: 'leitura-interpretacao', titulo: 'Fortalecimento da Leitura e Interpretação', foco: 'Leitura', evidencia: 'Alto Impacto', publico: 'Turma', nivelOrigem: ['Abaixo do Básico', 'Básico'], nivelDestino: ['Básico', 'Adequado'], prazoSugerido: 'Contínuo', descricao: 'Estratégias transversais de leitura em todas as disciplinas, ampliando compreensão textual e capacidade argumentativa.' },
  { id: 'avaliacao-diagnostica', titulo: 'Avaliação Diagnóstica Inteligente', foco: 'Avaliação Diagnóstica', evidencia: 'Alto Impacto', publico: 'Turma', nivelOrigem: ['Abaixo do Básico', 'Básico', 'Adequado'], nivelDestino: ['Básico', 'Adequado', 'Avançado'], prazoSugerido: 'Bimestral', descricao: 'Instrumentos diagnósticos periódicos para mapear habilidades e lacunas, planejando ações baseadas em evidências.' },
]
