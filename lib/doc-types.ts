export type DocType =
  | 'PLANO_AULA'
  | 'GUIA_APRENDIZAGEM'
  | 'PEI'
  | 'PLANO_ELETIVA'
  | 'PLANO_EMA'
  | 'PROJETO'
  | 'PDI'
  | 'ATA'
  | 'DECLARACAO'
  | 'COMUNICADO'
  | 'ATESTADO'
  | 'CARTA_NAUTICA'
  | 'OE_PLANO_AULA'
  | 'OE_GUIA_APRENDIZAGEM'

export type FieldType = 'text' | 'textarea' | 'date' | 'number' | 'select' | 'chips'

export type FieldDef = {
  key:         string
  label:       string
  type:        FieldType
  placeholder?: string
  required?:   boolean
  options?:    { value: string; label: string }[]
  rows?:       number
  /** Onde o campo está, para a mensagem: "Passo 2 — Aulas". */
  passo?:      string
}

export type DocTypeMeta = {
  label:       string
  description: string
  color:       string
  fields:      FieldDef[]
  managerOnly?: boolean
}

const AVALIACAO_OPTS = [
  { value: 'observacao',      label: 'Observação sistemática' },
  { value: 'diario',          label: 'Registro no diário' },
  { value: 'sondagem',        label: 'Sondagem diagnóstica' },
  { value: 'roda_conversa',   label: 'Roda de conversa' },
  { value: 'atividade_ind',   label: 'Atividade individual' },
  { value: 'atividade_grupo', label: 'Atividade em grupo' },
  { value: 'autoavaliacao',   label: 'Autoavaliação' },
  { value: 'portfolio',       label: 'Portfólio' },
  { value: 'apresentacao',    label: 'Apresentação' },
  { value: 'investigacao',    label: 'Atividade investigativa' },
]

const RECURSOS_OPTS = [
  { value: 'projetor',    label: 'Projetor / TV' },
  { value: 'computador',  label: 'Computador / Tablets' },
  { value: 'impressos',   label: 'Materiais impressos' },
  { value: 'concreto',    label: 'Material concreto / manipulável' },
  { value: 'livro',       label: 'Livro didático' },
  { value: 'internet',    label: 'Internet / pesquisa' },
  { value: 'quadro',      label: 'Quadro e giz / marcador' },
  { value: 'laboratorio', label: 'Laboratório' },
  { value: 'biblioteca',  label: 'Biblioteca / textos literários' },
]

const METODOLOGIA_OPTS = [
  { value: 'expositiva',   label: 'Aula expositiva dialogada' },
  { value: 'problemas',    label: 'Resolução de problemas' },
  { value: 'grupo',        label: 'Trabalho em grupo' },
  { value: 'pesquisa',     label: 'Pesquisa' },
  { value: 'projeto',      label: 'Projeto' },
  { value: 'seminario',    label: 'Seminário' },
  { value: 'experimento',  label: 'Experimento prático' },
  { value: 'debate',       label: 'Debate' },
  { value: 'estudo_caso',  label: 'Estudo de caso' },
  { value: 'rotacao',      label: 'Rotação por estações' },
]

export const DOC_TYPES: Record<DocType, DocTypeMeta> = {
  PLANO_AULA: {
    label: 'Plano de Aula',
    description: 'Selecione turma, disciplina e aula do currículo SP — conteúdos preenchidos automaticamente',
    color: '#2563eb',
    fields: [
      { key: 'periodo', label: 'Tipo de Plano', type: 'select', options: [
        { value: 'por_aula',   label: 'Por Aula' },
        { value: 'semanal',    label: 'Semanal' },
        { value: 'quinzenal',  label: 'Quinzenal' },
        { value: 'mensal',     label: 'Mensal' },
      ]},
      { key: 'data',             label: 'Data da Aula',        type: 'date', required: true },
      // Fim do período. Vazio = aula de um dia só, que era o único caso antes.
      { key: 'data_fim',         label: 'Até (fim do período)', type: 'date' },
      { key: 'objetivo_geral',   label: 'Objetivo Geral',      type: 'textarea', required: true, rows: 3 },
      { key: 'recursos_materiais', label: 'Recursos e Materiais', type: 'chips', required: true, options: RECURSOS_OPTS },
      { key: 'avaliacao',        label: 'Avaliação',           type: 'chips', required: true, options: AVALIACAO_OPTS },
      { key: 'observacoes',      label: 'Observações',         type: 'textarea', rows: 2 },
    ],
  },

  GUIA_APRENDIZAGEM: {
    label: 'Guia de Aprendizagem',
    description: 'Selecione turma, disciplina e bimestre — aprendizagens essenciais carregadas do currículo SP',
    color: '#0891b2',
    fields: [
      { key: 'ano_letivo',      label: 'Ano Letivo',              type: 'text', required: true, placeholder: '2025' },
      { key: 'data_inicio',     label: 'Data de Início do Bimestre', type: 'date', required: true },
      { key: 'tema',            label: 'Tema / Título do Guia',   type: 'text', required: true },
      // No guia estes três não são complemento: são cobrados etapa a etapa no
      // assistente, e a emissão precisa cobrar o mesmo — senão um guia reaberto
      // direto na etapa 3 sairia sem competências ou sem composição de média.
      { key: 'competencias',    label: 'Competências Gerais (BNCC)', type: 'textarea', required: true, rows: 3 },
      { key: 'habilidades',     label: 'Habilidades Específicas', type: 'textarea', required: true, rows: 3 },
      { key: 'conteudos',       label: 'Conteúdos Programáticos', type: 'textarea', required: true, rows: 4 },
      { key: 'estrategias',     label: 'Estratégias Didáticas',   type: 'chips', required: true, options: METODOLOGIA_OPTS },
      { key: 'recursos',        label: 'Recursos e Materiais',    type: 'chips', required: true, options: RECURSOS_OPTS },
      { key: 'avaliacao',       label: 'Avaliação Bimestral',     type: 'chips', required: true, options: AVALIACAO_OPTS },
      { key: 'composicao_media', label: 'Composição de Média',    type: 'textarea', required: true, rows: 2, placeholder: 'Ex: 60% avaliações + 40% atividades' },
      { key: 'referencias',     label: 'Referências',             type: 'textarea', rows: 3 },
    ],
  },

  PEI: {
    label: 'PEI',
    description: 'Plano Educacional Individualizado (AEE)',
    color: '#7c3aed',
    fields: [
      { key: 'aluno',              label: 'Nome do Aluno',            type: 'text',     required: true },
      { key: 'ra',                 label: 'RA',                       type: 'text' },
      { key: 'turma',              label: 'Turma',                    type: 'text', required: true },
      { key: 'diagnostico_cid',    label: 'Diagnóstico / CID',        type: 'text' },
      { key: 'bimestre',           label: 'Bimestre',                 type: 'select', options: [
        { value: '1', label: '1º Bimestre' },
        { value: '2', label: '2º Bimestre' },
        { value: '3', label: '3º Bimestre' },
        { value: '4', label: '4º Bimestre' },
      ]},
      { key: 'disciplina',         label: 'Disciplina',               type: 'text', required: true },
      { key: 'data_elaboracao',    label: 'Data de Elaboração',       type: 'date' },
      { key: 'habilidades',        label: 'Habilidades Trabalhadas',  type: 'textarea', rows: 3 },
      { key: 'conteudo',           label: 'Conteúdo Específico',      type: 'textarea', rows: 3 },
      { key: 'diagnostico_funcional', label: 'Diagnóstico Funcional', type: 'textarea', rows: 3 },
      { key: 'diagnostico_obs',    label: 'Observações Diagnósticas', type: 'textarea', rows: 2 },
      { key: 'objetivos',          label: 'Objetivos Específicos',    type: 'textarea', required: true, rows: 4 },
      { key: 'estrategias',        label: 'Estratégias e Adaptações', type: 'textarea', required: true, rows: 4 },
      { key: 'avaliacao',          label: 'Avaliação do Processo',    type: 'textarea', required: true, rows: 3 },
      { key: 'profissionais',      label: 'Profissionais Envolvidos', type: 'textarea', rows: 2 },
      { key: 'responsaveis',       label: 'Responsáveis / Família',   type: 'textarea', rows: 2 },
      { key: 'proxima_revisao',    label: 'Próxima Revisão',          type: 'date' },
    ],
  },

  PLANO_ELETIVA: {
    label: 'Plano de Eletiva',
    description: 'Plano de disciplina eletiva com proposta pedagógica',
    color: '#059669',
    fields: [
      { key: 'nome_eletiva',      label: 'Nome da Eletiva',          type: 'text', required: true },
      { key: 'nivel_ensino',      label: 'Nível de Ensino',          type: 'select', options: [
        { value: 'medio',         label: 'Ensino Médio' },
        { value: 'fundamental',   label: 'Ensino Fundamental' },
      ]},
      { key: 'professor_parceiro', label: 'Professor(a) Parceiro(a)', type: 'text' },
      { key: 'semestre',          label: 'Semestre',                 type: 'select', required: true, options: [
        { value: '1',             label: '1º Semestre' },
        { value: '2',             label: '2º Semestre' },
      ]},
      { key: 'carga_horaria',     label: 'Carga Horária Semanal',    type: 'text', required: true, placeholder: 'Ex: 2h' },
      { key: 'data_inicio',       label: 'Primeira Aula',            type: 'date' },
      { key: 'data_culminancia',  label: 'Culminância',              type: 'date' },
      { key: 'justificativa',     label: 'Justificativa',            type: 'textarea', required: true, rows: 3 },
      { key: 'ementa',            label: 'Ementa',                   type: 'textarea', required: true, rows: 3 },
      { key: 'objetivos',         label: 'Objetivos',                type: 'textarea', required: true, rows: 4 },
      { key: 'metodologia',       label: 'Metodologia',              type: 'chips', required: true, options: METODOLOGIA_OPTS },
      { key: 'avaliacao',         label: 'Avaliação',                type: 'chips', required: true, options: AVALIACAO_OPTS },
      { key: 'materiais',         label: 'Materiais e Recursos',     type: 'chips', options: RECURSOS_OPTS },
      { key: 'composicao_media',  label: 'Composição de Média',      type: 'textarea', rows: 2, placeholder: 'Ex: 60% avaliações + 40% atividades' },
      { key: 'referencias',       label: 'Referências',              type: 'textarea', rows: 3 },
    ],
  },

  PLANO_EMA: {
    label: 'Plano EMA',
    description: 'Plano de Ensino por Módulo/Área (Esporte, Música, Arte)',
    color: '#d97706',
    fields: [
      { key: 'modalidade',       label: 'Modalidade',               type: 'select', required: true, options: [
        { value: 'esporte',      label: 'Esporte' },
        { value: 'musica',       label: 'Música' },
        { value: 'arte',         label: 'Arte' },
      ] },
      { key: 'carga_horaria',    label: 'Carga Horária Semanal',    type: 'text', required: true, placeholder: 'Ex: 2h' },
      { key: 'tema',             label: 'Tema / Projeto do Bimestre', type: 'text', required: true },
      { key: 'objetivos',        label: 'Objetivos',                type: 'textarea', required: true, rows: 4 },
      { key: 'conteudos',        label: 'Conteúdos',                type: 'textarea', required: true, rows: 4 },
      { key: 'metodologia',      label: 'Metodologia',              type: 'chips', required: true, options: METODOLOGIA_OPTS },
      { key: 'avaliacao',        label: 'Avaliação',                type: 'chips', required: true, options: AVALIACAO_OPTS },
      { key: 'materiais',        label: 'Materiais e Equipamentos', type: 'chips', options: RECURSOS_OPTS },
      { key: 'composicao_media', label: 'Composição de Média',      type: 'textarea', rows: 2, placeholder: 'Ex: 60% avaliações + 40% atividades' },
      { key: 'referencias',      label: 'Referências',              type: 'textarea', rows: 3 },
    ],
  },

  PROJETO: {
    label: 'Projeto',
    description: 'Projeto interdisciplinar ou de pesquisa',
    color: '#be185d',
    fields: [
      { key: 'titulo',               label: 'Título',                type: 'text',     required: true },
      { key: 'turmas',               label: 'Turma(s)',              type: 'text' },
      { key: 'disciplinas',          label: 'Disciplinas Envolvidas', type: 'text' },
      { key: 'periodo',              label: 'Período',               type: 'text', required: true },
      { key: 'resumo',               label: 'Resumo',                type: 'textarea', rows: 3 },
      { key: 'palavras_chave',       label: 'Palavras-chave',        type: 'text',     placeholder: 'Ex: educação, inovação, tecnologia' },
      { key: 'problema',             label: 'Problema de Pesquisa',  type: 'textarea', required: true, rows: 3 },
      { key: 'justificativa',        label: 'Justificativa',         type: 'textarea', required: true, rows: 3 },
      { key: 'objetivo_geral',       label: 'Objetivo Geral',        type: 'textarea', required: true, rows: 2 },
      { key: 'objetivos_especificos', label: 'Objetivos Específicos', type: 'textarea', rows: 3 },
      { key: 'metodologia',          label: 'Metodologia',           type: 'textarea', required: true, rows: 4 },
      { key: 'resultados',           label: 'Resultados Esperados',  type: 'textarea', rows: 3 },
      { key: 'recursos',             label: 'Recursos',              type: 'textarea', rows: 2 },
      { key: 'referencias',          label: 'Referências',           type: 'textarea', rows: 3 },
    ],
  },

  PDI: {
    label: 'PDI',
    description: 'Plano de Desenvolvimento Individual do professor',
    color: '#475569',
    fields: [
      { key: 'periodo',          label: 'Período',              type: 'text', required: true },
      { key: 'data_elaboracao',  label: 'Data de Elaboração',   type: 'date' },
      { key: 'metas',            label: 'Metas',                type: 'textarea', required: true, rows: 4 },
      { key: 'dimensao_planejamento', label: 'Planejamento',   type: 'textarea', required: true, rows: 4 },
      { key: 'dimensao_praticas',     label: 'Práticas Pedagógicas', type: 'textarea', required: true, rows: 4 },
      { key: 'dimensao_avaliacao',    label: 'Avaliação',       type: 'textarea', required: true, rows: 4 },
      { key: 'dimensao_gestao',       label: 'Gestão e Liderança', type: 'textarea', required: true, rows: 4 },
    ],
  },

  ATA: {
    label: 'ATA',
    description: 'Ata de reunião ou resultado escolar',
    color: '#0f766e',
    managerOnly: true,
    fields: [
      { key: 'tipo',       label: 'Tipo de Ata',      type: 'select', required: true, options: [
        { value: 'reuniao',    label: 'Ata de Reunião' },
        { value: 'resultado',  label: 'Resultado Escolar' },
        { value: 'conselho',   label: 'Conselho de Classe' },
      ]},
      { key: 'data',          label: 'Data',             type: 'date', required: true },
      { key: 'local',         label: 'Local',            type: 'text', required: true },
      { key: 'participantes', label: 'Participantes',    type: 'textarea', required: true, rows: 3 },
      { key: 'pauta',         label: 'Pauta',            type: 'textarea', required: true, rows: 3 },
      { key: 'deliberacoes',  label: 'Deliberações',     type: 'textarea', required: true, rows: 5 },
      { key: 'encaminhamentos', label: 'Encaminhamentos', type: 'textarea', rows: 3 },
    ],
  },

  DECLARACAO: {
    label: 'Declaração',
    description: 'Declaração escolar para aluno ou responsável',
    color: '#1d4ed8',
    managerOnly: true,
    fields: [
      { key: 'aluno',      label: 'Nome do Aluno',    type: 'text', required: true },
      { key: 'ra',         label: 'RA',               type: 'text' },
      { key: 'turma',      label: 'Turma',            type: 'text', required: true },
      { key: 'finalidade', label: 'Finalidade',       type: 'text', required: true, placeholder: 'Ex: Para fins de comprovação de matrícula' },
      { key: 'texto',      label: 'Texto Adicional',  type: 'textarea', required: true, rows: 4 },
      { key: 'data',       label: 'Data',             type: 'date', required: true },
    ],
  },

  COMUNICADO: {
    label: 'Comunicado',
    description: 'Comunicado para pais, alunos ou comunidade',
    color: '#c2410c',
    managerOnly: true,
    fields: [
      { key: 'destinatario', label: 'Destinatário',        type: 'text', required: true, placeholder: 'Ex: Pais e Responsáveis' },
      { key: 'assunto',      label: 'Assunto',             type: 'text', required: true },
      { key: 'data',         label: 'Data',                type: 'date', required: true },
      { key: 'texto',        label: 'Texto do Comunicado', type: 'textarea', rows: 8, required: true },
    ],
  },

  ATESTADO: {
    label: 'Atestado',
    description: 'Atestado de frequência, matrícula ou outro',
    color: '#15803d',
    managerOnly: true,
    fields: [
      { key: 'aluno',      label: 'Nome do Aluno',    type: 'text', required: true },
      { key: 'ra',         label: 'RA',               type: 'text' },
      { key: 'turma',      label: 'Turma',            type: 'text', required: true },
      { key: 'tipo',       label: 'Tipo de Atestado', type: 'select', required: true, options: [
        { value: 'matricula',  label: 'Atestado de Matrícula' },
        { value: 'frequencia', label: 'Atestado de Frequência' },
        { value: 'conclusao',  label: 'Atestado de Conclusão' },
        { value: 'outro',      label: 'Outro' },
      ]},
      { key: 'finalidade', label: 'Finalidade',       type: 'text', required: true, placeholder: 'Para fins de...' },
      { key: 'texto',      label: 'Observações',      type: 'textarea', required: true, rows: 3 },
      { key: 'data',       label: 'Data',             type: 'date', required: true },
    ],
  },

  CARTA_NAUTICA: {
    label: 'Carta Náutica',
    description: 'Mapa didático por aulas, slides e momentos pedagógicos',
    color: '#0e7490',
    fields: [],
  },

  OE_PLANO_AULA: {
    label: 'OE — Plano de Aula',
    description: 'Plano de aula de Orientação de Estudos',
    color: '#4f46e5',
    fields: [],
  },

  OE_GUIA_APRENDIZAGEM: {
    label: 'OE — Guia de Aprendizagem',
    description: 'Guia bimestral de Orientação de Estudos',
    color: '#4338ca',
    fields: [],
  },
}

export const ALL_DOC_TYPES = Object.keys(DOC_TYPES) as DocType[]

// ─── Campos obrigatórios ──────────────────────────────────────────────────────
// O `required` já existia no schema desde o começo, mas só desenhava um ponto na
// tela de criação — nada o fazia valer, e dava para emitir um plano de aula sem
// objetivo nem avaliação.
//
// A regra é: rascunho salva sempre (o autosave não pode travar e fazer o
// professor perder o que digitou); quem cobra é a emissão do PDF/DOCX, que é
// quando o documento passa a valer.

/** Um campo conta como preenchido se tem algo além de espaço em branco. */
function vazio(valor: string | undefined): boolean {
  return !valor || valor.trim() === ''
}

/**
 * A estrutura que a v1 exige para finalizar — o que identifica o documento,
 * e que não são campos de `DOC_TYPES` porque a tela os monta na cascata.
 *
 * Decisão do PO em 23/09/2026: a v2 passa a cobrar o mesmo. Fica mais rígida do
 * que era, de propósito — plano sem aula escolhida não é plano. Espelha o
 * `camposFaltantes` de samba-paper/lib/doc-completude.ts.
 *
 * `alternativas` existe porque a mesma informação tem mais de um nome conforme
 * a origem do documento: a turma vive em `turma` ou `turmas`; a aula, em
 * `aula_ids` (várias) ou `aula_id` (uma só). Basta uma estar preenchida.
 */
type RegraEstrutural = FieldDef & { alternativas: string[] }

const ESTRUTURA: Partial<Record<DocType, RegraEstrutural[]>> = {
  PLANO_AULA: [
    { key: 'turma',      label: 'Turma',      type: 'text', passo: 'Passo 1 — Contexto', alternativas: ['turma', 'turmas'] },
    { key: 'disciplina', label: 'Disciplina', type: 'text', passo: 'Passo 1 — Contexto', alternativas: ['disciplina'] },
    { key: 'bimestre',   label: 'Bimestre',   type: 'text', passo: 'Passo 1 — Contexto', alternativas: ['bimestre', 'bimestres'] },
    { key: 'aula_ids',   label: 'Aula',       type: 'text', passo: 'Passo 2 — Aulas',    alternativas: ['aula_ids', 'aula_id', 'oe_missoes_sel'] },
  ],
  GUIA_APRENDIZAGEM: [
    { key: 'turma',      label: 'Turma',      type: 'text', passo: 'Passo 1 — Identificação', alternativas: ['turma', 'turmas'] },
    { key: 'disciplina', label: 'Disciplina', type: 'text', passo: 'Passo 1 — Identificação', alternativas: ['disciplina'] },
    { key: 'bimestre',   label: 'Bimestre',   type: 'text', passo: 'Passo 1 — Identificação', alternativas: ['bimestre', 'bimestres'] },
  ],
}

/** O tipo base de um OE_*, que empresta campos e estrutura ao equivalente comum. */
function tipoBase(docType: DocType): DocType {
  return docType === 'OE_PLANO_AULA'        ? 'PLANO_AULA'
       : docType === 'OE_GUIA_APRENDIZAGEM' ? 'GUIA_APRENDIZAGEM'
       : docType
}

/**
 * Os campos obrigatórios que ainda estão em branco, na ordem do formulário.
 *
 * São duas exigências somadas: a ESTRUTURA (o que identifica o documento, regra
 * herdada da v1) e o CONTEÚDO (as flags `required` dos campos). Antes só a
 * segunda era cobrada, e dava para finalizar um plano sem nenhuma aula escolhida
 * — que a v1 barra desde sempre.
 *
 * Os tipos OE_* herdam os campos do tipo equivalente: no schema eles têm
 * `fields: []` porque a tela monta o formulário deles a partir do guia/plano
 * comum, e sem isto passariam pela validação sem nenhuma exigência.
 */
export function camposFaltando(
  docType: DocType,
  fields: Record<string, string>,
): FieldDef[] {
  const base = tipoBase(docType)
  const meta = DOC_TYPES[base]
  if (!meta) return []

  const estrutura = (ESTRUTURA[base] ?? [])
    .filter(r => r.alternativas.every(k => vazio(fields[k])))
    .map(({ alternativas: _alternativas, ...campo }) => campo)

  return [...estrutura, ...meta.fields.filter(f => f.required && vazio(fields[f.key]))]
}

/** "Turma (Passo 1 — Contexto) · Aula (Passo 2 — Aulas)" */
export function listarFaltantes(faltando: FieldDef[]): string {
  return faltando.map(f => f.passo ? `${f.label} (${f.passo})` : f.label).join(' · ')
}
