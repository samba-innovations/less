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

export type FieldType = 'text' | 'textarea' | 'date' | 'number' | 'select' | 'chips'

export type FieldDef = {
  key:         string
  label:       string
  type:        FieldType
  placeholder?: string
  required?:   boolean
  options?:    { value: string; label: string }[]
  rows?:       number
}

export type DocTypeMeta = {
  label:       string
  description: string
  color:       string
  fields:      FieldDef[]
  managerOnly?: boolean
}

export const DOC_TYPES: Record<DocType, DocTypeMeta> = {
  PLANO_AULA: {
    label: 'Plano de Aula',
    description: 'Selecione turma, disciplina e aula do currículo SP — conteúdos preenchidos automaticamente',
    color: '#2563eb',
    fields: [
      // 'desenvolvimento_*' are rendered directly in EditorClient for this type
      { key: 'data',             label: 'Data da Aula',       type: 'text' },
      { key: 'objetivo_geral',   label: 'Objetivo Geral',     type: 'textarea', rows: 3 },
      { key: 'recursos_materiais', label: 'Recursos e Materiais', type: 'textarea', rows: 2 },
      { key: 'observacoes',      label: 'Observações',        type: 'textarea', rows: 2 },
    ],
  },

  GUIA_APRENDIZAGEM: {
    label: 'Guia de Aprendizagem',
    description: 'Selecione turma, disciplina e bimestre — aprendizagens essenciais carregadas do currículo SP',
    color: '#0891b2',
    fields: [
      { key: 'estrategias',  label: 'Estratégias de Ensino', type: 'textarea', rows: 4 },
      { key: 'recursos',     label: 'Recursos Utilizados',   type: 'textarea', rows: 2 },
      { key: 'observacoes',  label: 'Observações',           type: 'textarea', rows: 3 },
    ],
  },

  PEI: {
    label: 'PEI',
    description: 'Plano Educacional Individualizado (AEE)',
    color: '#7c3aed',
    fields: [
      { key: 'aluno',              label: 'Nome do Aluno',          type: 'text', required: true },
      { key: 'ra',                 label: 'RA',                     type: 'text' },
      { key: 'turma',              label: 'Turma',                  type: 'text' },
      { key: 'bimestre',           label: 'Bimestre',               type: 'select', options: [
        { value: '1º', label: '1º Bimestre' },
        { value: '2º', label: '2º Bimestre' },
        { value: '3º', label: '3º Bimestre' },
        { value: '4º', label: '4º Bimestre' },
      ]},
      { key: 'disciplina',         label: 'Disciplina',             type: 'text' },
      { key: 'diagnostico_cid',    label: 'Diagnóstico / CID',      type: 'text' },
      { key: 'diagnostico_funcional', label: 'Diagnóstico Funcional', type: 'textarea', rows: 3 },
      { key: 'habilidades',        label: 'Habilidades Trabalhadas', type: 'textarea', rows: 3 },
      { key: 'objetivos',          label: 'Objetivos',              type: 'textarea', rows: 4 },
      { key: 'estrategias',        label: 'Estratégias e Adaptações', type: 'textarea', rows: 4 },
      { key: 'avaliacao',          label: 'Avaliação',              type: 'textarea', rows: 3 },
      { key: 'profissionais',      label: 'Profissionais Envolvidos', type: 'textarea', rows: 2 },
      { key: 'responsaveis',       label: 'Responsáveis',           type: 'textarea', rows: 2 },
      { key: 'proxima_revisao',    label: 'Próxima Revisão',        type: 'date' },
    ],
  },

  PLANO_ELETIVA: {
    label: 'Plano de Eletiva',
    description: 'Selecione turma, disciplina e bimestre — plano de eletiva com currículo SP',
    color: '#059669',
    fields: [
      { key: 'carga_horaria',  label: 'Carga Horária',     type: 'text' },
      { key: 'ementa',         label: 'Ementa',            type: 'textarea', rows: 3 },
      { key: 'justificativa',  label: 'Justificativa',     type: 'textarea', rows: 3 },
      { key: 'objetivos',      label: 'Objetivos',         type: 'textarea', rows: 4 },
      { key: 'metodologia',    label: 'Metodologia',       type: 'textarea', rows: 4 },
      { key: 'avaliacao',      label: 'Avaliação',         type: 'textarea', rows: 3 },
      { key: 'materiais',      label: 'Materiais',         type: 'textarea', rows: 2 },
    ],
  },

  PLANO_EMA: {
    label: 'Plano EMA',
    description: 'Selecione turma, disciplina e bimestre — plano de EMA com currículo SP',
    color: '#d97706',
    fields: [
      { key: 'modalidade',  label: 'Modalidade',       type: 'text', required: true },
      { key: 'carga_horaria', label: 'Carga Horária',  type: 'text' },
      { key: 'tema',        label: 'Tema',              type: 'text' },
      { key: 'objetivos',   label: 'Objetivos',         type: 'textarea', rows: 4 },
      { key: 'conteudos',   label: 'Conteúdos',         type: 'textarea', rows: 4 },
      { key: 'metodologia', label: 'Metodologia',       type: 'textarea', rows: 4 },
      { key: 'avaliacao',   label: 'Avaliação',         type: 'textarea', rows: 3 },
      { key: 'materiais',   label: 'Materiais',         type: 'textarea', rows: 2 },
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
      { key: 'periodo',              label: 'Período',               type: 'text' },
      { key: 'resumo',               label: 'Resumo',                type: 'textarea', rows: 3 },
      { key: 'palavras_chave',       label: 'Palavras-chave',        type: 'text',     placeholder: 'Ex: educação, inovação, tecnologia' },
      { key: 'problema',             label: 'Problema de Pesquisa',  type: 'textarea', rows: 3 },
      { key: 'justificativa',        label: 'Justificativa',         type: 'textarea', rows: 3 },
      { key: 'objetivo_geral',       label: 'Objetivo Geral',        type: 'textarea', rows: 2 },
      { key: 'objetivos_especificos', label: 'Objetivos Específicos', type: 'textarea', rows: 3 },
      { key: 'metodologia',          label: 'Metodologia',           type: 'textarea', rows: 4 },
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
      { key: 'metas',            label: 'Metas',                type: 'textarea', rows: 4 },
      { key: 'dimensao_planejamento', label: 'Planejamento',   type: 'textarea', rows: 4 },
      { key: 'dimensao_praticas',     label: 'Práticas Pedagógicas', type: 'textarea', rows: 4 },
      { key: 'dimensao_avaliacao',    label: 'Avaliação',       type: 'textarea', rows: 4 },
      { key: 'dimensao_gestao',       label: 'Gestão e Liderança', type: 'textarea', rows: 4 },
    ],
  },

  ATA: {
    label: 'ATA',
    description: 'Ata de reunião ou resultado escolar',
    color: '#0f766e',
    managerOnly: true,
    fields: [
      { key: 'tipo',       label: 'Tipo de Ata',      type: 'select', options: [
        { value: 'reuniao', label: 'Ata de Reunião' },
        { value: 'resultado', label: 'Resultado Escolar' },
        { value: 'conselho', label: 'Conselho de Classe' },
      ]},
      { key: 'data',       label: 'Data',             type: 'date', required: true },
      { key: 'local',      label: 'Local',            type: 'text' },
      { key: 'participantes', label: 'Participantes', type: 'textarea', rows: 3 },
      { key: 'pauta',      label: 'Pauta',            type: 'textarea', rows: 3 },
      { key: 'deliberacoes', label: 'Deliberações',   type: 'textarea', rows: 5 },
      { key: 'encaminhamentos', label: 'Encaminhamentos', type: 'textarea', rows: 3 },
    ],
  },

  DECLARACAO: {
    label: 'Declaração',
    description: 'Declaração escolar para aluno ou responsável',
    color: '#1d4ed8',
    managerOnly: true,
    fields: [
      { key: 'aluno',      label: 'Nome do Aluno',   type: 'text', required: true },
      { key: 'ra',         label: 'RA',              type: 'text' },
      { key: 'turma',      label: 'Turma',           type: 'text' },
      { key: 'finalidade', label: 'Finalidade',      type: 'text', required: true, placeholder: 'Ex: Para fins de comprovação de matrícula' },
      { key: 'texto',      label: 'Texto Adicional', type: 'textarea', rows: 4 },
      { key: 'data',       label: 'Data',            type: 'date' },
    ],
  },

  COMUNICADO: {
    label: 'Comunicado',
    description: 'Comunicado para pais, alunos ou comunidade',
    color: '#c2410c',
    managerOnly: true,
    fields: [
      { key: 'destinatario', label: 'Destinatário',   type: 'text', required: true, placeholder: 'Ex: Pais e Responsáveis' },
      { key: 'assunto',      label: 'Assunto',        type: 'text', required: true },
      { key: 'data',         label: 'Data',           type: 'date' },
      { key: 'texto',        label: 'Texto do Comunicado', type: 'textarea', rows: 8, required: true },
    ],
  },

  ATESTADO: {
    label: 'Atestado',
    description: 'Atestado de frequência, matrícula ou outro',
    color: '#15803d',
    managerOnly: true,
    fields: [
      { key: 'aluno',      label: 'Nome do Aluno',   type: 'text', required: true },
      { key: 'ra',         label: 'RA',              type: 'text' },
      { key: 'turma',      label: 'Turma',           type: 'text' },
      { key: 'tipo',       label: 'Tipo de Atestado', type: 'select', options: [
        { value: 'matricula',  label: 'Atestado de Matrícula' },
        { value: 'frequencia', label: 'Atestado de Frequência' },
        { value: 'conclusao',  label: 'Atestado de Conclusão' },
        { value: 'outro',      label: 'Outro' },
      ]},
      { key: 'finalidade', label: 'Finalidade',      type: 'text', placeholder: 'Para fins de...' },
      { key: 'texto',      label: 'Observações',     type: 'textarea', rows: 3 },
      { key: 'data',       label: 'Data',            type: 'date' },
    ],
  },
}

export const ALL_DOC_TYPES = Object.keys(DOC_TYPES) as DocType[]
