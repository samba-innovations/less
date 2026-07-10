/**
 * Renderer "default" v2 — usado pra documentos baseados em formulário, com ou sem
 * contexto curricular (turma/disciplina/bimestre/aula). Cobre:
 *
 *   DECLARACAO, COMUNICADO, ATESTADO         (sem currículo)
 *   PROJETO, PLANO_ELETIVA, PLANO_EMA        (com contexto curricular leve)
 *   CARTA_NAUTICA                            (com contexto curricular leve)
 *
 * Os tipos com layout muito específico (PLANO_AULA, GUIA_APRENDIZAGEM, PEI, PDI)
 * têm renderers próprios e ainda usam o pipeline legado em lib/pdf.ts.
 */

import PDFDocument from 'pdfkit'
import { DOC_TYPES, type DocType, type FieldDef } from '../doc-types'
import { fullHeader, miniHeader, paginate, type DocHeaderInfo } from './layout'
import { docTitle, sectionTitle, kv, paragraph, signatureLine, divider, spacer } from './primitives'
import { MARGIN_LEFT, MARGIN_RIGHT, PDF_MARGIN_TOP, PDF_MARGIN_BOTTOM } from './theme'

export type GenericPdfInput = {
  type:       DocType
  title:      string
  content:    Record<string, string>
  schoolName: string
  authorName: string
  createdAt:  Date
}

const SKIP_KEYS = new Set([
  '_turma_id','_disciplina_id','_bimestre','_aula_id','_ciclo','_serie','_aulas_nome',
  '_aprendizagens','_instrumentos','_pei_student_id','_school_slug',
  '_turma_nome','_disciplina_nome','_titulo_aula','_aula_num',
  'habilidade_codigo','habilidade_texto','unidade_tematica',
  'objeto_conhecimento','conteudo_aula','objetivos_aula',
])

const CURRICULUM_TYPES = new Set<DocType>([
  'PROJETO', 'PLANO_ELETIVA', 'PLANO_EMA', 'CARTA_NAUTICA',
])

function formatChips(field: FieldDef, raw: string | undefined): string {
  if (!raw?.trim()) return ''
  let values: string[] = []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) values = parsed.map(String)
  } catch {
    values = raw.split(',').map(s => s.trim()).filter(Boolean)
  }
  const labels = values.map(v => field.options?.find(o => o.value === v)?.label ?? v)
  return labels.join(' · ')
}

function formatValue(field: FieldDef, raw: string | undefined): string {
  if (!raw?.trim()) return ''
  if (field.type === 'chips')  return formatChips(field, raw)
  if (field.type === 'select') return field.options?.find(o => o.value === raw)?.label ?? raw
  if (field.type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split('-')
    return `${d}/${m}/${y}`
  }
  return raw
}

function renderCurriculumContext(doc: InstanceType<typeof PDFDocument>, c: Record<string, string>) {
  const items: Array<[string, string]> = []
  if (c._turma_nome)      items.push(['Turma',      c._turma_nome])
  if (c._disciplina_nome) items.push(['Disciplina', c._disciplina_nome])
  if (c._serie && c._ciclo) {
    const cicloLbl = c._ciclo === 'medio' ? 'Ensino Médio' : 'Ensino Fundamental'
    items.push(['Nível', `${cicloLbl} · ${c._serie}ª série`])
  }
  if (c._bimestre)        items.push(['Bimestre',   `${c._bimestre}º Bimestre`])
  if (c._titulo_aula)     items.push(['Aula',       c._titulo_aula])
  if (c.unidade_tematica)   items.push(['Unidade Temática',      c.unidade_tematica])
  if (c.habilidade_codigo)  items.push(['Habilidade(s)',         c.habilidade_codigo])
  if (c.objeto_conhecimento)items.push(['Objeto de Conhecimento', c.objeto_conhecimento])

  if (items.length === 0) return

  sectionTitle(doc, 'Contexto Curricular')
  for (const [k, v] of items) kv(doc, k, v, { inline: true })
  spacer(doc, 'md')

  if (c.conteudo_aula?.trim()) {
    sectionTitle(doc, 'Conteúdos da Aula')
    paragraph(doc, c.conteudo_aula, { abnt: true })
  }
  if (c.objetivos_aula?.trim()) {
    sectionTitle(doc, 'Objetivos da Aula')
    paragraph(doc, c.objetivos_aula, { abnt: true })
  }
}

export function generateGenericPdf(input: GenericPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top:    PDF_MARGIN_TOP,
        bottom: PDF_MARGIN_BOTTOM,
        left:   MARGIN_LEFT,
        right:  MARGIN_RIGHT,
      },
      autoFirstPage: true,
      bufferPages: true,
    })
    const chunks: Buffer[] = []

    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end',  () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const info: DocHeaderInfo = {
      type:       input.type,
      title:      input.title,
      schoolName: input.schoolName,
      authorName: input.authorName,
      createdAt:  input.createdAt,
    }

    fullHeader(doc, info)
    doc.on('pageAdded', () => miniHeader(doc, info))

    const meta = DOC_TYPES[input.type]

    // Título + subtítulo (tipo + data por extenso)
    const dateLong = input.createdAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    docTitle(doc, input.title, `${meta.label}  ·  ${dateLong}`)

    // Linha "escola — data"
    paragraph(doc, `${input.schoolName} — ${dateLong}`, { small: true })
    divider(doc)

    // Contexto curricular (se aplicável)
    if (CURRICULUM_TYPES.has(input.type)) {
      renderCurriculumContext(doc, input.content)
    }

    // Identificação (text, date, number, select)
    const infoFields = meta.fields.filter(f =>
      !SKIP_KEYS.has(f.key) && (f.type === 'text' || f.type === 'date' || f.type === 'number' || f.type === 'select')
    )
    const filledInfo = infoFields.filter(f => input.content[f.key]?.trim())
    if (filledInfo.length > 0) {
      sectionTitle(doc, 'Identificação')
      for (const f of filledInfo) {
        kv(doc, f.label, formatValue(f, input.content[f.key]), { inline: true })
      }
      spacer(doc, 'md')
    }

    // Seleções (chips)
    const chipFields = meta.fields.filter(f => f.type === 'chips' && !SKIP_KEYS.has(f.key))
    const filledChips = chipFields.filter(f => input.content[f.key]?.trim())
    if (filledChips.length > 0) {
      sectionTitle(doc, 'Seleções')
      for (const f of filledChips) {
        kv(doc, f.label, formatValue(f, input.content[f.key]), { inline: true })
      }
      spacer(doc, 'md')
    }

    // Campos descritivos (textarea) — corpo principal
    const blockFields = meta.fields.filter(f => f.type === 'textarea' && !SKIP_KEYS.has(f.key))
    const filledBlocks = blockFields.filter(f => input.content[f.key]?.trim())
    for (const f of filledBlocks) {
      sectionTitle(doc, f.label)
      paragraph(doc, input.content[f.key], { abnt: true })
    }

    // Assinatura
    signatureLine(doc, input.authorName)

    paginate(doc, info)
    doc.end()
  })
}
