/**
 * Renderer pra GUIA_APRENDIZAGEM e OE_GUIA_APRENDIZAGEM.
 *
 * Contexto curricular (turma/disciplina/bimestre), aprendizagens essenciais,
 * aulas selecionadas e os campos do guia (tema, competências, habilidades,
 * conteúdos, estratégias, recursos, avaliação, composição de média, referências).
 */

import PDFDocument from 'pdfkit'
import { DOC_TYPES, type DocType, type FieldDef } from '../doc-types'
import { fullHeader, miniHeader, paginate, type DocHeaderInfo } from './layout'
import {
  docTitle, sectionTitle, kv, paragraph, signatureLine,
  divider, spacer, lightTable, bulletList,
} from './primitives'
import { MARGIN_LEFT, MARGIN_RIGHT, PDF_MARGIN_TOP, PDF_MARGIN_BOTTOM } from './theme'
import type { AprendizagemEssencial, AulaSelecionada } from './render-plano-aula'

export type GuiaPdfInput = {
  type:       DocType
  title:      string
  content:    Record<string, string>
  schoolName: string
  authorName: string
  createdAt:  Date
  aprendizagensEssenciais?: AprendizagemEssencial[]
  aulasSelecionadas?:       AulaSelecionada[]
}

const BIMESTRE_DATAS: Record<number, string> = {
  1: '02/02 a 22/04',
  2: '23/04 a 06/07',
  3: '24/07 a 02/10',
  4: '05/10 a 18/12',
}

function formatChips(field: FieldDef, raw: string | undefined): string {
  if (!raw?.trim()) return ''
  let values: string[] = []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) values = parsed.map(String)
  } catch {
    values = raw.split(',').map(s => s.trim()).filter(Boolean)
  }
  return values.map(v => field.options?.find(o => o.value === v)?.label ?? v).join(' · ')
}

function parseJsonArray(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v.map(String) : [] } catch { return [] }
}

export function generateGuiaPdf(input: GuiaPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: PDF_MARGIN_TOP, bottom: PDF_MARGIN_BOTTOM, left: MARGIN_LEFT, right: MARGIN_RIGHT },
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
    const c    = input.content
    const dateLong = input.createdAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

    docTitle(doc, input.title, `${meta.label}  ·  ${dateLong}`)
    paragraph(doc, `${input.schoolName} — ${dateLong}`, { small: true })
    divider(doc)

    // ── Identificação ────────────────────────────────────────────────────────
    const bimNum = c._bimestre ? Number(c._bimestre) : 0
    const bimLabel = bimNum && BIMESTRE_DATAS[bimNum]
      ? `${bimNum}º Bimestre — ${BIMESTRE_DATAS[bimNum]}`
      : (c._bimestre ? `${c._bimestre}º Bimestre` : '')

    sectionTitle(doc, 'Identificação')
    if (c._turma_nome)      kv(doc, 'Turma',      c._turma_nome,      { inline: true })
    if (c._disciplina_nome) kv(doc, 'Disciplina', c._disciplina_nome, { inline: true })
    if (bimLabel)           kv(doc, 'Bimestre',   bimLabel,           { inline: true })
    if (c.ano_letivo)       kv(doc, 'Ano Letivo', c.ano_letivo,       { inline: true })
    if (c.data_inicio)      kv(doc, 'Início',     c.data_inicio,      { inline: true })
    if (c.tema)             kv(doc, 'Tema',       c.tema,             { inline: true })
    spacer(doc, 'md')

    // ── Aprendizagens Essenciais ────────────────────────────────────────────
    if (input.aprendizagensEssenciais && input.aprendizagensEssenciais.length > 0) {
      sectionTitle(doc, 'Aprendizagens Essenciais')
      lightTable(
        doc,
        ['Código', 'Descrição'],
        input.aprendizagensEssenciais.map(a => [a.codigo, a.descricao]),
        [1, 5],
      )
    }

    // ── Aulas Selecionadas (se houver) ──────────────────────────────────────
    if (input.aulasSelecionadas && input.aulasSelecionadas.length > 0) {
      sectionTitle(doc, 'Aulas do Bimestre')
      lightTable(
        doc,
        ['Aula', 'Título', 'Conteúdo'],
        input.aulasSelecionadas.map(a => [String(a.aulaNum), a.titulo ?? '', a.conteudo ?? '—']),
        [0.8, 2.5, 4],
      )
    }

    // ── Competências e habilidades (campos descritivos) ────────────────────
    if (c.competencias?.trim()) {
      sectionTitle(doc, 'Competências Gerais (BNCC)')
      paragraph(doc, c.competencias, { abnt: true })
    }
    if (c.habilidades?.trim()) {
      sectionTitle(doc, 'Habilidades Específicas')
      paragraph(doc, c.habilidades, { abnt: true })
    }
    if (c.conteudos?.trim()) {
      sectionTitle(doc, 'Conteúdos Programáticos')
      paragraph(doc, c.conteudos, { abnt: true })
    }

    // ── Chips (estratégias, recursos, avaliação) ────────────────────────────
    const chipFields = meta.fields.filter(f => f.type === 'chips')
    const filledChips = chipFields.filter(f => c[f.key]?.trim())
    if (filledChips.length > 0) {
      sectionTitle(doc, 'Estratégias e Recursos')
      for (const f of filledChips) {
        kv(doc, f.label, formatChips(f, c[f.key]), { inline: true })
      }
      spacer(doc, 'md')
    }

    // ── Instrumentos Avaliativos (parsed JSON list) ─────────────────────────
    const instrumentos = parseJsonArray(c._instrumentos)
    if (instrumentos.length > 0) {
      sectionTitle(doc, 'Instrumentos Avaliativos')
      bulletList(doc, instrumentos)
    }

    // ── Composição de média ─────────────────────────────────────────────────
    if (c.composicao_media?.trim()) {
      sectionTitle(doc, 'Composição de Média')
      paragraph(doc, c.composicao_media, { abnt: true })
    }

    // ── Referências ─────────────────────────────────────────────────────────
    if (c.referencias?.trim()) {
      sectionTitle(doc, 'Referências')
      paragraph(doc, c.referencias, { abnt: true, small: true })
    }

    signatureLine(doc, input.authorName)
    paginate(doc, info)
    doc.end()
  })
}
