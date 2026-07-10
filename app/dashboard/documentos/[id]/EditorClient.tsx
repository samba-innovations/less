'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DOC_TYPES, type DocType, type FieldDef } from '@/lib/doc-types'
import {
  Save, FileDown, Trash2, CheckCircle, Clock, ChevronDown, Check, ArrowRight,
  BookOpen, Monitor, Microscope, Users, Search, Activity, UserCheck, Layers,
  FileCheck, Zap, type LucideIcon,
} from 'lucide-react'
import { Fragment } from 'react'
import { PeiEditor } from './PeiEditor'
import { GuiaEditor } from './GuiaEditor'
import { PdiEditor } from './PdiEditor'
import { ProjetoEditor } from './ProjetoEditor'
import { EletivaEditor } from './EletivaEditor'
import { EmaEditor } from './EmaEditor'
import { CartaNauticaEditor } from './CartaNauticaEditor'
import { AtaEditor } from './AtaEditor'
import { useRegisterBreadcrumb } from '../../_components/BreadcrumbContext'
import { Badge } from '../../_components/Badge'
import { ChipSelector, GroupedChipSelector, type SelectorGroup } from '../../_components/Selector'
import s from './editor.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

type Feedback = {
  id:          number
  text:        string
  createdAt:   string
  coordinator: { name: string }
}

type Turma      = { id: number; name: string; grade: string; ciclo: string; serie: string }
type Disciplina = { id: number; name: string; aulasNome: string }
type Bimestre   = { id: number; numero: number; label: string }
type Aula = {
  id: number; aulaNum: number; titulo: string
  eixo?: string; unidadeTematica?: string; habilidadeCodigo?: string
  habilidadeTexto?: string; objetoConhecimento?: string
  conteudo?: string; objetivos?: string; bloco?: string
}
type AE         = { id: number; codigo: string; descricao: string }
type Instrumento = { id: number; nome: string; categoria: string }
type PeiStudent = {
  id: number; name: string; ra: string; turma: string
  diagnostico?: string; profColaborativo?: string; profAee?: string
}

type SchoolOption = { id: number; slug: string; name: string }

type TurmasResponse = Turma[] | { needsSchool: true; schools: SchoolOption[] }

type Props = {
  doc: {
    id:        number
    type:      string
    title:     string
    content:   Record<string, unknown>
    status:    string
    feedbacks: Feedback[]
  }
  canFeedback: boolean
  isAdmin?:   boolean
}

// ─── PLANO_AULA constants ─────────────────────────────────────────────────────

type TecnicaItem = { id: number; nome: string; descritor: string }

const MOMENTOS_INICIAIS: TecnicaItem[] = [
  { id:  1, nome: 'Situação-problema contextualizada',  descritor: 'Apresenta problema real para mobilizar conhecimentos prévios e levantar hipóteses.' },
  { id:  2, nome: 'Pergunta geradora aberta',           descritor: 'Propõe questão ampla que estimula reflexão e revela repertório inicial dos alunos.' },
  { id:  3, nome: 'Brainstorm estruturado',             descritor: 'Levanta ideias prévias dos alunos para identificar conhecimentos e concepções alternativas.' },
  { id:  4, nome: 'Mapa conceitual inicial',            descritor: 'Solicita organização de conceitos para diagnosticar relações cognitivas existentes.' },
  { id:  5, nome: 'Quiz diagnóstico rápido',            descritor: 'Aplica questões objetivas para verificar conhecimentos prévios de forma imediata.' },
  { id:  6, nome: 'Estudo de caso curto',               descritor: 'Apresenta situação concreta para análise, avaliando interpretação e raciocínio inicial.' },
  { id:  7, nome: 'Demonstração discrepante',           descritor: 'Exibe fenômeno inesperado para gerar conflito cognitivo e curiosidade investigativa.' },
  { id:  8, nome: 'Levantamento de hipóteses',          descritor: 'Incentiva previsões dos alunos para avaliar compreensão inicial de causalidade.' },
  { id:  9, nome: 'Análise de erro',                   descritor: 'Explora resolução incorreta para identificar entendimento e promover pensamento crítico.' },
  { id: 10, nome: 'Conexão com o cotidiano',            descritor: 'Relaciona o tema à vivência dos alunos para ativar conhecimentos prévios.' },
  { id: 11, nome: 'Mini desafio imediato',              descritor: 'Propõe problema rápido sem instrução prévia para observar estratégias espontâneas.' },
  { id: 12, nome: 'Think-Pair-Share',                  descritor: 'Estimula discussão em etapas para favorecer participação e explicitação do pensamento.' },
  { id: 13, nome: 'Nuvem de palavras',                 descritor: 'Coleta palavras-chave dos alunos para mapear repertório coletivo inicial.' },
  { id: 14, nome: 'Classificação/organização',         descritor: 'Solicita agrupamento de elementos para diagnosticar critérios de organização mental.' },
  { id: 15, nome: 'Linha do tempo conceitual',         descritor: 'Organiza eventos ou conceitos em sequência para avaliar noção de processo.' },
  { id: 16, nome: 'Pergunta com posicionamento',       descritor: 'Solicita opinião justificada para identificar capacidade argumentativa inicial.' },
  { id: 17, nome: 'Uso de dados reais',                descritor: 'Apresenta dados para interpretação inicial, verificando leitura e análise.' },
  { id: 18, nome: 'Gamificação inicial',               descritor: 'Introduz narrativa ou desafio para engajar e contextualizar a aprendizagem.' },
  { id: 19, nome: 'Autoavaliação inicial',             descritor: 'Incentiva o aluno a refletir sobre seu próprio nível de conhecimento.' },
  { id: 20, nome: 'Integração com tecnologia',         descritor: 'Utiliza recursos tecnológicos para despertar interesse e diagnosticar familiaridade.' },
]

const DESENVOLVIMENTO_OPTS: TecnicaItem[] = [
  { id:  1, nome: 'Resolução orientada de problemas',       descritor: 'Desenvolve conceitos por meio da resolução guiada de situações-problema.' },
  { id:  2, nome: 'Aprendizagem baseada em problemas (PBL)', descritor: 'Investiga problema complexo em grupo, articulando teoria e prática.' },
  { id:  3, nome: 'Aprendizagem baseada em projetos (PjBL)', descritor: 'Desenvolve produto ou solução ao longo da atividade com aplicação real.' },
  { id:  4, nome: 'Estudo de caso aprofundado',             descritor: 'Analisa situação detalhada, propondo soluções fundamentadas.' },
  { id:  5, nome: 'Experimentação prática',                 descritor: 'Realiza experimentos para observar fenômenos e validar hipóteses.' },
  { id:  6, nome: 'Modelagem matemática/científica',        descritor: 'Representa situações reais por meio de modelos matemáticos ou computacionais.' },
  { id:  7, nome: 'Programação aplicada',                   descritor: 'Desenvolve algoritmos/códigos para resolver problemas específicos.' },
  { id:  8, nome: 'Rotação por estações',                   descritor: 'Alterna atividades em diferentes estações com foco em habilidades diversas.' },
  { id:  9, nome: 'Sala de aula invertida (aplicação)',     descritor: 'Aplica conhecimentos previamente estudados em atividades práticas.' },
  { id: 10, nome: 'Aprendizagem colaborativa estruturada',  descritor: 'Resolve tarefas em grupo com papéis definidos e interdependência.' },
  { id: 11, nome: 'Resolução em níveis (progressão)',       descritor: 'Trabalha atividades com dificuldade crescente para consolidar aprendizagem.' },
  { id: 12, nome: 'Análise e interpretação de dados',       descritor: 'Explora dados reais para extrair padrões, conclusões e inferências.' },
  { id: 13, nome: 'Simulação (digital ou analógica)',       descritor: 'Utiliza simulações para compreender sistemas complexos.' },
  { id: 14, nome: 'Construção de protótipos',               descritor: 'Desenvolve artefatos físicos ou digitais para testar ideias.' },
  { id: 15, nome: 'Debate estruturado',                     descritor: 'Discute ideias com base em evidências e argumentação lógica.' },
  { id: 16, nome: 'Ensino entre pares (peer instruction)',  descritor: 'Alunos explicam conceitos entre si com mediação do professor.' },
  { id: 17, nome: 'Resolução comentada (metacognição)',     descritor: 'Explicita o raciocínio durante a resolução de problemas.' },
  { id: 18, nome: 'Gamificação aplicada',                   descritor: 'Utiliza mecânicas de jogo para engajar na resolução de desafios.' },
  { id: 19, nome: 'Investigação guiada (inquiry-based)',    descritor: 'Conduz investigação com orientação parcial do professor.' },
  { id: 20, nome: 'Uso de tecnologias digitais interativas', descritor: 'Utiliza softwares, sensores ou plataformas para exploração ativa.' },
]

const FECHAMENTO_OPTS: TecnicaItem[] = [
  { id:  1, nome: 'Síntese coletiva mediada',               descritor: 'Organiza os principais conceitos da aula com participação dos alunos.' },
  { id:  2, nome: 'Retomada da questão inicial',            descritor: 'Revisa o problema gerador à luz dos conhecimentos construídos.' },
  { id:  3, nome: 'Construção de mapa conceitual final',    descritor: 'Sistematiza conceitos e relações após a aprendizagem.' },
  { id:  4, nome: 'Registro estruturado (caderno/portfólio)', descritor: 'Formaliza os aprendizados em formato organizado e pessoal.' },
  { id:  5, nome: 'Resposta escrita reflexiva',             descritor: 'Elabora síntese individual com base na compreensão adquirida.' },
  { id:  6, nome: 'Metacognição guiada',                    descritor: 'Reflete sobre o que e como aprendeu durante a aula.' },
  { id:  7, nome: 'Correção comentada',                     descritor: 'Analisa soluções destacando estratégias e possíveis erros.' },
  { id:  8, nome: 'Generalização do conceito',              descritor: 'Amplia o conhecimento para outros contextos ou situações.' },
  { id:  9, nome: 'Aplicação rápida (transferência)',       descritor: 'Resolve novo problema para verificar consolidação do aprendizado.' },
  { id: 10, nome: 'Autoavaliação final',                    descritor: 'Avalia o próprio desempenho e nível de compreensão.' },
  { id: 11, nome: 'Exit ticket',                            descritor: 'Responde questão breve para evidenciar aprendizagem imediata.' },
  { id: 12, nome: 'Socialização de resultados',             descritor: 'Compartilha soluções, produtos ou conclusões com a turma.' },
  { id: 13, nome: 'Construção de resumo coletivo',          descritor: 'Produz síntese conjunta dos conteúdos abordados.' },
  { id: 14, nome: "Comparação 'antes e depois'",            descritor: 'Confronta ideias iniciais com o conhecimento atual.' },
  { id: 15, nome: 'Conexão interdisciplinar',               descritor: 'Relaciona o conteúdo com outras áreas do conhecimento.' },
  { id: 16, nome: 'Proposição de continuidade (gancho)',    descritor: 'Indica desdobramentos ou próximos passos da aprendizagem.' },
  { id: 17, nome: 'Elaboração de pergunta final',           descritor: 'Formula novas questões a partir do que foi aprendido.' },
  { id: 18, nome: 'Checklist de aprendizagem',              descritor: 'Verifica objetivos atingidos durante a aula.' },
  { id: 19, nome: 'Feedback imediato do professor',         descritor: 'Oferece devolutiva clara sobre o desempenho da turma.' },
  { id: 20, nome: 'Validação coletiva de conceitos-chave',  descritor: 'Confirma, com a turma, os conhecimentos essenciais construídos.' },
]

type TipoAula = 'individual' | 'dupla'
const TIPO_AULA_CFG: Record<TipoAula, { titulo: string; inicio: string; desenv: string; fim: string }> = {
  individual: { titulo: 'Aula de 50 minutos',          inicio: '0–10 min — Momentos Iniciais',  desenv: '10–40 min — Desenvolvimento',  fim: '40–50 min — Momentos Finais'  },
  dupla:      { titulo: 'Aula de 1 hora e 40 minutos', inicio: '0–15 min — Momentos Iniciais',  desenv: '15–85 min — Desenvolvimento',  fim: '85–100 min — Momentos Finais' },
}

type RecursoGrupo = { id: string; label: string; icon: LucideIcon; defaultOpen: boolean; items: string[] }

const RECURSOS_GRUPOS: RecursoGrupo[] = [
  {
    id: 'essenciais', label: 'Essenciais', icon: BookOpen, defaultOpen: true,
    items: ['Slides Oficiais & Livros dos Estudantes', 'Livro didático', 'Quadro branco', 'Caderno de atividades', 'Material impresso / Xerox', 'Material manipulável', 'Projetor / Datashow'],
  },
  {
    id: 'digitais', label: 'Digitais', icon: Monitor, defaultOpen: false,
    items: ['Computador / Tablet', 'Acesso à internet', 'AVA (Google Classroom / Moodle)', 'Plataforma de quizzes (Kahoot / Quizizz)', 'Simuladores digitais (PhET / Tinkercad)', 'Softwares específicos (Python / GeoGebra / Excel)', 'Mural colaborativo (Padlet / Jamboard)', 'Documentos compartilhados (Google Docs)', 'Inteligência Artificial (apoio à aprendizagem)', 'Vídeo / Recurso audiovisual'],
  },
  {
    id: 'maker', label: 'Experimental / Maker', icon: Microscope, defaultOpen: false,
    items: ['Kit Arduino / ESP / IoT', 'Sensores e dispositivos eletrônicos', 'Materiais recicláveis (prototipagem)', 'Impressora 3D / prototipagem rápida', 'Laboratório móvel / experimental'],
  },
  {
    id: 'colaborativos', label: 'Colaborativos / Pedagógicos', icon: Users, defaultOpen: false,
    items: ['Cartões de discussão (flashcards)', 'Jogos educativos', 'Estudos de caso impressos/digitais', 'Roteiros de investigação', 'Sequências didáticas estruturadas', 'Podcast / áudio educativo', 'Infográficos'],
  },
]

type AvaliacaoGrupo = { id: string; label: string; icon: LucideIcon; defaultOpen: boolean; items: string[] }

const AVALIACAO_GRUPOS: AvaliacaoGrupo[] = [
  {
    id: 'diagnostica', label: 'Diagnóstica', icon: Search, defaultOpen: true,
    items: ['Observação e participação', 'Avaliação diagnóstica inicial', 'Quiz diagnóstico rápido', 'Levantamento de hipóteses', 'Pergunta inicial / geradora'],
  },
  {
    id: 'formativa', label: 'Formativa', icon: Activity, defaultOpen: false,
    items: ['Atividade em sala', 'Exercícios no caderno', 'Feedback contínuo', 'Avaliação processual', 'Rubrica avaliativa'],
  },
  {
    id: 'ativa', label: 'Ativa (protagonismo)', icon: UserCheck, defaultOpen: false,
    items: ['Trabalho em grupo', 'Avaliação por pares', 'Autoavaliação guiada', 'Coavaliação (aluno + professor)', 'Avaliação por participação qualificada'],
  },
  {
    id: 'producao', label: 'Por Produção', icon: Layers, defaultOpen: false,
    items: ['Projeto / produto final', 'Protótipo funcional', 'Código / programa desenvolvido', 'Relatório científico', 'Portfólio (digital ou físico)', 'Apresentação oral', 'Vídeo produzido pelo aluno', 'Mapa conceitual'],
  },
  {
    id: 'somativa', label: 'Somativa', icon: FileCheck, defaultOpen: false,
    items: ['Avaliação escrita / Prova', 'Tarefa de casa'],
  },
  {
    id: 'rapida', label: 'Rápida (tempo real)', icon: Zap, defaultOpen: false,
    items: ['Exit ticket', 'Pergunta-chave ao final da aula', 'Votação interativa', 'Mini quiz diagnóstico contínuo'],
  },
]

const PACOTES_PRONTOS = [
  { id: 'expositiva',  label: 'Expositiva',
    recursos: ['Livro didático', 'Quadro branco', 'Projetor / Datashow', 'Material impresso / Xerox'],
    avaliacao: ['Observação e participação', 'Atividade em sala', 'Exercícios no caderno'] },
  { id: 'tecnologia',  label: 'Tecnologia',
    recursos: ['Computador / Tablet', 'Acesso à internet', 'Plataforma de quizzes (Kahoot / Quizizz)', 'AVA (Google Classroom / Moodle)'],
    avaliacao: ['Quiz diagnóstico rápido', 'Exit ticket', 'Avaliação processual'] },
  { id: 'investigativa', label: 'Investigativa',
    recursos: ['Roteiros de investigação', 'Material manipulável', 'Caderno de atividades'],
    avaliacao: ['Levantamento de hipóteses', 'Avaliação processual', 'Relatório científico'] },
  { id: 'maker',       label: 'Maker',
    recursos: ['Kit Arduino / ESP / IoT', 'Materiais recicláveis (prototipagem)', 'Laboratório móvel / experimental'],
    avaliacao: ['Protótipo funcional', 'Projeto / produto final', 'Avaliação por pares'] },
  { id: 'colaborativa', label: 'Colaborativa',
    recursos: ['Mural colaborativo (Padlet / Jamboard)', 'Documentos compartilhados (Google Docs)', 'Jogos educativos'],
    avaliacao: ['Trabalho em grupo', 'Avaliação por pares', 'Coavaliação (aluno + professor)'] },
]

const DESENVOLVIMENTO_TO_PACOTE: Record<number, string> = {
  1: 'expositiva', 2: 'investigativa', 3: 'maker',       4: 'investigativa',
  5: 'maker',      6: 'expositiva',    7: 'tecnologia',   8: 'colaborativa',
  9: 'tecnologia', 10: 'colaborativa', 11: 'expositiva',  12: 'tecnologia',
  13: 'tecnologia', 14: 'maker',       15: 'colaborativa', 16: 'colaborativa',
  17: 'expositiva', 18: 'tecnologia',  19: 'investigativa', 20: 'tecnologia',
}

const REFERENCIAS_PADRAO = `BRASIL. Base Nacional Comum Curricular. Brasília: Ministério da Educação, 2018. Disponível em: http://basenacionalcomum.mec.gov.br/. Acesso em: 5 jan. 2026.
BRASIL. Base Nacional Comum Curricular: Ensino Médio. Brasília: Ministério da Educação, 2018.
SÃO PAULO (Estado). Secretaria da Educação. Currículo Paulista: Ensino Médio. São Paulo: SEDUC-SP, 2020. Disponível em: https://efape.educacao.sp.gov.br/curriculopaulista/. Acesso em: 5 jan. 2026.
BRASIL. Conselho Nacional de Educação. Resolução CNE/CEB nº 3, de 21 de novembro de 2018. Atualiza as Diretrizes Curriculares Nacionais para o Ensino Médio. Diário Oficial da União: Brasília, DF, 22 nov. 2018.
BRASIL. Lei nº 9.394, de 20 de dezembro de 1996. Estabelece as diretrizes e bases da educação nacional. Diário Oficial da União: Brasília, DF, 23 dez. 1996.
BRASIL. Lei nº 13.415, de 16 de fevereiro de 2017. Altera a Lei nº 9.394/1996, que estabelece as bases da educação nacional. Diário Oficial da União: Brasília, DF, 17 fev. 2017.
BRASIL. Ministério da Educação. Avaliação e aprendizagens: reflexões a partir da BNCC. Brasília: MEC, 2018.
LUCKESI, Cipriano Carlos. Avaliação da aprendizagem escolar: estudos e proposições. 22. ed. São Paulo: Cortez, 2011.
PERRENOUD, Philippe. Avaliação: da excelência à regulação das aprendizagens. Porto Alegre: Artmed, 1999.
ZABALA, Antoni. A prática educativa: como ensinar. Porto Alegre: Artmed, 2010.
HADJI, Charles. Avaliação desmistificada. Porto Alegre: Artmed, 2001.
HERNÁNDEZ, Fernando. Transgressão e mudança na educação: os projetos de trabalho. Porto Alegre: Artmed, 1998.
LIBÂNEO, José Carlos. Didática. São Paulo: Cortez, 2013.
SAVIANI, Dermeval. Pedagogia histórico-crítica: primeiras aproximações. Campinas: Autores Associados, 2011.
VASCONCELLOS, Celso dos Santos. Avaliação da aprendizagem: práticas de mudança. São Paulo: Libertad, 2008.
HOFFMANN, Jussara. Avaliar para promover: as setas do caminho. Porto Alegre: Mediação, 2014.
FREIRE, Paulo. Pedagogia da autonomia: saberes necessários à prática educativa. São Paulo: Paz e Terra, 1996.
MORAN, José Manuel. Metodologias ativas para uma educação inovadora. Porto Alegre: Penso, 2018.
BACICH, Lilian; MORAN, José (org.). Metodologias ativas para uma educação inovadora: uma abordagem teórico-prática. Porto Alegre: Penso, 2018.
DARLING-HAMMOND, Linda et al. Preparando professores para um mundo em mudança. Porto Alegre: Penso, 2019.
BLACK, Paul; WILIAM, Dylan. Inside the black box: raising standards through classroom assessment. London: King's College, 1998.
WOLFF, Natály Rubert. Aprendizagem, avaliação e competência nas três versões da BNCC: conceitos em comparação. Dissertação (Mestrado). Universidade Federal de Mato Grosso do Sul, 2019.`

// ─── Helper Components ────────────────────────────────────────────────────────

function TecnicaBadge({ item, selected, onSelect, disabled = false, disabledReason, index = 0 }: {
  item: TecnicaItem; selected: boolean; onSelect: (id: number) => void;
  disabled?: boolean; disabledReason?: string; index?: number;
}) {
  return (
    <div
      className={s.tecnicaWrap}
      style={{ '--stagger': `${Math.min(index, 14) * 0.012}s` } as React.CSSProperties}
    >
      <button
        type="button"
        onClick={() => !disabled && onSelect(item.id)}
        className={`${s.tecnicaBadge} ${selected ? s.tecnicaBadgeActive : ''} ${disabled ? s.tecnicaBadgeDisabled : ''}`}
        title={disabledReason ?? undefined}
      >
        <span className={s.tecnicaNum}>{String(item.id).padStart(2, '0')}</span>
        <span className={s.tecnicaName}>{item.nome}</span>
        {selected && (
          <span className={s.tecnicaCheck} aria-hidden>
            <Check size={11} strokeWidth={3} />
          </span>
        )}
        <span className={s.tecnicaDescr}>{disabledReason ?? item.descritor}</span>
      </button>
    </div>
  )
}

function TecnicaDetailPanel({ item }: { item: TecnicaItem }) {
  return (
    <div className={s.tecnicaDetail}>
      <span className={s.tecnicaDetailTitle}>{item.nome}</span>
      <span className={s.tecnicaDetailDesc}>{item.descritor}</span>
    </div>
  )
}

function GrupoCheckbox({ grupos, value, onChange }: {
  grupos: RecursoGrupo[] | AvaliacaoGrupo[]; value: string; onChange: (v: string) => void;
}) {
  const groups: SelectorGroup[] = grupos.map(g => ({
    id: g.id, label: g.label, icon: g.icon, items: g.items, defaultOpen: g.defaultOpen,
  }))
  return <GroupedChipSelector groups={groups} value={value} onChange={onChange} />
}

function ChipSelect({ options, value, onChange }: {
  options: string[]; value: string; onChange: (v: string) => void;
}) {
  if (options.length === 0) return null
  const selectedArr = value
    ? value.split('\n').map(x => x.trim()).filter(Boolean)
    : [...options]
  return (
    <ChipSelector
      multi
      size="sm"
      options={options.map(opt => ({ value: opt, label: opt }))}
      value={selectedArr}
      onChange={vals => onChange(options.filter(o => vals.includes(o)).join('\n'))}
    />
  )
}

// ─── Curriculum-aware doc types ───────────────────────────────────────────────

const CURRICULUM_TYPES = ['PLANO_AULA', 'GUIA_APRENDIZAGEM', 'PLANO_ELETIVA', 'PLANO_EMA'] as const
const PEI_TYPES        = ['PEI'] as const

function isCurriculumType(t: string) { return CURRICULUM_TYPES.includes(t as never) }
function isPeiType(t: string)        { return PEI_TYPES.includes(t as never) }

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useFetch<T>(url: string | null) {
  const [data, setData]       = useState<T | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!url) { setData(null); return }
    setLoading(true)
    fetch(url)
      .then(r => {
        if (!r.ok) { setData(null); return }
        return r.json().then((d: T) => setData(d))
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [url])

  return { data, loading }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EditorClient({ doc, isAdmin }: Props) {
  const router   = useRouter()
  const docType  = doc.type as DocType
  const meta     = DOC_TYPES[docType]
  const content  = doc.content as Record<string, string>

  const [title,   setTitle]   = useState(doc.title)

  useRegisterBreadcrumb(doc.id, title.trim() || `documento ${doc.id}`)
  const [fields,  setFields]  = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(content).map(([k, v]) => [k, String(v ?? '')]))
  )
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [pdfing,  setPdfing]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Admin: escola selecionada ─────────────────────────────────────────────
  const [adminSchoolSlug, setAdminSchoolSlug] = useState<string>(
    fields._school_slug || ''
  )

  // ── Curriculum state (shared) ─────────────────────────────────────────────
  const [turmaId,      setTurmaId]      = useState<number | null>(Number(fields._turma_id) || null)
  const [disciplinaId, setDisciplinaId] = useState<number | null>(Number(fields._disciplina_id) || null)
  const [bimestreNum,  setBimestreNum]  = useState<number | null>(Number(fields._bimestre) || null)
  const [aulaId,       setAulaId]       = useState<number | null>(Number(fields._aula_id) || null)
  const [ciclo,        setCiclo]        = useState<string>(fields._ciclo || '')
  const [serie,        setSerie]        = useState<string>(fields._serie || '')
  const [aulasNome,    setAulasNome]    = useState<string>(fields._aulas_nome || '')
  const [selAEs,       setSelAEs]       = useState<string[]>(
    (() => { try { return JSON.parse(fields._aprendizagens || '[]') } catch { return [] } })()
  )
  const [selInstr,     setSelInstr]     = useState<string[]>(
    (() => { try { return JSON.parse(fields._instrumentos || '[]') } catch { return [] } })()
  )

  // ── PEI state ─────────────────────────────────────────────────────────────
  const [peiStudentId, setPeiStudentId] = useState<number | null>(Number(fields._pei_student_id) || null)

  // ── PLANO_AULA state ──────────────────────────────────────────────────────
  const [planoStep, setPlanoStep] = useState<1|2|3>(() => {
    if (fields.aula_ids || fields.aula_id) return 3
    if (fields.disciplina && fields.bimestre) return 2
    return 1
  })
  const [selectedTurmas, setSelectedTurmas] = useState<string[]>(() => {
    if (fields.turmas) return fields.turmas.split(', ').filter(Boolean)
    if (fields.turma)  return [fields.turma]
    return []
  })
  const [planoAulaIds, setPlanoAulaIds] = useState<number[]>(() => {
    if (fields.aula_ids) return fields.aula_ids.split(',').map(Number).filter(Boolean)
    if (fields.aula_id)  return [Number(fields.aula_id)].filter(Boolean)
    return []
  })
  const [aulaSearch, setAulaSearch] = useState('')
  const [momentoIds,     setMomentoIds]     = useState<number[]>(
    fields.momento_ids ? fields.momento_ids.split(',').map(Number).filter(Boolean) : []
  )
  const [desenvolvP1Ids, setDesenvP1Ids]   = useState<number[]>(
    fields.desenv_p1_ids ? fields.desenv_p1_ids.split(',').map(Number).filter(Boolean) : []
  )
  const [desenvolvP2Ids, setDesenvP2Ids]   = useState<number[]>(
    fields.desenv_p2_ids ? fields.desenv_p2_ids.split(',').map(Number).filter(Boolean) : []
  )
  const [desenvolvP3Ids, setDesenvP3Ids]   = useState<number[]>(
    fields.desenv_p3_ids ? fields.desenv_p3_ids.split(',').map(Number).filter(Boolean) : []
  )
  const [fechamentoIds,  setFechamentoIds]  = useState<number[]>(
    fields.fechamento_ids ? fields.fechamento_ids.split(',').map(Number).filter(Boolean) : []
  )
  const [habilidadeOpcoes, setHabilidadeOpcoes] = useState<string[]>(
    fields.habilidades ? fields.habilidades.split('\n').filter(Boolean) : []
  )
  const [conteudoOpcoes, setConteudoOpcoes] = useState<string[]>(
    fields.conteudo_opcoes ? fields.conteudo_opcoes.split('\n').filter(Boolean) : []
  )

  // Auto-fill references on first open
  useEffect(() => {
    if (docType === 'PLANO_AULA' && !fields.referencias) {
      setFields(prev => ({ ...prev, referencias: REFERENCIAS_PADRAO }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Fetch curriculum data ─────────────────────────────────────────────────
  const turmasUrl = isAdmin && !adminSchoolSlug
    ? '/api/less/turmas'
    : isAdmin && adminSchoolSlug
      ? `/api/less/turmas?school=${adminSchoolSlug}`
      : '/api/less/turmas'

  const { data: turmasRaw } = useFetch<TurmasResponse>(turmasUrl)
  const needsSchool  = turmasRaw && !Array.isArray(turmasRaw) && 'needsSchool' in turmasRaw
  const adminSchools: SchoolOption[] = (needsSchool ? (turmasRaw as { schools: SchoolOption[] }).schools : [])
  const turmas: Turma[] | null = Array.isArray(turmasRaw) ? turmasRaw : null

  const { data: bimestres }   = useFetch<Bimestre[]>('/api/less/bimestres')
  const { data: instrumentos } = useFetch<Instrumento[]>('/api/less/instrumentos')
  const { data: peiStudents }  = useFetch<PeiStudent[]>(isPeiType(docType) ? '/api/less/pei-students' : null)

  const disciplinasUrl = turmaId ? `/api/less/disciplinas?classId=${turmaId}` : null
  const { data: disciplinas } = useFetch<Disciplina[]>(disciplinasUrl)

  const aulaBase = (turmaId && disciplinaId && bimestreNum && ciclo && serie && aulasNome)
  const aulasUrl = aulaBase ? `/api/less/aulas?disciplina=${encodeURIComponent(aulasNome)}&serie=${serie}&ciclo=${ciclo}&bimestre=${bimestreNum}` : null
  const { data: aulas } = useFetch<Aula[]>(aulasUrl)

  const aeUrl = aulaBase ? `/api/less/aprendizagens?disciplina=${encodeURIComponent(aulasNome)}&serie=${serie}&ciclo=${ciclo}&bimestre=${bimestreNum}` : null
  const { data: aes }  = useFetch<AE[]>(aeUrl)

  // ── Field helpers ─────────────────────────────────────────────────────────

  function setField(key: string, value: string) {
    setFields(prev => ({ ...prev, [key]: value }))
    scheduleSave({ ...fields, [key]: value })
  }

  function scheduleSave(f: Record<string, string>) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => autoSave(title, buildContent(f)), 1500)
  }

  function buildContent(f: Record<string, string>): Record<string, string> {
    return {
      ...f,
      _turma_id:        String(turmaId ?? ''),
      _disciplina_id:   String(disciplinaId ?? ''),
      _bimestre:        String(bimestreNum ?? ''),
      _aula_id:         String(aulaId ?? ''),
      _ciclo:           ciclo,
      _serie:           serie,
      _aulas_nome:      aulasNome,
      _aprendizagens:   JSON.stringify(selAEs),
      _instrumentos:    JSON.stringify(selInstr),
      _pei_student_id:  String(peiStudentId ?? ''),
    }
  }

  // ── Curriculum cascade handlers ───────────────────────────────────────────

  function handleTurmaChange(id: number) {
    const t = turmas?.find(t => t.id === id)
    if (!t) return
    setTurmaId(id)
    setCiclo(t.ciclo)
    setSerie(t.serie)
    setDisciplinaId(null); setAulasNome(''); setAulaId(null)
    setField('_turma_nome', t.name)
  }

  // PLANO_AULA: multi-select turmas
  function togglePlanoTurma(t: Turma) {
    const name = t.name
    setSelectedTurmas(prev => {
      const next = prev.includes(name)
        ? prev.filter(x => x !== name)
        : [...prev, name]
      const primary = next[0] ?? ''
      setFields(f => ({ ...f, turma: primary, turmas: next.join(', ') }))
      scheduleSave({ ...fields, turma: primary, turmas: next.join(', ') })
      // Update turmaId to primary turma (for disciplina cascade)
      if (next.length > 0 && !prev.includes(name)) {
        setTurmaId(t.id)
        setCiclo(t.ciclo)
        setSerie(t.serie)
        setDisciplinaId(null); setAulasNome('')
      }
      return next
    })
  }

  function handleDisciplinaChange(id: number) {
    const d = disciplinas?.find(d => d.id === id)
    if (!d) return
    setDisciplinaId(id)
    setAulasNome(d.aulasNome)
    setAulaId(null)
    setField('_disciplina_nome', d.name)
  }

  function handlePlanoDisciplinaChange(id: number) {
    const d = disciplinas?.find(d => d.id === id)
    if (!d) return
    setDisciplinaId(id)
    setAulasNome(d.aulasNome)
    setField('disciplina', d.name)
  }

  function handleBimestreChange(num: number) {
    setBimestreNum(num)
    setAulaId(null)
    setField('_bimestre', String(num))
  }

  function handlePlanoBimestreChange(num: number) {
    setBimestreNum(num)
    setFields(f => ({ ...f, bimestre: String(num) }))
    scheduleSave({ ...fields, bimestre: String(num) })
  }

  function handleAulaChange(id: number) {
    const a = aulas?.find(a => a.id === id)
    if (!a) return
    setAulaId(id)
    setFields(prev => ({
      ...prev,
      _aula_id:            String(id),
      _aula_num:           String(a.aulaNum),
      _titulo_aula:        a.titulo,
      habilidade_codigo:   a.habilidadeCodigo ?? '',
      habilidade_texto:    a.habilidadeTexto ?? '',
      unidade_tematica:    a.unidadeTematica ?? '',
      objeto_conhecimento: a.objetoConhecimento ?? '',
      conteudo_aula:       a.conteudo ?? '',
      objetivos_aula:      a.objetivos ?? '',
    }))
    scheduleSave({
      ...fields,
      _aula_id: String(id),
      _titulo_aula: a.titulo,
      habilidade_codigo: a.habilidadeCodigo ?? '',
      conteudo_aula: a.conteudo ?? '',
      objetivos_aula: a.objetivos ?? '',
    })
  }

  // PLANO_AULA: toggle aula in multi/single select
  function togglePlanoAula(id: number) {
    const multiSelect = fields.periodo !== 'por_aula'
    setPlanoAulaIds(prev =>
      !multiSelect ? [id] : prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  // PLANO_AULA: apply selected aulas → fill content fields
  function applyAulas() {
    const selected = (aulas ?? []).filter(a => planoAulaIds.includes(a.id))
    if (selected.length === 0) return

    const parseLines = (raw: string | undefined): string[] =>
      (raw ?? '').split(/\n/).map(x => x.replace(/^[\s\-•*–]+/, '').trim()).filter(x => x.length > 2)

    const multiSelect = fields.periodo !== 'por_aula'

    if (!multiSelect) {
      const a = selected[0]
      const habs   = parseLines(a.habilidadeTexto)
      const codes  = (a.habilidadeCodigo ?? '').split(',').map(x => x.trim()).filter(Boolean)
      const habLines = habs.length > 0 ? habs : codes
      const contItems = parseLines(a.conteudo)
      setHabilidadeOpcoes(habLines)
      setConteudoOpcoes(contItems)
      setFields(prev => ({
        ...prev,
        aula_id:             String(a.id),
        aula_num:            String(a.aulaNum),
        tema:                a.titulo,
        eixo:                a.eixo ?? '',
        unidade_tematica:    a.unidadeTematica ?? '',
        objeto_conhecimento: a.objetoConhecimento ?? '',
        bloco:               a.bloco ?? '',
        objetivo_geral:      a.objetivos ?? '',
        habilidades:         habLines.join('\n'),
        conteudo:            contItems.join('\n'),
        conteudo_opcoes:     contItems.join('\n'),
      }))
      scheduleSave({ ...fields, tema: a.titulo, aula_id: String(a.id) })
    } else {
      const tema    = selected.map(a => a.titulo).join(' | ')
      const allHabs = [...new Set(selected.flatMap(a => parseLines(a.habilidadeTexto)))]
      const allCont = [...new Set(selected.flatMap(a => parseLines(a.conteudo)))]
      const allObj  = [...new Set(selected.flatMap(a => parseLines(a.objetivos)))]
      setHabilidadeOpcoes(allHabs)
      setConteudoOpcoes(allCont)
      setFields(prev => ({
        ...prev,
        aula_ids:       planoAulaIds.join(','),
        aula_nums:      selected.map(a => String(a.aulaNum)).join(', '),
        tema,
        habilidades:    allHabs.join('\n'),
        conteudo:       allCont.join('\n'),
        conteudo_opcoes: allCont.join('\n'),
        objetivo_geral: allObj.join('\n'),
      }))
      scheduleSave({ ...fields, tema, aula_ids: planoAulaIds.join(',') })
    }

    setPlanoStep(3)
  }

  function handlePeiStudentChange(id: number) {
    const p = peiStudents?.find(p => p.id === id)
    if (!p) return
    setPeiStudentId(id)
    setFields(prev => ({
      ...prev,
      _pei_student_id:  String(id),
      aluno:            p.name,
      ra:               p.ra,
      turma:            p.turma,
      diagnostico_cid:  p.diagnostico ?? '',
      profissionais:    [p.profColaborativo, p.profAee].filter(Boolean).join(', '),
    }))
    scheduleSave({ ...fields, aluno: p.name, ra: p.ra, turma: p.turma })
  }

  function toggleAE(descricao: string) {
    setSelAEs(prev => {
      const next = prev.includes(descricao) ? prev.filter(x => x !== descricao) : [...prev, descricao]
      setFields(f => ({ ...f, _aprendizagens: JSON.stringify(next) }))
      scheduleSave({ ...fields, _aprendizagens: JSON.stringify(next) })
      return next
    })
  }

  function toggleInstrumento(nome: string) {
    setSelInstr(prev => {
      const next = prev.includes(nome) ? prev.filter(x => x !== nome) : [...prev, nome]
      setFields(f => ({ ...f, _instrumentos: JSON.stringify(next) }))
      scheduleSave({ ...fields, _instrumentos: JSON.stringify(next) })
      return next
    })
  }

  // ── Save / Export ─────────────────────────────────────────────────────────

  async function autoSave(t: string, c: Record<string, string>) {
    setSaving(true)
    try {
      const res = await fetch(`/api/documentos/${doc.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title: t, content: c }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Falha ao salvar automaticamente — suas alterações podem não ter sido salvas.')
        return
      }
      setError(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Sem conexão — alterações não salvas. Verifique sua internet.')
    } finally { setSaving(false) }
  }

  async function save() {
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/documentos/${doc.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title, content: buildContent(fields) }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error); return }
      setSaved(true); setTimeout(() => setSaved(false), 2000)
      router.refresh()
    } finally { setSaving(false) }
  }

  async function generatePdf() {
    setPdfing(true); setError(null)
    try {
      await save()

      // PEI em lote: múltiplos alunos → um PDF por aluno
      if (docType === 'PEI' && fields._selectedStudentIds) {
        const ids = fields._selectedStudentIds.split(',').map(Number).filter(Boolean)
        if (ids.length > 1) {
          const studentsRes = await fetch('/api/less/pei-students')
          const allStudents: { id: number; name: string; ra: string; turma: string; diagnostico?: string; profColaborativo?: string; profAee?: string }[] =
            studentsRes.ok ? await studentsRes.json() : []
          const students = ids.map(id => allStudents.find(s => s.id === id)).filter(Boolean)
          const res = await fetch('/api/pei/batch-pdf', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ students, sharedContent: buildContent(fields), title }),
          })
          if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Erro ao gerar PDFs.'); return }
          const { pdfs } = await res.json() as { pdfs: { studentName: string; pdfBase64: string }[] }
          for (const { studentName, pdfBase64 } of pdfs) {
            const bytes = atob(pdfBase64)
            const arr = new Uint8Array(bytes.length)
            for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
            const blob = new Blob([arr], { type: 'application/pdf' })
            const url  = URL.createObjectURL(blob)
            const a    = document.createElement('a')
            a.href = url; a.download = `PEI - ${studentName}.pdf`; a.click()
            URL.revokeObjectURL(url)
            await new Promise(r => setTimeout(r, 250))
          }
          router.refresh()
          return
        }
      }

      const res = await fetch(`/api/documentos/${doc.id}/pdf`, { method: 'POST' })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Erro ao gerar PDF.'); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      router.refresh()
    } finally { setPdfing(false) }
  }

  const [docxing, setDocxing] = useState(false)
  async function generateDocx() {
    setDocxing(true)
    try {
      await save()
      const res = await fetch(`/api/documentos/${doc.id}/docx`, { method: 'POST' })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Erro ao gerar Word.'); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } finally { setDocxing(false) }
  }

  async function deletDoc() {
    setConfirmDelete(false)
    const res = await fetch(`/api/documentos/${doc.id}`, { method: 'DELETE' })
    if (res.ok) router.push('/dashboard/documentos')
    else { const d = await res.json(); setError(d.error) }
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  function renderCurriculumCascade() {
    const selectedTurma = turmas?.find(t => t.id === turmaId)
    const selectedDisc  = disciplinas?.find(d => d.id === disciplinaId)
    const selectedBim   = bimestres?.find(b => b.numero === bimestreNum)
    const selectedAula  = aulas?.find(a => a.id === aulaId)

    return (
      <div className={s.cascadeSection}>
        <p className={s.cascadeSectionTitle}>contexto curricular</p>

        {isAdmin && needsSchool && (
          <div className={s.cascadeField}>
            <label className={s.cascadeLabel}>escola</label>
            <ChipSelector
              size="sm"
              value={adminSchoolSlug}
              onChange={slug => { setAdminSchoolSlug(slug); setField('_school_slug', slug) }}
              options={adminSchools.map(sch => ({ value: sch.slug, label: sch.name }))}
            />
          </div>
        )}

        <div className={s.cascadeField}>
          <label className={s.cascadeLabel}>turma</label>
          {isAdmin && needsSchool && !adminSchoolSlug ? (
            <p className={s.cascadeLoading}>selecione uma escola acima…</p>
          ) : !turmas ? (
            <p className={s.cascadeLoading}>carregando turmas…</p>
          ) : turmas.length === 0 ? (
            <p className={s.emptyMsg}>nenhuma turma atribuída</p>
          ) : (
            <ChipSelector
              size="md"
              value={turmaId ? String(turmaId) : null}
              onChange={v => handleTurmaChange(Number(v))}
              options={turmas.map(t => ({ value: String(t.id), label: t.name, sub: t.grade }))}
            />
          )}
        </div>

        {turmaId && (
          <div className={s.cascadeField}>
            <label className={s.cascadeLabel}>disciplina</label>
            {!disciplinas ? (
              <p className={s.cascadeLoading}>carregando disciplinas…</p>
            ) : disciplinas.length === 0 ? (
              <p className={s.emptyMsg}>nenhuma disciplina para esta turma</p>
            ) : (
              <ChipSelector
                size="md"
                value={disciplinaId ? String(disciplinaId) : null}
                onChange={v => handleDisciplinaChange(Number(v))}
                options={disciplinas.map(d => ({ value: String(d.id), label: d.name }))}
              />
            )}
          </div>
        )}

        {turmaId && disciplinaId && (
          <div className={s.cascadeField}>
            <label className={s.cascadeLabel}>bimestre</label>
            {!bimestres ? (
              <p className={s.cascadeLoading}>carregando…</p>
            ) : (
              <ChipSelector
                size="md"
                value={bimestreNum ? String(bimestreNum) : null}
                onChange={v => handleBimestreChange(Number(v))}
                options={bimestres.map(b => ({ value: String(b.numero), label: b.label }))}
              />
            )}
          </div>
        )}

        {selectedTurma && (
          <div className={s.cascadePills}>
            <span className={s.pill}>
              {selectedTurma.ciclo === 'fundamental' ? 'EF' : 'EM'} · {selectedTurma.serie}ª série
            </span>
            {selectedDisc && <span className={s.pill}>{selectedDisc.name}</span>}
            {selectedBim  && <span className={s.pill}>{selectedBim.label}</span>}
          </div>
        )}

        {docType === 'PLANO_AULA' && aulaBase && (
          <div className={s.aulaSection}>
            <label className={s.cascadeLabel}>aula do currículo</label>
            {!aulas ? (
              <p className={s.cascadeLoading}>carregando aulas…</p>
            ) : aulas.length === 0 ? (
              <p className={s.emptyMsg}>nenhuma aula encontrada para este período</p>
            ) : (
              <div className={s.aulaList}>
                {aulas.map(a => {
                  const sel = aulaId === a.id
                  return (
                    <button
                      key={a.id}
                      className={`${s.aulaItem} ${sel ? s.aulaItemSelected : ''}`}
                      onClick={() => handleAulaChange(a.id)}
                    >
                      <span className={s.aulaItemTop}>
                        <span className={s.aulaNum}><span>{a.aulaNum}</span></span>
                        <span className={s.aulaInfo2col}>
                          <span className={s.aulaTitulo}>{a.titulo}</span>
                          {(a.eixo || a.unidadeTematica) && (
                            <span className={s.aulaSubtitle}>{a.eixo ?? a.unidadeTematica}</span>
                          )}
                        </span>
                        {sel
                          ? <span className={s.aulaCheck}><Check size={14} strokeWidth={3} /></span>
                          : <span className={s.aulaArrow}><ArrowRight size={14} /></span>
                        }
                      </span>
                      {(a.conteudo || a.objetivos) && (
                        <p className={s.aulaDescription}>{a.conteudo ?? a.objetivos}</p>
                      )}
                      {a.habilidadeCodigo && (
                        <div className={s.aulaTags}>
                          <span className={s.aulaCode}>{a.habilidadeCodigo.split(',')[0].trim()}</span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {docType === 'PLANO_AULA' && selectedAula && (
          <div className={s.aulaInfo}>
            {fields.unidade_tematica && (
              <div className={s.aulaInfoItem}>
                <span className={s.aulaInfoLabel}>unidade temática</span>
                <span className={s.aulaInfoValue}>{fields.unidade_tematica}</span>
              </div>
            )}
            {fields.habilidade_codigo && (
              <div className={s.aulaInfoItem}>
                <span className={s.aulaInfoLabel}>habilidade(s)</span>
                <span className={s.aulaInfoValue}>{fields.habilidade_codigo}</span>
              </div>
            )}
            {fields.objeto_conhecimento && (
              <div className={s.aulaInfoItem}>
                <span className={s.aulaInfoLabel}>objeto de conhecimento</span>
                <span className={s.aulaInfoValue}>{fields.objeto_conhecimento}</span>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  function renderPlanoAulaWizard() {
    const selectedDisc = disciplinas?.find(d => d.id === disciplinaId)
    const selectedBim  = bimestres?.find(b => b.numero === bimestreNum)
    const canStep2 = selectedTurmas.length > 0 && !!disciplinaId && !!bimestreNum
    const canStep3 = planoAulaIds.length > 0
    const multiSelect = fields.periodo !== 'por_aula'
    const tipoAula: TipoAula = (fields.tipo_aula as TipoAula) ?? 'individual'
    const aulaCfg = TIPO_AULA_CFG[tipoAula]

    const STEPS = [
      { n: 1 as const, label: 'Período' },
      { n: 2 as const, label: 'Aulas' },
      { n: 3 as const, label: 'Formulário' },
    ]

    return (
      <div className={s.wizard}>

        {/* ── Step indicator ── */}
        <div className={s.stepIndicator}>
          {STEPS.map((step, i) => {
            const done   = planoStep > step.n
            const active = planoStep === step.n
            const canGo  = step.n === 1 || (step.n === 2 && canStep2) || (step.n === 3 && canStep3)
            return (
              <Fragment key={step.n}>
                <button
                  className={`${s.stepBtn} ${active ? s.stepBtnActive : ''} ${done ? s.stepBtnDone : ''}`}
                  onClick={() => canGo && setPlanoStep(step.n)}
                  disabled={!canGo}
                >
                  <span className={s.stepNum}>{done ? <Check size={9} /> : step.n}</span>
                  <span className={s.stepName}>{step.label}</span>
                </button>
                {i < STEPS.length - 1 && <div className={s.stepLine} />}
              </Fragment>
            )
          })}
        </div>

        {/* ── Step 1: Período ── */}
        {planoStep === 1 && (
          <div className={s.wizardStep}>

            {/* Tipo de plano */}
            <div className={s.wizardGroup}>
              <p className={s.subLabel}>tipo de plano</p>
              <ChipSelector
                size="md"
                value={fields.periodo}
                onChange={v => setField('periodo', v)}
                options={[
                  { value: 'por_aula',  label: 'Por aula' },
                  { value: 'semanal',   label: 'Semanal' },
                  { value: 'quinzenal', label: 'Quinzenal' },
                  { value: 'bimestral', label: 'Bimestral' },
                ]}
              />
            </div>

            {/* Turma — multi-select pills */}
            <div className={s.wizardGroup}>
              <p className={s.subLabel}>turma(s)</p>
              {isAdmin && needsSchool && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <ChipSelector
                    size="sm"
                    value={adminSchoolSlug}
                    onChange={slug => { setAdminSchoolSlug(slug); setField('_school_slug', slug) }}
                    options={adminSchools.map(sch => ({ value: sch.slug, label: sch.name }))}
                  />
                </div>
              )}
              {isAdmin && needsSchool && !adminSchoolSlug ? (
                <p className={s.cascadeLoading}>selecione uma escola acima…</p>
              ) : !turmas ? (
                <p className={s.cascadeLoading}>carregando turmas…</p>
              ) : turmas.length === 0 ? (
                <p className={s.emptyMsg}>nenhuma turma atribuída</p>
              ) : (
                <ChipSelector
                  multi
                  size="md"
                  value={selectedTurmas}
                  onChange={vals => {
                    const toRemove = selectedTurmas.filter(n => !vals.includes(n))
                    const toAdd    = vals.filter(n => !selectedTurmas.includes(n))
                    toRemove.forEach(name => { const t = turmas.find(x => x.name === name); if (t) togglePlanoTurma(t) })
                    toAdd.forEach(name => { const t = turmas.find(x => x.name === name); if (t) togglePlanoTurma(t) })
                  }}
                  options={turmas.map(t => ({ value: t.name, label: t.name, sub: t.grade }))}
                />
              )}
            </div>

            {/* Disciplina + Bimestre + Data */}
            {turmaId && (
              <div className={s.disciplineGrid}>
                <div className={s.wizardSubGroup}>
                  <p className={s.subLabel}>disciplina</p>
                  <div className={s.selectWrap}>
                    <select
                      className={s.cascadeSelect}
                      value={disciplinaId ?? ''}
                      disabled={!disciplinas}
                      onChange={e => handlePlanoDisciplinaChange(Number(e.target.value))}
                    >
                      <option value="">selecionar…</option>
                      {(disciplinas ?? []).map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className={s.selectChevron} />
                  </div>
                </div>

                <div className={s.wizardSubGroup}>
                  <p className={s.subLabel}>bimestre</p>
                  <ChipSelector
                    size="sm"
                    value={bimestreNum ? String(bimestreNum) : null}
                    onChange={v => handlePlanoBimestreChange(Number(v))}
                    options={(bimestres ?? []).map(b => ({ value: String(b.numero), label: b.label }))}
                  />
                </div>

                <div className={s.wizardSubGroup}>
                  <p className={s.subLabel}>data da aula</p>
                  <input
                    className={s.fieldInput}
                    type="date"
                    value={fields.data ?? ''}
                    onChange={e => setField('data', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Advance */}
            {canStep2 && (
              <div className={s.wizardAdvRow}>
                <button className={s.stepAdvBtn} onClick={() => setPlanoStep(2)}>
                  Ver aulas <ArrowRight size={13} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Aulas ── */}
        {planoStep === 2 && (
          <div className={s.wizardStep}>
            {/* Context badges */}
            <div className={s.cascadePills}>
              {selectedTurmas.map(t => (
                <Badge key={t} tone="brand" size="sm" icon={<Users size={9} />}>{t}</Badge>
              ))}
              {selectedDisc && <Badge tone="violet" size="sm" icon={<BookOpen size={9} />}>{selectedDisc.name}</Badge>}
              {selectedBim  && <Badge tone="amber" size="sm" icon={<Layers size={9} />}>{selectedBim.label}</Badge>}
              {multiSelect && <Badge tone="teal" size="sm" withDot>múltiplas aulas</Badge>}
            </div>

            {/* Header: search + counter */}
            <div className={s.aulaListHeader}>
              <div className={s.aulaSearchWrap}>
                <Search size={13} className={s.aulaSearchIcon} />
                <input
                  type="text"
                  className={s.aulaSearch}
                  placeholder="Buscar aula por título, habilidade ou conteúdo…"
                  value={aulaSearch}
                  onChange={e => setAulaSearch(e.target.value)}
                />
                {aulaSearch && (
                  <button
                    type="button"
                    className={s.aulaSearchClear}
                    onClick={() => setAulaSearch('')}
                    aria-label="Limpar busca"
                  >
                    <Check size={11} style={{ display: 'none' }} />
                    ×
                  </button>
                )}
              </div>
              {aulas && aulas.length > 0 && (
                <span className={s.aulaCounter}>
                  {planoAulaIds.length > 0 && <strong>{planoAulaIds.length}</strong>}
                  {planoAulaIds.length > 0 && ' de '}
                  {aulas.length} aula{aulas.length === 1 ? '' : 's'}
                </span>
              )}
            </div>

            {!aulas ? (
              <p className={s.cascadeLoading}>carregando aulas…</p>
            ) : aulas.length === 0 ? (
              <div className={s.aulaEmptyState}>
                <BookOpen size={28} strokeWidth={1.3} />
                <p>nenhuma aula encontrada para este período</p>
              </div>
            ) : (() => {
              const query = aulaSearch.trim().toLowerCase()
              const filtered = !query ? aulas : aulas.filter(a =>
                [a.titulo, a.habilidadeCodigo, a.habilidadeTexto, a.conteudo, a.eixo, a.unidadeTematica]
                  .some(s => s?.toLowerCase().includes(query))
              )
              if (filtered.length === 0) {
                return (
                  <div className={s.aulaEmptyState}>
                    <Search size={24} strokeWidth={1.3} />
                    <p>nenhuma aula corresponde à busca</p>
                  </div>
                )
              }
              return (
                <div className={s.aulaList}>
                  {filtered.map((a, idx) => {
                    const sel = planoAulaIds.includes(a.id)
                    return (
                      <button
                        key={a.id}
                        className={`${s.aulaItem} ${sel ? s.aulaItemSelected : ''}`}
                        style={{ '--stagger': `${Math.min(idx, 15) * 0.018}s` } as React.CSSProperties}
                        onClick={() => {
                          togglePlanoAula(a.id)
                          if (!multiSelect) {
                            setPlanoAulaIds([a.id])
                            const parseLines = (raw: string | undefined): string[] =>
                              (raw ?? '').split(/\n/).map(x => x.replace(/^[\s\-•*–]+/, '').trim()).filter(x => x.length > 2)
                            const habs = parseLines(a.habilidadeTexto)
                            const codes = (a.habilidadeCodigo ?? '').split(',').map(x => x.trim()).filter(Boolean)
                            const habLines = habs.length > 0 ? habs : codes
                            const contItems = parseLines(a.conteudo)
                            setHabilidadeOpcoes(habLines)
                            setConteudoOpcoes(contItems)
                            setFields(prev => ({
                              ...prev,
                              aula_id: String(a.id),
                              aula_num: String(a.aulaNum),
                              tema: a.titulo,
                              eixo: a.eixo ?? '',
                              unidade_tematica: a.unidadeTematica ?? '',
                              objeto_conhecimento: a.objetoConhecimento ?? '',
                              bloco: a.bloco ?? '',
                              objetivo_geral: a.objetivos ?? '',
                              habilidades: habLines.join('\n'),
                              conteudo: contItems.join('\n'),
                              conteudo_opcoes: contItems.join('\n'),
                            }))
                            scheduleSave({ ...fields, tema: a.titulo, aula_id: String(a.id) })
                            setPlanoStep(3)
                          }
                        }}
                      >
                        <span className={s.aulaItemTop}>
                          <span className={s.aulaNum}><span>{a.aulaNum}</span></span>
                          <span className={s.aulaInfo2col}>
                            <span className={s.aulaTitulo}>{a.titulo}</span>
                            {(a.eixo || a.unidadeTematica) && (
                              <span className={s.aulaSubtitle}>{a.eixo ?? a.unidadeTematica}</span>
                            )}
                          </span>
                          {sel
                            ? <span className={s.aulaCheck}><Check size={14} strokeWidth={3} /></span>
                            : <span className={s.aulaArrow}><ArrowRight size={14} /></span>
                          }
                        </span>
                        {(a.conteudo || a.objetivos) && (
                          <div className={s.aulaBody}>
                            <p className={s.aulaDescription}>
                              {a.conteudo ?? a.objetivos}
                            </p>
                          </div>
                        )}
                        <div className={s.aulaTags}>
                          {a.habilidadeCodigo && (
                            <span className={s.aulaCode}>{a.habilidadeCodigo.split(',')[0].trim()}</span>
                          )}
                          {a.objetoConhecimento && (
                            <span className={s.aulaTag} title={a.objetoConhecimento}>
                              <BookOpen size={9} />
                              {a.objetoConhecimento}
                            </span>
                          )}
                          {a.bloco && (
                            <span className={s.aulaTag}>
                              <Layers size={9} />
                              Bloco {a.bloco}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            })()}

            {multiSelect && canStep3 && (
              <div className={s.wizardAdvRow}>
                <button className={s.stepAdvBtn} onClick={applyAulas}>
                  Usar seleção ({planoAulaIds.length}) <ArrowRight size={13} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Formulário ── */}
        {planoStep === 3 && (
          <div className={s.wizardStep}>

            {/* Context banner */}
            <div className={s.cascadePills}>
              {selectedTurmas.map(t => <span key={t} className={s.pill}>{t}</span>)}
              {selectedDisc && <span className={s.pill}>{selectedDisc.name}</span>}
              {selectedBim  && <span className={s.pill}>{selectedBim.label}</span>}
              {fields.aula_id && <span className={s.pill}>Aula {fields.aula_num || fields.aula_id}</span>}
            </div>

            {/* ── Seção: Identificação ── */}
            <div className={s.planoSection}>
              <div className={s.planoSectionHeader}>
                <div className={s.planoSectionDot} />
                <span className={s.planoSectionTitle}>Identificação</span>
              </div>
              <div className={s.field}>
                <label className={s.fieldLabel}>Tema / Título da aula</label>
                <input
                  className={s.fieldInput}
                  type="text"
                  value={fields.tema ?? ''}
                  placeholder="Ex: Funções do 1º Grau"
                  onChange={e => setField('tema', e.target.value)}
                />
              </div>
            </div>

            {/* ── Seção: Objetivos e Habilidades ── */}
            <div className={s.planoSection}>
              <div className={s.planoSectionHeader}>
                <div className={s.planoSectionDot} />
                <span className={s.planoSectionTitle}>Objetivos e Habilidades</span>
              </div>
              <div className={s.field}>
                <label className={s.fieldLabel}>Objetivo geral</label>
                <textarea
                  className={s.fieldTextarea}
                  rows={3}
                  value={fields.objetivo_geral ?? ''}
                  placeholder="O que o aluno deverá ser capaz de fazer ao final da aula?"
                  onChange={e => setField('objetivo_geral', e.target.value)}
                />
              </div>
              <div className={s.field}>
                <label className={s.fieldLabel}>
                  Habilidades BNCC / Currículo Paulista
                  <span className={s.autoTag}>preenchido automaticamente</span>
                </label>
                {habilidadeOpcoes.length > 0 ? (
                  <div className={s.habList}>
                    {habilidadeOpcoes.map((h, i) => (
                      <div key={i} className={s.habItem}>
                        <span className={s.habDot} />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={s.habEmpty}>preenchido ao selecionar a aula</div>
                )}
              </div>
              {fields.objeto_conhecimento && (
                <div className={s.field}>
                  <label className={s.fieldLabel}>Objeto de Conhecimento</label>
                  <input
                    className={s.fieldInput}
                    type="text"
                    value={fields.objeto_conhecimento ?? ''}
                    onChange={e => setField('objeto_conhecimento', e.target.value)}
                  />
                </div>
              )}
              {aes && aes.length > 0 && (
                <div className={s.field}>
                  <label className={s.fieldLabel}>Aprendizagens Essenciais do Bimestre</label>
                  <div className={s.aeList}>
                    {aes.map(ae => (
                      <div key={ae.codigo} className={s.aeItem}>
                        <span className={s.aeCode}>{ae.codigo}</span>
                        <span className={s.aeDesc}>{ae.descricao}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Seção: Conteúdo e Desenvolvimento ── */}
            <div className={s.planoSection}>
              <div className={s.planoSectionHeader}>
                <div className={s.planoSectionDot} />
                <span className={s.planoSectionTitle}>Conteúdo e Desenvolvimento</span>
              </div>

              {/* Conteúdo */}
              <div className={s.field}>
                <label className={s.fieldLabel}>
                  Conteúdo
                  {conteudoOpcoes.length > 0 && <span className={s.autoTag}>clique para incluir/excluir</span>}
                </label>
                {conteudoOpcoes.length > 0 ? (
                  <ChipSelect
                    options={conteudoOpcoes}
                    value={fields.conteudo ?? ''}
                    onChange={v => setField('conteudo', v)}
                  />
                ) : (
                  <textarea
                    className={s.fieldTextarea}
                    rows={4}
                    value={fields.conteudo ?? ''}
                    placeholder="Conteúdos a serem trabalhados..."
                    onChange={e => setField('conteudo', e.target.value)}
                  />
                )}
              </div>

              {/* Tipo de aula */}
              <div className={s.field}>
                <label className={s.fieldLabel}>Tipo de aula</label>
                <div className={s.tipoAulaToggle}>
                  {(['individual', 'dupla'] as TipoAula[]).map(tipo => (
                    <button
                      key={tipo}
                      type="button"
                      className={`${s.tipoAulaBtn} ${tipoAula === tipo ? s.tipoAulaBtnActive : ''}`}
                      onClick={() => setField('tipo_aula', tipo)}
                    >
                      {tipo === 'individual' ? 'Aula individual (50 min)' : 'Aula dupla (1h 40 min)'}
                    </button>
                  ))}
                </div>
                <p className={s.tipoAulaLabel}>{aulaCfg.titulo}</p>
              </div>

              {/* Momentos Iniciais */}
              <div className={s.seqSection}>
                <div className={s.seqSectionHeader}>
                  <span className={s.seqDot} />
                  <span className={s.seqSectionLabel}>{aulaCfg.inicio}</span>
                  <span className={s.seqCount}>{momentoIds.length}/3</span>
                </div>
                <div className={s.seqSectionBody}>
                  <div className={s.tecnicaGrid}>
                    {MOMENTOS_INICIAIS.map((m, idx) => (
                      <TecnicaBadge
                        key={m.id}
                        item={m}
                        index={idx}
                        selected={momentoIds.includes(m.id)}
                        onSelect={id => {
                          setMomentoIds(prev => {
                            const next = prev.includes(id)
                              ? prev.filter(x => x !== id)
                              : prev.length < 3 ? [...prev, id] : prev
                            setField('momento_ids', next.join(','))
                            setField('desenvolvimento_inicial',
                              next.map(i => MOMENTOS_INICIAIS.find(x => x.id === i)?.nome ?? '').filter(Boolean).join(' / ')
                            )
                            return next
                          })
                        }}
                      />
                    ))}
                  </div>
                  {momentoIds.length > 0 && momentoIds.map(id => {
                    const item = MOMENTOS_INICIAIS.find(x => x.id === id)
                    return item ? <TecnicaDetailPanel key={id} item={item} /> : null
                  })}
                </div>
              </div>

              {/* Desenvolvimento — 3 partes */}
              <div className={s.seqSection}>
                <div className={`${s.seqSectionHeader} ${s.seqSectionHeaderAmber}`}>
                  <span className={s.seqDot} />
                  <span className={s.seqSectionLabel}>{aulaCfg.desenv}</span>
                  <span className={s.seqCount}>{desenvolvP1Ids.length + desenvolvP2Ids.length + desenvolvP3Ids.length} de 3–6</span>
                </div>
                <div className={s.seqSectionBody}>
                  {([
                    { ids: desenvolvP1Ids, setIds: setDesenvP1Ids, key: 'desenv_p1', outros: [...desenvolvP2Ids, ...desenvolvP3Ids], label: 'Parte 1' },
                    { ids: desenvolvP2Ids, setIds: setDesenvP2Ids, key: 'desenv_p2', outros: [...desenvolvP1Ids, ...desenvolvP3Ids], label: 'Parte 2' },
                    { ids: desenvolvP3Ids, setIds: setDesenvP3Ids, key: 'desenv_p3', outros: [...desenvolvP1Ids, ...desenvolvP2Ids], label: 'Parte 3' },
                  ] as const).map(({ ids, setIds, key, outros, label }) => {
                    const outrosSet = new Set(outros)
                    return (
                      <div key={key} className={s.seqPart}>
                        <div className={s.seqPartHeader}>
                          <span className={s.seqPartLabel}>{label}</span>
                          <span className={s.seqCount}>{ids.length}/2</span>
                        </div>
                        <div className={s.tecnicaGrid}>
                          {DESENVOLVIMENTO_OPTS.map((m, idx) => {
                            const usedElsewhere = outrosSet.has(m.id)
                            const atMax = !ids.includes(m.id) && ids.length >= 2
                            return (
                              <TecnicaBadge
                                key={m.id}
                                item={m}
                                index={idx}
                                selected={ids.includes(m.id)}
                                disabled={usedElsewhere || atMax}
                                disabledReason={usedElsewhere ? 'Em outra parte' : undefined}
                                onSelect={id => {
                                  if (usedElsewhere) return
                                  setIds((prev: number[]) => {
                                    const next = prev.includes(id)
                                      ? prev.filter(x => x !== id)
                                      : prev.length < 2 ? [...prev, id] : prev
                                    setField(key + '_ids', next.join(','))
                                    setField(key, next.map(i => DESENVOLVIMENTO_OPTS.find(x => x.id === i)?.nome ?? '').filter(Boolean).join(' / '))
                                    return next
                                  })
                                }}
                              />
                            )
                          })}
                        </div>
                        {ids.length > 0 && ids.map(id => {
                          const item = DESENVOLVIMENTO_OPTS.find(x => x.id === id)
                          return item ? <TecnicaDetailPanel key={id} item={item} /> : null
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Momentos Finais */}
              <div className={s.seqSection}>
                <div className={`${s.seqSectionHeader} ${s.seqSectionHeaderEmerald}`}>
                  <span className={s.seqDot} />
                  <span className={s.seqSectionLabel}>{aulaCfg.fim}</span>
                  <span className={s.seqCount}>{fechamentoIds.length}/3</span>
                </div>
                <div className={s.seqSectionBody}>
                  <div className={s.tecnicaGrid}>
                    {FECHAMENTO_OPTS.map((m, idx) => (
                      <TecnicaBadge
                        key={m.id}
                        item={m}
                        index={idx}
                        selected={fechamentoIds.includes(m.id)}
                        onSelect={id => {
                          setFechamentoIds(prev => {
                            const next = prev.includes(id)
                              ? prev.filter(x => x !== id)
                              : prev.length < 3 ? [...prev, id] : prev
                            setField('fechamento_ids', next.join(','))
                            setField('desenvolvimento_fechamento',
                              next.map(i => FECHAMENTO_OPTS.find(x => x.id === i)?.nome ?? '').filter(Boolean).join(' / ')
                            )
                            return next
                          })
                        }}
                      />
                    ))}
                  </div>
                  {fechamentoIds.length > 0 && fechamentoIds.map(id => {
                    const item = FECHAMENTO_OPTS.find(x => x.id === id)
                    return item ? <TecnicaDetailPanel key={id} item={item} /> : null
                  })}
                </div>
              </div>
            </div>

            {/* ── Seção: Recursos e Avaliação ── */}
            <div className={s.planoSection}>
              <div className={s.planoSectionHeader}>
                <div className={s.planoSectionDot} />
                <span className={s.planoSectionTitle}>Recursos e Avaliação</span>
              </div>

              {/* Pacotes prontos */}
              <div className={s.field}>
                <label className={s.fieldLabel}>
                  Início rápido
                  {desenvolvP1Ids[0] && DESENVOLVIMENTO_TO_PACOTE[desenvolvP1Ids[0]] && (
                    <span className={s.autoTag}>sugestão baseada na técnica selecionada</span>
                  )}
                </label>
                <div className={s.pacoteBtns}>
                  {PACOTES_PRONTOS.map(p => {
                    const sugerido = desenvolvP1Ids[0] ? DESENVOLVIMENTO_TO_PACOTE[desenvolvP1Ids[0]] === p.id : false
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className={`${s.pacoteBtn} ${sugerido ? s.pacoteBtnSugerido : ''}`}
                        onClick={() => {
                          setField('recursos_materiais', p.recursos.join(', '))
                          setField('avaliacao', p.avaliacao.join(', '))
                        }}
                      >
                        {p.label}{sugerido ? ' ★' : ''}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className={s.field}>
                <label className={s.fieldLabel}>Recursos e materiais</label>
                <GrupoCheckbox
                  grupos={RECURSOS_GRUPOS}
                  value={fields.recursos_materiais ?? ''}
                  onChange={v => setField('recursos_materiais', v)}
                />
              </div>

              <div className={s.field}>
                <label className={s.fieldLabel}>Avaliação</label>
                <GrupoCheckbox
                  grupos={AVALIACAO_GRUPOS}
                  value={fields.avaliacao ?? ''}
                  onChange={v => setField('avaliacao', v)}
                />
              </div>

              <div className={s.field}>
                <label className={s.fieldLabel}>Ajuste(s) por demanda</label>
                <textarea
                  className={s.fieldTextarea}
                  rows={3}
                  value={fields.ajustes_demanda ?? ''}
                  placeholder="Registre eventuais ajustes realizados por demanda da coordenação..."
                  onChange={e => setField('ajustes_demanda', e.target.value)}
                />
              </div>

              <div className={s.field}>
                <label className={s.fieldLabel}>Referências</label>
                <textarea
                  className={s.fieldTextarea}
                  rows={12}
                  value={fields.referencias ?? ''}
                  onChange={e => setField('referencias', e.target.value)}
                />
              </div>
            </div>

          </div>
        )}

      </div>
    )
  }

  function renderField(field: FieldDef) {
    const val = fields[field.key] ?? ''

    if (field.type === 'textarea') {
      return (
        <div key={field.key} className={s.field}>
          <label className={s.fieldLabel}>
            {field.label}{field.required && <span className={s.required}> *</span>}
          </label>
          <textarea
            className={s.fieldTextarea}
            value={val}
            placeholder={field.placeholder}
            rows={field.rows ?? 4}
            onChange={e => setField(field.key, e.target.value)}
          />
        </div>
      )
    }

    if (field.type === 'select' && field.options) {
      return (
        <div key={field.key} className={s.field}>
          <label className={s.fieldLabel}>
            {field.label}{field.required && <span className={s.required}> *</span>}
          </label>
          <ChipSelector
            size="md"
            value={val || null}
            onChange={v => setField(field.key, val === v ? '' : v)}
            options={field.options.map(o => ({ value: o.value, label: o.label }))}
          />
        </div>
      )
    }

    if (field.type === 'chips' && field.options) {
      const selected: string[] = (() => {
        try { return JSON.parse(val || '[]') } catch { return [] }
      })()
      return (
        <div key={field.key} className={s.field}>
          <label className={s.fieldLabel}>
            {field.label}{field.required && <span className={s.required}> *</span>}
          </label>
          <ChipSelector
            multi
            size="md"
            value={selected}
            onChange={vals => setField(field.key, JSON.stringify(vals))}
            options={field.options.map(o => ({ value: o.value, label: o.label }))}
          />
        </div>
      )
    }

    return (
      <div key={field.key} className={s.field}>
        <label className={s.fieldLabel}>
          {field.label}{field.required && <span className={s.required}> *</span>}
        </label>
        <input
          className={s.fieldInput}
          type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
          value={val}
          placeholder={field.placeholder}
          onChange={e => setField(field.key, e.target.value)}
        />
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  // ATA tem editor dedicado (4 abas, importação de planilha, 3 PDFs)
  if (docType === 'ATA') {
    return <AtaEditor doc={{ id: doc.id, title: doc.title, content: doc.content as Record<string, unknown> }} />
  }

  return (
    <div className={s.layout}>

      {/* ── Scrollable form area ── */}
      <div className={s.formArea}>

        {doc.status === 'FINAL' && (
          <div className={s.finalBanner}>
            <div className={s.finalBannerLeft}>
              <CheckCircle size={15} />
              <span>Documento finalizado — gere o PDF para exportar</span>
            </div>
          </div>
        )}

        <div className={s.card}>

          <div className={s.docHeader}>
            <div className={s.docHeaderTop}>
              <Badge
                tone="neutral"
                size="md"
                style={{
                  '--b-fg':     meta?.color ?? '#6b7280',
                  '--b-bg':     (meta?.color ?? '#6b7280') + '14',
                  '--b-border': (meta?.color ?? '#6b7280') + '38',
                  '--b-dot':    meta?.color ?? '#6b7280',
                } as React.CSSProperties}
              >
                {meta?.label ?? doc.type}
              </Badge>
              <Badge
                tone={doc.status === 'FINAL' ? 'success' : 'amber'}
                size="sm"
                icon={doc.status === 'FINAL' ? <CheckCircle size={10} /> : <Clock size={10} />}
              >
                {doc.status === 'FINAL' ? 'finalizado' : 'rascunho'}
              </Badge>
            </div>
            <input
              className={s.titleInput}
              value={title}
              placeholder="Título do documento"
              onChange={e => {
                setTitle(e.target.value)
                if (saveTimer.current) clearTimeout(saveTimer.current)
                saveTimer.current = setTimeout(() => autoSave(e.target.value, buildContent(fields)), 1500)
              }}
            />
          </div>

          {error && <p className={s.errMsg}>{error}</p>}

          {isPeiType(docType) && <PeiEditor fields={fields} setField={setField} isAdmin={isAdmin} />}

          {(docType === 'GUIA_APRENDIZAGEM' || docType === 'OE_GUIA_APRENDIZAGEM') && <GuiaEditor fields={fields} setField={setField} isAdmin={isAdmin} />}

          {docType === 'PDI' && <PdiEditor fields={fields} setField={setField} />}

          {docType === 'PROJETO' && <ProjetoEditor fields={fields} setField={setField} />}

          {docType === 'PLANO_ELETIVA' && <EletivaEditor fields={fields} setField={setField} />}

          {docType === 'PLANO_EMA' && <EmaEditor fields={fields} setField={setField} />}

          {docType === 'CARTA_NAUTICA' && <CartaNauticaEditor fields={fields} setField={setField} />}

          {(docType === 'PLANO_AULA' || docType === 'OE_PLANO_AULA') && renderPlanoAulaWizard()}

          {isCurriculumType(docType) && docType !== 'PLANO_AULA' && docType !== 'GUIA_APRENDIZAGEM' && docType !== 'PLANO_ELETIVA' && docType !== 'PLANO_EMA' && renderCurriculumCascade()}

          {docType !== 'PLANO_AULA' && docType !== 'OE_PLANO_AULA' && !isPeiType(docType) && docType !== 'GUIA_APRENDIZAGEM' && docType !== 'OE_GUIA_APRENDIZAGEM' && docType !== 'PDI' && docType !== 'PROJETO' && docType !== 'PLANO_ELETIVA' && docType !== 'PLANO_EMA' && docType !== 'CARTA_NAUTICA' && (
            <div className={s.fields}>
              {meta?.fields
                .filter(f => {
                  if (isCurriculumType(docType)) {
                    const skipKeys = ['turmas','disciplina','bimestre','habilidades','objeto_conhecimento','conteudos']
                    if (skipKeys.includes(f.key)) return false
                  }
                  if (isPeiType(docType)) {
                    const skipKeys = ['aluno','ra','turma']
                    if (skipKeys.includes(f.key)) return false
                  }
                  return true
                })
                .map(f => renderField(f))
              }
            </div>
          )}

        </div>

      </div>

      {/* ── Sticky bottom action bar ── */}
      <div className={s.bottomBar}>
        <div className={s.bottomBarLeft}>
          {error ? (
            <p className={s.saveError}><Clock size={12} /> {error}</p>
          ) : saving ? (
            <p className={s.savingMsg}><Clock size={11} /> salvando…</p>
          ) : (
            <p className={`${s.savedMsg} ${saved ? s.savedMsgVisible : ''}`}>
              <CheckCircle size={11} /> salvo
            </p>
          )}
        </div>
        <div className={s.bottomBarRight}>
          {confirmDelete ? (
            <div className={s.deleteConfirm}>
              <p className={s.deleteConfirmMsg}>apagar permanentemente?</p>
              <button className={`${s.actionBtn} ${s.cancelBtn}`} onClick={() => setConfirmDelete(false)}>não</button>
              <button className={`${s.actionBtn} ${s.delBtnFull}`} onClick={deletDoc}>sim, apagar</button>
            </div>
          ) : (
            <button className={`${s.actionBtn} ${s.delBtn}`} onClick={() => setConfirmDelete(true)}>
              <Trash2 size={13} /> apagar
            </button>
          )}
          <button className={`${s.actionBtn} ${s.savBtn}`} onClick={save} disabled={saving}>
            <Save size={13} /> {saving ? 'salvando…' : 'salvar'}
          </button>
          <button className={`${s.actionBtn} ${s.pdfBtn}`} onClick={generatePdf} disabled={pdfing}>
            <FileDown size={13} /> {pdfing ? 'gerando…' : 'baixar PDF'}
          </button>
          {docType === 'PROJETO' && (
            <button className={`${s.actionBtn} ${s.pdfBtn}`} onClick={generateDocx} disabled={docxing} title="Word ABNT do Projeto de Pesquisa">
              <FileDown size={13} /> {docxing ? 'gerando…' : 'baixar Word'}
            </button>
          )}
        </div>
      </div>

    </div>
  )
}
