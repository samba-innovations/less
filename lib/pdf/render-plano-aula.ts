/**
 * Renderer pra PLANO_AULA e OE_PLANO_AULA.
 *
 * Inclui contexto curricular (turma/disciplina/bimestre), aulas selecionadas,
 * objetivos + aprendizagens essenciais e a sequência da aula com momentos
 * (iniciais / desenvolvimento partes 1-3 / fechamento).
 */

import PDFDocument from 'pdfkit'
import { DOC_TYPES, type DocType } from '../doc-types'
import { fullHeader, miniHeader, paginate, type DocHeaderInfo } from './layout'
import {
  docTitle, sectionTitle, subSectionTitle, kv, paragraph,
  signatureLine, divider, spacer, lightTable, bulletList,
} from './primitives'
import {
  CONTENT_W, CONTENT_X, COLORS, FONT, SIZE, SPACE, BODY_BOTTOM_Y,
  MARGIN_LEFT, MARGIN_RIGHT, PDF_MARGIN_TOP, PDF_MARGIN_BOTTOM,
} from './theme'

type PDFDoc = InstanceType<typeof PDFDocument>

export type AprendizagemEssencial = { codigo: string; descricao: string }
export type AulaSelecionada = {
  aulaNum: number; titulo: string
  conteudo: string | null; objetivos: string | null
}

export type PlanoAulaInput = {
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

type TipoAula = 'individual' | 'dupla'
const TIPO_AULA_CFG: Record<TipoAula, { titulo: string; inicio: string; desenv: string; fim: string }> = {
  individual: { titulo: 'Aula de 50 minutos',          inicio: '0–10 min',  desenv: '10–40 min', fim: '40–50 min'  },
  dupla:      { titulo: 'Aula de 1 hora e 40 minutos', inicio: '0–15 min',  desenv: '15–85 min', fim: '85–100 min' },
}

// ── Renderiza badges com pipes: "01 Algo / 02 Outra" → bullet list ──────────
function badgeListBlock(doc: PDFDoc, value: string) {
  if (!value?.trim()) return
  const items = value.split(/\s*\/\s*/).filter(Boolean)
  bulletList(doc, items)
}

function ensureSpace(doc: PDFDoc, needed: number) {
  if (doc.y + needed > BODY_BOTTOM_Y) doc.addPage()
}

// ── Bloco "tempo - título" (ex: "0–10 min · Momentos Iniciais") ──────────────
function timeBlock(doc: PDFDoc, time: string, label: string) {
  ensureSpace(doc, 24)
  doc.y += SPACE.sm
  doc.font(FONT.bold).fontSize(SIZE.tiny).fillColor(COLORS.fgMuted)
    .text(time.toUpperCase(), CONTENT_X, doc.y, { width: 80, lineBreak: false, characterSpacing: 0.5 })
  doc.font(FONT.bold).fontSize(SIZE.small).fillColor(COLORS.fg)
    .text(label, CONTENT_X + 85, doc.y, { width: CONTENT_W - 85, lineBreak: false })
  doc.y += 16
}

// ── Bloco com 3 partes lado a lado (Desenvolvimento p1/p2/p3) ───────────────
function partesDesenvBlock(doc: PDFDoc, p1: string, p2: string, p3: string) {
  const partes = [
    { label: 'Parte 1', value: p1 },
    { label: 'Parte 2', value: p2 },
    { label: 'Parte 3', value: p3 },
  ].filter(p => p.value?.trim())

  if (partes.length === 0) return

  ensureSpace(doc, 60)
  const colW = (CONTENT_W - SPACE.sm * (partes.length - 1)) / partes.length
  const startY = doc.y

  for (let i = 0; i < partes.length; i++) {
    const x = CONTENT_X + i * (colW + SPACE.sm)
    doc.font(FONT.bold).fontSize(SIZE.tiny).fillColor(COLORS.fgMuted)
      .text(partes[i].label.toUpperCase(), x, startY, { width: colW, characterSpacing: 0.4 })

    const items = partes[i].value.split(/\s*\/\s*/).filter(Boolean)
    let y = startY + 14
    for (const item of items) {
      doc.font(FONT.regular).fontSize(SIZE.small).fillColor(COLORS.fg)
        .text(`• ${item}`, x, y, { width: colW, lineGap: 1 })
      y = doc.y + 3
    }
  }
  doc.y = startY + 14
  // avança até o fim da coluna mais alta
  doc.y = Math.max(doc.y, startY + 60)
  doc.y += SPACE.md
}

export function generatePlanoAulaPdf(input: PlanoAulaInput): Promise<Buffer> {
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
    const bimNum = c.bimestre ? Number(c.bimestre) : 0
    const bimLabel = bimNum && BIMESTRE_DATAS[bimNum]
      ? `${bimNum}º Bimestre — ${BIMESTRE_DATAS[bimNum]}`
      : (c.bimestre ? `${c.bimestre}º Bimestre` : '—')

    sectionTitle(doc, 'Identificação')
    kv(doc, 'Turma',      c.turmas || c.turma || '—', { inline: true })
    kv(doc, 'Disciplina', c.disciplina || '—',        { inline: true })
    kv(doc, 'Bimestre',   bimLabel,                   { inline: true })
    kv(doc, 'Data',       c.data || dateLong,         { inline: true })
    if (c.tema) kv(doc, 'Tema / Título da Aula', c.tema, { inline: true })
    spacer(doc, 'md')

    // ── Aulas Selecionadas ───────────────────────────────────────────────────
    if (input.aulasSelecionadas && input.aulasSelecionadas.length > 0) {
      sectionTitle(doc, 'Aulas Selecionadas')
      const headers = ['Aula', 'Título', 'Conteúdo', 'Objetivos']
      const rows = input.aulasSelecionadas.map(a => [
        String(a.aulaNum),
        a.titulo ?? '',
        a.conteudo ?? '—',
        a.objetivos ?? '—',
      ])
      lightTable(doc, headers, rows, [0.8, 2.5, 3, 3])
    }

    // ── Objetivos + Habilidades ──────────────────────────────────────────────
    sectionTitle(doc, 'Objetivos e Habilidades')
    if (c.objetivo_geral) {
      subSectionTitle(doc, 'Objetivo Geral')
      paragraph(doc, c.objetivo_geral, { abnt: true })
    }
    if (c.habilidades?.trim()) {
      subSectionTitle(doc, 'Habilidades')
      paragraph(doc, c.habilidades, { abnt: true })
    }
    if (input.aprendizagensEssenciais && input.aprendizagensEssenciais.length > 0) {
      subSectionTitle(doc, 'Aprendizagens Essenciais')
      lightTable(
        doc,
        ['Código', 'Descrição'],
        input.aprendizagensEssenciais.map(a => [a.codigo, a.descricao]),
        [1, 5],
      )
    }
    if (c.objeto_conhecimento) {
      subSectionTitle(doc, 'Objeto de Conhecimento')
      paragraph(doc, c.objeto_conhecimento, { abnt: true })
    }

    // ── Sequência da Aula ────────────────────────────────────────────────────
    const hasSeq = c.desenvolvimento_inicial || c.desenv_p1 || c.desenv_p2 || c.desenv_p3 || c.desenvolvimento_fechamento
    if (hasSeq) {
      sectionTitle(doc, 'Sequência da Aula')
      const tipo = ((c.tipo_aula ?? 'individual') as TipoAula)
      const cfg  = TIPO_AULA_CFG[tipo] ?? TIPO_AULA_CFG.individual
      doc.font(FONT.italic).fontSize(SIZE.small).fillColor(COLORS.fgMuted)
        .text(cfg.titulo, CONTENT_X, doc.y, { width: CONTENT_W })
      doc.y += SPACE.sm

      if (c.desenvolvimento_inicial) {
        timeBlock(doc, cfg.inicio, 'Momentos Iniciais')
        badgeListBlock(doc, c.desenvolvimento_inicial)
      }
      if (c.desenv_p1 || c.desenv_p2 || c.desenv_p3) {
        timeBlock(doc, cfg.desenv, 'Desenvolvimento')
        partesDesenvBlock(doc, c.desenv_p1 ?? '', c.desenv_p2 ?? '', c.desenv_p3 ?? '')
      }
      if (c.desenvolvimento_fechamento) {
        timeBlock(doc, cfg.fim, 'Momentos Finais')
        badgeListBlock(doc, c.desenvolvimento_fechamento)
      }
    }

    // ── Conteúdo ─────────────────────────────────────────────────────────────
    if (c.conteudo?.trim()) {
      sectionTitle(doc, 'Conteúdo')
      paragraph(doc, c.conteudo, { abnt: true })
    }

    // ── Recursos e Avaliação ─────────────────────────────────────────────────
    sectionTitle(doc, 'Recursos e Avaliação')
    if (c.recursos_materiais) {
      subSectionTitle(doc, 'Recursos e Materiais')
      bulletList(doc, c.recursos_materiais.split(/\s*[·,]\s*/).filter(Boolean))
    }
    if (c.avaliacao) {
      subSectionTitle(doc, 'Avaliação')
      bulletList(doc, c.avaliacao.split(/\s*[·,]\s*/).filter(Boolean))
    }
    if (c.ajustes_demanda) {
      subSectionTitle(doc, 'Ajuste(s) por Demanda')
      paragraph(doc, c.ajustes_demanda, { abnt: true })
    }
    if (c.referencias) {
      subSectionTitle(doc, 'Referências')
      paragraph(doc, c.referencias, { abnt: true, small: true })
    }

    signatureLine(doc, input.authorName)
    paginate(doc, info)
    doc.end()
  })
}
