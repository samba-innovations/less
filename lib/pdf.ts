import PDFDocument from 'pdfkit'
import { DOC_TYPES, type DocType, type FieldDef } from './doc-types'
import { DIMENSOES_PDI } from './pdi-data'
import { generateGenericPdf } from './pdf/render-generic'
import { generatePlanoAulaPdf } from './pdf/render-plano-aula'
import { generateGuiaPdf } from './pdf/render-guia'

// Tipos migrados para o novo design system (lib/pdf/*). Os demais ainda usam
// o renderer legado abaixo — migração será incremental.
const NEW_GENERIC_TYPES = new Set<DocType>([
  'DECLARACAO', 'COMUNICADO', 'ATESTADO',
  'PROJETO', 'PLANO_ELETIVA', 'PLANO_EMA', 'CARTA_NAUTICA',
])
const NEW_PLANO_AULA_TYPES = new Set<DocType>(['PLANO_AULA', 'OE_PLANO_AULA'])
const NEW_GUIA_TYPES       = new Set<DocType>(['GUIA_APRENDIZAGEM', 'OE_GUIA_APRENDIZAGEM'])

const PAGE_W   = 595.28
const PAGE_H   = 841.89
const MARGIN   = 50
const BOTTOM_M = 60
const CONTENT_W = PAGE_W - MARGIN * 2

const BRAND   = '#1a0f00'
const YELLOW  = '#fce375'
const DARK    = '#1a1a2e'
const GRAY    = '#4b5563'
const LIGHT   = '#f3f4f6'
const BORDER  = '#d1d5db'
const WHITE   = '#ffffff'
const EMERALD = '#065f46'

export type AprendizagemEssencial = { codigo: string; descricao: string }
export type AulaSelecionada = { aulaNum: number; titulo: string; conteudo: string | null; objetivos: string | null }

type DocContent = Record<string, string>

const BIMESTRE_DATAS: Record<number, string> = {
  1: '02/02 a 22/04',
  2: '23/04 a 06/07',
  3: '24/07 a 02/10',
  4: '05/10 a 18/12',
}

type TipoAula = 'individual' | 'dupla'
const TIPO_AULA_CFG: Record<TipoAula, { titulo: string; inicio: string; desenv: string; fim: string }> = {
  individual: { titulo: 'Aula de 50 minutos',          inicio: '0–10 min',   desenv: '10–40 min',  fim: '40–50 min'  },
  dupla:      { titulo: 'Aula de 1 hora e 40 minutos', inicio: '0–15 min',   desenv: '15–85 min',  fim: '85–100 min' },
}

export type PdfInput = {
  type:       DocType
  title:      string
  content:    DocContent
  schoolName: string
  authorName: string
  createdAt:  Date
  aprendizagensEssenciais?: AprendizagemEssencial[]
  aulasSelecionadas?:       AulaSelecionada[]
}

function ensureSpace(doc: InstanceType<typeof PDFDocument>, needed: number) {
  if (doc.y + needed > PAGE_H - BOTTOM_M) doc.addPage()
}

function header(doc: InstanceType<typeof PDFDocument>, input: PdfInput) {
  const typeMeta = DOC_TYPES[input.type]

  doc.rect(0, 0, PAGE_W, 56).fill(YELLOW)

  doc.fontSize(18).font('Helvetica-Bold').fillColor(BRAND)
    .text('less', MARGIN, 18, { continued: true })
  doc.fontSize(9).font('Helvetica').fillColor('#5a3d00')
    .text(` · ${typeMeta.label}`, { continued: false })

  doc.fontSize(8).font('Helvetica').fillColor(BRAND)
    .text(input.schoolName, MARGIN, 38, { width: CONTENT_W, align: 'right' })

  doc.rect(0, 56, PAGE_W, 22).fill(DARK)
  doc.fontSize(7.5).font('Helvetica').fillColor(WHITE)
    .text(input.title, MARGIN, 63, { width: CONTENT_W * 0.7 })
  doc.fontSize(7.5).fillColor('#9ca3af')
    .text(input.authorName, MARGIN, 63, { width: CONTENT_W, align: 'right' })

  doc.y = 90
}

function miniHeader(doc: InstanceType<typeof PDFDocument>, input: PdfInput) {
  doc.rect(0, 0, PAGE_W, 22).fill(YELLOW)
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor(BRAND)
    .text('less', MARGIN, 6, { continued: true })
  doc.fontSize(7.5).font('Helvetica').fillColor('#5a3d00')
    .text(` · ${input.title}`)
  doc.y = 32
}

function footer(doc: InstanceType<typeof PDFDocument>, input: PdfInput) {
  const y = PAGE_H - 32
  doc.fontSize(6.5).font('Helvetica').fillColor('#9ca3af')
    .text(
      `Gerado em ${input.createdAt.toLocaleDateString('pt-BR')} · less · ${input.schoolName}`,
      MARGIN, y, { width: CONTENT_W, align: 'center' }
    )
}

function sectionTitle(doc: InstanceType<typeof PDFDocument>, text: string) {
  ensureSpace(doc, 24)
  doc.rect(MARGIN, doc.y, CONTENT_W, 18).fill(DARK)
  doc.fontSize(7).font('Helvetica-Bold').fillColor(WHITE)
    .text(text.toUpperCase(), MARGIN + 8, doc.y - 13, { characterSpacing: 0.8 })
  doc.y += 6
}

function infoRow(
  doc: InstanceType<typeof PDFDocument>,
  label: string,
  value: string,
  last = false
) {
  const rowH = 18
  ensureSpace(doc, rowH)
  const y = doc.y
  const labelW = 130

  doc.rect(MARGIN, y, labelW, rowH).fill(LIGHT).stroke(BORDER)
  doc.rect(MARGIN + labelW, y, CONTENT_W - labelW, rowH).fill(WHITE).stroke(BORDER)

  doc.fontSize(7).font('Helvetica-Bold').fillColor(GRAY)
    .text(label, MARGIN + 6, y + 5, { width: labelW - 10 })
  doc.fontSize(7.5).font('Helvetica').fillColor(DARK)
    .text(value || '—', MARGIN + labelW + 6, y + 5, { width: CONTENT_W - labelW - 10 })

  doc.y = y + rowH + (last ? 0 : 0)
}

// 2-column info row used in PLANO_AULA identification
type Cell2 = { label: string; value: string; span?: number }

function infoRow2col(doc: InstanceType<typeof PDFDocument>, cells: Cell2[]) {
  const colW  = CONTENT_W / 2
  const pad   = 6
  const labelH = 10
  const minH  = 24

  const heights = cells.map(cell => {
    if (!cell.value?.trim()) return minH
    const cellW = (cell.span === 2 ? CONTENT_W : colW) - pad * 2
    doc.font('Helvetica').fontSize(9)
    const h = doc.heightOfString(cell.value, { width: cellW }) + labelH + pad * 2
    return Math.max(h, minH)
  })
  const rowH   = Math.max(...heights)
  ensureSpace(doc, rowH)
  const startY = doc.y

  let x = MARGIN
  cells.forEach(cell => {
    const w = cell.span === 2 ? CONTENT_W : colW

    doc.rect(x, startY, w, rowH).fill(LIGHT).strokeColor(BORDER).lineWidth(0.4).stroke()

    doc.font('Helvetica-Bold').fontSize(7).fillColor(GRAY)
      .text(cell.label, x + pad, startY + pad, { width: w - pad * 2, lineBreak: false })

    doc.font('Helvetica').fontSize(8.5).fillColor(DARK)
      .text(cell.value?.trim() || '—', x + pad, startY + pad + labelH, { width: w - pad * 2, lineGap: 1.5 })

    x += w
  })

  doc.y = startY + rowH
}

function textBlock(
  doc: InstanceType<typeof PDFDocument>,
  label: string,
  text: string
) {
  if (!text?.trim()) return
  ensureSpace(doc, 36)
  const headerH = 14
  const y = doc.y

  doc.rect(MARGIN, y, CONTENT_W, headerH).fill(LIGHT).stroke(BORDER)
  doc.fontSize(6.5).font('Helvetica-Bold').fillColor(GRAY)
    .text(label.toUpperCase(), MARGIN + 6, y + 4, { characterSpacing: 0.5 })

  doc.y = y + headerH

  doc.fontSize(8.5)
  const textH = doc.heightOfString(text, { width: CONTENT_W - 16 }) + 12
  ensureSpace(doc, textH)

  const bodyY = doc.y
  doc.rect(MARGIN, bodyY, CONTENT_W, textH).fill(WHITE).stroke(BORDER)
  doc.fontSize(8.5).font('Helvetica').fillColor(DARK)
    .text(text, MARGIN + 8, bodyY + 6, { width: CONTENT_W - 16, lineGap: 1.5 })

  doc.y = bodyY + textH + 6
}

// ─── PLANO_AULA helpers ───────────────────────────────────────────────────────

function subLabel(doc: InstanceType<typeof PDFDocument>, text: string) {
  const pad = 6
  const y0  = doc.y
  doc.rect(MARGIN, y0, CONTENT_W, 16).fill(LIGHT)
  doc.rect(MARGIN, y0, CONTENT_W, 16).strokeColor(BORDER).lineWidth(0.3).stroke()
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(GRAY)
  doc.text(text, MARGIN + pad, y0 + 4, { lineBreak: false })
  doc.y = y0 + 16
}

function habilidadesTable(doc: InstanceType<typeof PDFDocument>, raw: string) {
  if (!raw?.trim()) return

  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
  const rows: { code: string; desc: string }[] = lines.map(line => {
    const m = line.match(/^\(([^)]+)\)\s*(.+)$/)
    if (m) return { code: m[1], desc: m[2] }
    const parts = line.split(/\s+/)
    if (parts.length === 1 || /^[A-Z]{2,4}\d/.test(parts[0])) {
      return { code: parts[0], desc: parts.slice(1).join(' ') || '' }
    }
    return { code: '', desc: line }
  })

  const codeW = 95
  const descW = CONTENT_W - codeW
  const pad   = 6

  subLabel(doc, 'Habilidades BNCC / Currículo Paulista')

  doc.font('Helvetica').fontSize(9)
  const headerH = 18
  const rowHeights = rows.map(row => {
    const descH = row.desc ? doc.heightOfString(row.desc, { width: descW - pad * 2 }) : 0
    return Math.max(descH + pad * 2, 22)
  })

  ensureSpace(doc, Math.min(headerH + rowHeights.reduce((a, b) => a + b, 0), 120))

  const y0 = doc.y
  doc.rect(MARGIN, y0, codeW, headerH).fill(DARK)
  doc.rect(MARGIN + codeW, y0, descW, headerH).fill(DARK)
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(WHITE)
  doc.text('CÓDIGO', MARGIN + pad, y0 + 5, { width: codeW - pad, lineBreak: false })
  doc.text('DESCRIÇÃO', MARGIN + codeW + pad, y0 + 5, { width: descW - pad, lineBreak: false })

  let rowY = y0 + headerH
  rows.forEach((row, i) => {
    const rowH = rowHeights[i]
    if (rowY + rowH > PAGE_H - BOTTOM_M) {
      doc.addPage()
      rowY = doc.y
      doc.rect(MARGIN, rowY, codeW, headerH).fill(DARK)
      doc.rect(MARGIN + codeW, rowY, descW, headerH).fill(DARK)
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(WHITE)
      doc.text('CÓDIGO', MARGIN + pad, rowY + 5, { width: codeW - pad, lineBreak: false })
      doc.text('DESCRIÇÃO', MARGIN + codeW + pad, rowY + 5, { width: descW - pad, lineBreak: false })
      rowY += headerH
    }
    const bg = i % 2 === 0 ? WHITE : LIGHT
    doc.rect(MARGIN, rowY, codeW, rowH).fill(bg).strokeColor(BORDER).lineWidth(0.3).stroke()
    doc.rect(MARGIN + codeW, rowY, descW, rowH).fill(bg).strokeColor(BORDER).lineWidth(0.3).stroke()
    if (row.code) {
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(DARK)
      doc.text(row.code, MARGIN + pad, rowY + pad, { width: codeW - pad * 2, lineBreak: false })
    }
    doc.font('Helvetica').fontSize(9).fillColor(DARK)
    doc.text(row.desc || '—', MARGIN + codeW + pad, rowY + pad, { width: descW - pad * 2, lineGap: 1.5 })
    rowY += rowH
  })
  doc.y = rowY + 4
}

function aesTable(doc: InstanceType<typeof PDFDocument>, aes: AprendizagemEssencial[]) {
  if (!aes || aes.length === 0) return

  const codeW = 95
  const descW = CONTENT_W - codeW
  const pad   = 6

  subLabel(doc, 'Aprendizagens Essenciais — Currículo Paulista')

  doc.font('Helvetica').fontSize(9)
  const headerH = 18
  const rowHeights = aes.map(ae => {
    const h = ae.descricao ? doc.heightOfString(ae.descricao, { width: descW - pad * 2 }) : 0
    return Math.max(h + pad * 2, 22)
  })

  ensureSpace(doc, Math.min(headerH + rowHeights.reduce((a, b) => a + b, 0), 120))

  const y0 = doc.y
  doc.rect(MARGIN, y0, codeW, headerH).fill(EMERALD)
  doc.rect(MARGIN + codeW, y0, descW, headerH).fill(EMERALD)
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(WHITE)
  doc.text('CÓDIGO', MARGIN + pad, y0 + 5, { width: codeW - pad, lineBreak: false })
  doc.text('APRENDIZAGEM ESSENCIAL', MARGIN + codeW + pad, y0 + 5, { width: descW - pad, lineBreak: false })

  let rowY = y0 + headerH
  aes.forEach((ae, i) => {
    const rowH = rowHeights[i]
    if (rowY + rowH > PAGE_H - BOTTOM_M) {
      doc.addPage()
      rowY = doc.y
      doc.rect(MARGIN, rowY, codeW, headerH).fill(EMERALD)
      doc.rect(MARGIN + codeW, rowY, descW, headerH).fill(EMERALD)
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(WHITE)
      doc.text('CÓDIGO', MARGIN + pad, rowY + 5, { width: codeW - pad, lineBreak: false })
      doc.text('APRENDIZAGEM ESSENCIAL', MARGIN + codeW + pad, rowY + 5, { width: descW - pad, lineBreak: false })
      rowY += headerH
    }
    const bg = i % 2 === 0 ? WHITE : LIGHT
    doc.rect(MARGIN, rowY, codeW, rowH).fill(bg).strokeColor(BORDER).lineWidth(0.3).stroke()
    doc.rect(MARGIN + codeW, rowY, descW, rowH).fill(bg).strokeColor(BORDER).lineWidth(0.3).stroke()
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(EMERALD)
    doc.text(ae.codigo, MARGIN + pad, rowY + pad, { width: codeW - pad * 2, lineBreak: false })
    doc.font('Helvetica').fontSize(9).fillColor(DARK)
    doc.text(ae.descricao || '—', MARGIN + codeW + pad, rowY + pad, { width: descW - pad * 2, lineGap: 1.5 })
    rowY += rowH
  })
  doc.y = rowY + 4
}

function aulasTable(doc: InstanceType<typeof PDFDocument>, aulas: AulaSelecionada[]) {
  if (!aulas || aulas.length === 0) return

  const pad       = 5
  const headerH   = 22
  const tituloW   = 155
  const conteudoW = 165
  const objetivosW = CONTENT_W - tituloW - conteudoW

  function drawHeader(y: number) {
    doc.rect(MARGIN, y, tituloW, headerH).fill(DARK)
    doc.rect(MARGIN + tituloW, y, conteudoW, headerH).fill(DARK)
    doc.rect(MARGIN + tituloW + conteudoW, y, objetivosW, headerH).fill(DARK)
    doc.font('Helvetica-Bold').fontSize(7).fillColor(WHITE)
    doc.text('TÍTULO DA AULA', MARGIN + pad, y + 7, { width: tituloW - pad, lineBreak: false })
    doc.text('CONTEÚDOS',      MARGIN + tituloW + pad, y + 7, { width: conteudoW - pad, lineBreak: false })
    doc.text('OBJETIVOS',      MARGIN + tituloW + conteudoW + pad, y + 7, { width: objetivosW - pad, lineBreak: false })
  }

  function truncate(text: string, maxChars = 300): string {
    if (!text || text.length <= maxChars) return text
    return text.substring(0, maxChars).replace(/\s\S*$/, '') + '…'
  }

  ensureSpace(doc, headerH + 32)
  let rowY = doc.y
  drawHeader(rowY)
  rowY += headerH

  aulas.forEach((aula, i) => {
    const aulaNum   = `Aula ${aula.aulaNum}`
    const aulaTitle = aula.titulo?.trim() ?? ''
    const col2      = truncate(aula.conteudo?.trim() ?? '—')
    const col3      = truncate(aula.objetivos?.trim() ?? '—')

    doc.font('Helvetica-Bold').fontSize(7.5)
    const titleH = doc.heightOfString(aulaNum, { width: tituloW - pad * 2 })
    doc.font('Helvetica').fontSize(7.5)
    const subH   = aulaTitle ? doc.heightOfString(aulaTitle, { width: tituloW - pad * 2, lineGap: 1 }) : 0
    const col2H  = doc.heightOfString(col2, { width: conteudoW - pad * 2, lineGap: 1 })
    const col3H  = doc.heightOfString(col3, { width: objetivosW - pad * 2, lineGap: 1 })
    const rowH   = Math.min(110, Math.max(titleH + subH + pad * 2, col2H + pad * 2, col3H + pad * 2, 28))

    if (rowY + rowH > PAGE_H - BOTTOM_M - 10) {
      doc.addPage()
      rowY = doc.y
      drawHeader(rowY)
      rowY += headerH
    }

    const bg = i % 2 === 0 ? WHITE : LIGHT
    doc.rect(MARGIN, rowY, tituloW, rowH).fill(bg).strokeColor(BORDER).lineWidth(0.3).stroke()
    doc.rect(MARGIN + tituloW, rowY, conteudoW, rowH).fill(bg).strokeColor(BORDER).lineWidth(0.3).stroke()
    doc.rect(MARGIN + tituloW + conteudoW, rowY, objetivosW, rowH).fill(bg).strokeColor(BORDER).lineWidth(0.3).stroke()

    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(DARK)
    doc.text(aulaNum, MARGIN + pad, rowY + pad, { width: tituloW - pad * 2, lineBreak: false })
    if (aulaTitle) {
      const afterNum = doc.y + 2
      doc.font('Helvetica').fontSize(7).fillColor(GRAY)
      doc.text(aulaTitle, MARGIN + pad, afterNum, { width: tituloW - pad * 2, lineGap: 1, ellipsis: true })
    }

    doc.font('Helvetica').fontSize(7.5).fillColor(DARK)
    doc.text(col2, MARGIN + tituloW + pad,             rowY + pad, { width: conteudoW - pad * 2, lineGap: 1 })
    doc.text(col3, MARGIN + tituloW + conteudoW + pad, rowY + pad, { width: objetivosW - pad * 2, lineGap: 1 })

    rowY += rowH
  })
  doc.y = rowY + 6
}

function bulletBlock(doc: InstanceType<typeof PDFDocument>, label: string, value: string) {
  if (!value?.trim()) return
  const items = value.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
  if (items.length === 0) return

  const pad = 6
  ensureSpace(doc, 16 + items.length * 14 + pad * 2)

  const y0 = doc.y
  doc.rect(MARGIN, y0, CONTENT_W, 16).fill(LIGHT)
  doc.rect(MARGIN, y0, CONTENT_W, 16).strokeColor(BORDER).lineWidth(0.3).stroke()
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(GRAY)
  doc.text(label, MARGIN + pad, y0 + 4, { lineBreak: false })

  const bodyY = y0 + 16
  doc.rect(MARGIN, bodyY, CONTENT_W, 1).fill(BORDER)

  let itemY = bodyY + pad
  items.forEach(item => {
    if (itemY + 14 > PAGE_H - BOTTOM_M) {
      doc.addPage()
      itemY = doc.y + pad
    }
    doc.font('Helvetica').fontSize(9).fillColor(DARK)
    doc.text('•', MARGIN + pad, itemY, { lineBreak: false })
    doc.font('Helvetica').fontSize(9).fillColor(DARK)
    doc.text(item, MARGIN + pad + 10, itemY, { width: CONTENT_W - pad * 2 - 10, lineGap: 1 })
    itemY = doc.y + 2
  })

  const endY = itemY + pad
  doc.rect(MARGIN, bodyY + 1, CONTENT_W, endY - bodyY - 1).strokeColor(BORDER).lineWidth(0.3).stroke()
  doc.y = endY + 2
}

function referencesBlock(doc: InstanceType<typeof PDFDocument>, label: string, value: string) {
  if (!value?.trim()) return
  const refs = value.split('\n').map(s => s.trim()).filter(Boolean)
  if (refs.length === 0) return

  const pad = 6
  const refW = CONTENT_W - pad * 2
  const pageBottom = PAGE_H - BOTTOM_M

  ensureSpace(doc, 50)

  const y0 = doc.y
  doc.rect(MARGIN, y0, CONTENT_W, 16).fill(LIGHT)
  doc.rect(MARGIN, y0, CONTENT_W, 16).strokeColor(BORDER).lineWidth(0.3).stroke()
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(GRAY)
  doc.text(label, MARGIN + pad, y0 + 4, { lineBreak: false })

  const firstBodyY = y0 + 16
  doc.rect(MARGIN, firstBodyY, CONTENT_W, 1).fill(BORDER)

  let pageBodyY = firstBodyY
  let curY = firstBodyY + pad

  refs.forEach((ref, idx) => {
    doc.font('Helvetica').fontSize(8.5)
    const refH = doc.heightOfString(ref, { width: refW, lineGap: 1 })

    if (curY + refH > pageBottom) {
      doc.rect(MARGIN, pageBodyY + 1, CONTENT_W, curY + pad - pageBodyY - 1)
        .strokeColor(BORDER).lineWidth(0.3).stroke()
      doc.addPage()
      pageBodyY = doc.y
      doc.rect(MARGIN, pageBodyY, CONTENT_W, 1).fill(BORDER)
      curY = pageBodyY + pad
    }

    doc.font('Helvetica').fontSize(8.5).fillColor(DARK)
    doc.text(ref, MARGIN + pad, curY, { width: refW, lineGap: 1 })
    curY = doc.y + (idx < refs.length - 1 ? 4 : 0)
  })

  const endY = curY + pad
  doc.rect(MARGIN, pageBodyY + 1, CONTENT_W, endY - pageBodyY - 1)
    .strokeColor(BORDER).lineWidth(0.3).stroke()
  doc.y = endY + 2
}

function timeSectionRow(doc: InstanceType<typeof PDFDocument>, time: string, label: string) {
  ensureSpace(doc, 22)
  const y0  = doc.y
  const pad = 6
  doc.rect(MARGIN, y0, 3, 18).fill(YELLOW)
  doc.rect(MARGIN + 3, y0, CONTENT_W - 3, 18).fill(LIGHT)
  doc.rect(MARGIN + 3, y0, CONTENT_W - 3, 18).strokeColor(BORDER).lineWidth(0.3).stroke()
  doc.font('Helvetica-Bold').fontSize(8).fillColor(DARK)
  doc.text(time, MARGIN + 3 + pad, y0 + 5, { lineBreak: false })
  doc.font('Helvetica').fillColor(GRAY)
  doc.text('  —  ' + label, { lineBreak: false })
  doc.y = y0 + 20
}

function seqBadgeList(doc: InstanceType<typeof PDFDocument>, content: string, indent = 0) {
  if (!content?.trim()) return
  const items = content.split(/[/\n]/).map((s: string) => s.trim()).filter(Boolean)
  const pad = 6 + indent
  items.forEach(item => {
    ensureSpace(doc, 16)
    const y0 = doc.y
    doc.circle(MARGIN + pad + 3, y0 + 5, 2).fill(YELLOW)
    doc.font('Helvetica').fontSize(9).fillColor(DARK)
    doc.text(item, MARGIN + pad + 10, y0, { width: CONTENT_W - pad - 12, lineGap: 1.5 })
  })
  doc.y += 3
}

function seqPartsBlock(doc: InstanceType<typeof PDFDocument>, p1?: string, p2?: string, p3?: string) {
  const parts = [p1, p2, p3]
    .map((p, i) => ({ label: `Parte ${i + 1}`, text: p?.trim() }))
    .filter(x => !!x.text)
  if (!parts.length) return
  const pad = 6
  parts.forEach(({ label, text }) => {
    ensureSpace(doc, 18)
    const y0    = doc.y
    const items = text!.split(/[/\n]/).map((s: string) => s.trim()).filter(Boolean)
    doc.font('Helvetica-Bold').fontSize(8).fillColor(DARK)
    doc.text(label + ':  ', MARGIN + pad, y0, { continued: true, lineBreak: false })
    doc.font('Helvetica').fillColor(DARK).fontSize(9)
    doc.text(items.join(' · '), { width: CONTENT_W - pad * 2 - 45, lineBreak: true })
    doc.y += 2
  })
  doc.y += 3
}

function renderPlanoDeAula(
  doc: InstanceType<typeof PDFDocument>,
  c: Record<string, string>,
  createdAt?: string,
  aes?: AprendizagemEssencial[],
  aulasSel?: AulaSelecionada[]
) {
  const tipoAula = ((c.tipo_aula ?? 'individual') as TipoAula)
  const cfg      = TIPO_AULA_CFG[tipoAula] ?? TIPO_AULA_CFG.individual

  // Compute display date
  const bimestreNum = c.bimestre ? Number(c.bimestre) : 0
  const bimestreLabel = bimestreNum && BIMESTRE_DATAS[bimestreNum]
    ? `${bimestreNum}º Bimestre — ${BIMESTRE_DATAS[bimestreNum]}`
    : (c.bimestre ? `${c.bimestre}º Bimestre` : '—')

  sectionTitle(doc, 'Identificação')
  infoRow2col(doc, [
    { label: 'Turma', value: c.turmas || c.turma || '—' },
    { label: 'Disciplina', value: c.disciplina || '—' },
  ])
  infoRow2col(doc, [
    { label: 'Bimestre', value: bimestreLabel },
    { label: 'Data', value: c.data || (createdAt ? new Date(createdAt).toLocaleDateString('pt-BR') : '—') },
  ])
  if (c.tema) infoRow2col(doc, [{ label: 'Tema / Título da Aula', value: c.tema, span: 2 }])

  if (aulasSel && aulasSel.length > 0) {
    sectionTitle(doc, 'Aulas Selecionadas')
    aulasTable(doc, aulasSel)
  }

  sectionTitle(doc, 'Objetivos e Habilidades')
  if (c.objetivo_geral) textBlock(doc, 'Objetivo Geral', c.objetivo_geral)
  if (c.habilidades?.trim()) {
    doc.moveDown(0.3)
    habilidadesTable(doc, c.habilidades)
  }
  if (aes && aes.length > 0) {
    doc.moveDown(0.3)
    aesTable(doc, aes)
  }
  if (c.objeto_conhecimento) textBlock(doc, 'Objeto de Conhecimento', c.objeto_conhecimento)

  const hasSeq = c.desenvolvimento_inicial || c.desenv_p1 || c.desenv_p2 || c.desenv_p3 || c.desenvolvimento_fechamento
  if (hasSeq) {
    sectionTitle(doc, 'Sequência da Aula')

    const tipoY = doc.y
    doc.rect(MARGIN, tipoY, CONTENT_W, 18).fill(DARK)
    doc.font('Helvetica-Bold').fontSize(9).fillColor(WHITE)
    doc.text(cfg.titulo, MARGIN + 8, tipoY + 5, { lineBreak: false })
    doc.y = tipoY + 22

    if (c.desenvolvimento_inicial) {
      timeSectionRow(doc, cfg.inicio, 'Momentos Iniciais')
      seqBadgeList(doc, c.desenvolvimento_inicial, 4)
    }

    const hasPartes = c.desenv_p1 || c.desenv_p2 || c.desenv_p3
    if (hasPartes) {
      timeSectionRow(doc, cfg.desenv, 'Desenvolvimento')
      seqPartsBlock(doc, c.desenv_p1, c.desenv_p2, c.desenv_p3)
    }

    if (c.desenvolvimento_fechamento) {
      timeSectionRow(doc, cfg.fim, 'Momentos Finais')
      seqBadgeList(doc, c.desenvolvimento_fechamento, 4)
    }
  }

  if (c.conteudo?.trim()) {
    sectionTitle(doc, 'Conteúdo')
    textBlock(doc, 'Conteúdo', c.conteudo)
  }

  sectionTitle(doc, 'Recursos e Avaliação')
  if (c.recursos_materiais) bulletBlock(doc, 'Recursos e Materiais', c.recursos_materiais)
  if (c.avaliacao)          bulletBlock(doc, 'Avaliação', c.avaliacao)
  if (c.ajustes_demanda)    textBlock(doc, 'Ajuste(s) por Demanda', c.ajustes_demanda)
  if (c.referencias)        referencesBlock(doc, 'Referências', c.referencias)
}

// ─── Legacy generic renderer ──────────────────────────────────────────────────

function chipsValue(field: FieldDef, raw: string): string {
  if (!raw?.trim()) return ''
  try {
    const selected: string[] = JSON.parse(raw)
    if (!field.options) return selected.join(', ')
    return selected
      .map(v => field.options!.find(o => o.value === v)?.label ?? v)
      .join(', ')
  } catch { return raw }
}

function renderCurriculumContext(
  doc: InstanceType<typeof PDFDocument>,
  content: Record<string, string>
) {
  const turma      = content._turma_nome
  const disciplina = content._disciplina_nome
  const bimestre   = content._bimestre
  const aula       = content._titulo_aula
  const ciclo      = content._ciclo
  const serie      = content._serie

  if (!turma && !disciplina) return

  sectionTitle(doc, 'Contexto Curricular')
  if (turma)      infoRow(doc, 'Turma',      turma)
  if (disciplina) infoRow(doc, 'Disciplina', disciplina)
  if (serie && ciclo) infoRow(doc, 'Nível', `${ciclo === 'medio' ? 'Ensino Médio' : 'Ensino Fundamental'} · ${serie}ª série`)
  if (bimestre)   infoRow(doc, 'Bimestre',   `${bimestre}º Bimestre`)
  if (aula)       infoRow(doc, 'Aula',       aula)
  if (content.unidade_tematica)   infoRow(doc, 'Unidade Temática',      content.unidade_tematica)
  if (content.habilidade_codigo)  infoRow(doc, 'Habilidade(s)',         content.habilidade_codigo)
  if (content.objeto_conhecimento) infoRow(doc, 'Objeto de Conhecimento', content.objeto_conhecimento)
  doc.y += 10

  if (content.conteudo_aula?.trim())  textBlock(doc, 'Conteúdos da Aula (Currículo)', content.conteudo_aula)
  if (content.objetivos_aula?.trim()) textBlock(doc, 'Objetivos da Aula (Currículo)', content.objetivos_aula)
}

function parseJsonArray(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v : [] } catch { return [] }
}

function renderChecklists(
  doc: InstanceType<typeof PDFDocument>,
  content: Record<string, string>
) {
  const aes   = parseJsonArray(content._aprendizagens)
  const instr = parseJsonArray(content._instrumentos)
  if (aes.length > 0)   textBlock(doc, 'Aprendizagens Essenciais', aes.map((s, i) => `${i + 1}. ${s}`).join('\n'))
  if (instr.length > 0) textBlock(doc, 'Instrumentos Avaliativos', instr.join(' · '))
}

function renderGeneric(
  doc: InstanceType<typeof PDFDocument>,
  input: PdfInput
) {
  const { content, type } = input
  const meta = DOC_TYPES[type]

  const SKIP_KEYS = new Set([
    '_turma_id','_disciplina_id','_bimestre','_aula_id','_ciclo','_serie','_aulas_nome',
    '_aprendizagens','_instrumentos','_pei_student_id','_school_slug',
    '_turma_nome','_disciplina_nome','_titulo_aula','_aula_num',
    'habilidade_codigo','habilidade_texto','unidade_tematica',
    'objeto_conhecimento','conteudo_aula','objetivos_aula',
  ])

  const isCurriculum = ['GUIA_APRENDIZAGEM','PLANO_ELETIVA','PLANO_EMA'].includes(type)

  if (isCurriculum) renderCurriculumContext(doc, content)

  const infoFields  = meta.fields.filter(f => f.type !== 'textarea' && f.type !== 'chips' && !SKIP_KEYS.has(f.key))
  const chipsFields = meta.fields.filter(f => f.type === 'chips' && !SKIP_KEYS.has(f.key))
  const blockFields = meta.fields.filter(f => f.type === 'textarea' && !SKIP_KEYS.has(f.key))

  if (infoFields.length > 0) {
    sectionTitle(doc, 'Identificação')
    infoFields.forEach(f => infoRow(doc, f.label, content[f.key] ?? ''))
    doc.y += 10
  }

  if (chipsFields.length > 0) {
    sectionTitle(doc, 'Seleções')
    chipsFields.forEach(f => {
      const val = chipsValue(f, content[f.key])
      if (val) infoRow(doc, f.label, val)
    })
    doc.y += 10
  }

  blockFields.forEach(f => {
    if (content[f.key]?.trim()) textBlock(doc, f.label, content[f.key])
  })

  if (type === 'GUIA_APRENDIZAGEM') renderChecklists(doc, content)
}

// ─── PEI specialized renderer ────────────────────────────────────────────────

const PEI_LAWS = [
  { code: 'PNEE/2008',           desc: 'Política Nacional de Educação Especial na Perspectiva da Educação Inclusiva — MEC/SEESP' },
  { code: 'Lei 13.146/2015',     desc: 'LBI — Lei Brasileira de Inclusão da Pessoa com Deficiência (Estatuto da Pessoa com Deficiência)' },
  { code: 'Lei 9.394/1996',      desc: 'LDB — Lei de Diretrizes e Bases da Educação Nacional (Art. 58–60: Educação Especial)' },
  { code: 'Lei 8.069/1990',      desc: 'ECA — Estatuto da Criança e do Adolescente (Art. 53–55: Direito à Educação)' },
  { code: 'Decreto 7.611/2011',  desc: 'Educação Especial e Atendimento Educacional Especializado — AEE' },
  { code: 'Res. CNE/CEB 4/2009', desc: 'Diretrizes Operacionais para o AEE na Educação Básica, modalidade Educação Especial' },
  { code: 'DUA',                 desc: 'Desenho Universal para Aprendizagem — acessibilidade pedagógica, comunicacional e metodológica' },
  { code: 'Currículo Paulista',  desc: 'SEDUC-SP — orientações para flexibilização curricular e adaptações para inclusão' },
  { code: 'Delib. CEE 177/2023', desc: 'Deliberação CEE-SP — Educação Especial e Inclusão Escolar no Estado de São Paulo' },
  { code: 'Res. SE 68/2017',     desc: 'Resolução SE-SP — apoio à escolarização de alunos com deficiência, TGD e altas habilidades' },
]

const PEI_ESTRAT_PED_MAP = new Map<string, string>([
  ['Explicar o conteúdo em partes menores', 'Fragmentar conteúdos extensos em etapas menores e progressivas.'],
  ['Usar exemplos concretos e do cotidiano', 'Relacionar conceitos escolares a experiências reais e contextos familiares.'],
  ['Oferecer mais tempo para realizar tarefas', 'Garantir tempo ampliado para leitura, organização e execução.'],
  ['Fazer mediação nas atividades em grupo', 'Auxiliar a participação do estudante nas interações coletivas.'],
  ['Retomar conteúdos sempre que necessário', 'Revisitar habilidades e conceitos previamente trabalhados.'],
  ['Garantir previsibilidade (rotina visual, passo a passo)', 'Organizar a rotina com apoio visual e antecipação das atividades.'],
  ['Dar instruções claras com apoio visual', 'Apresentar orientações curtas e acompanhadas de exemplos.'],
  ['Antecipar mudanças de rotina e avaliações', 'Informar previamente alterações na rotina ou avaliações.'],
  ['Utilizar múltiplas formas de apresentação', 'Apresentar conteúdos por oral, visual, concreto, digital e prático.'],
  ['Relacionar conteúdos aos conhecimentos prévios', 'Ativar aprendizagens anteriores como ponto de partida.'],
  ['Utilizar organizadores gráficos e mapas mentais', 'Favorecer organização das informações por recursos visuais.'],
  ['Estabelecer objetivos curtos e metas progressivas', 'Dividir tarefas em metas menores e alcançáveis.'],
  ['Favorecer aprendizagem colaborativa com pares', 'Promover interação com colegas que auxiliem na participação.'],
  ['Realizar pausas planejadas em atividades extensas', 'Permitir intervalos organizados para recuperação atencional.'],
  ['Estimular autonomia por rotinas estruturadas', 'Favorecer independência gradual na organização e tarefas.'],
  ['Utilizar reforço positivo e devolutivas imediatas', 'Valorizar avanços e oferecer feedback rápido.'],
  ['Flexibilizar a sequência didática ao ritmo do aluno', 'Adaptar o percurso pedagógico respeitando tempo e necessidade.'],
  ['Favorecer participação por metodologias investigativas', 'Estimular protagonismo em pesquisas e construção coletiva.'],
  ['Apresentar modelos resolvidos antes da execução', 'Demonstrar exemplos completos antes da execução independente.'],
  ['Utilizar linguagem acessível ao nível de compreensão', 'Adequar vocabulário e estrutura às necessidades do estudante.'],
])

const PEI_INTERV_MAP = new Map<string, string>([
  ['Apoio individual em atividades mais complexas', 'Acompanhamento próximo em tarefas que exijam maior abstração.'],
  ['Adaptação de quantidade', 'Reduzir número de exercícios mantendo os objetivos essenciais.'],
  ['Adaptação de complexidade', 'Simplificar estrutura ou linguagem preservando a habilidade principal.'],
  ['Ajuste da forma de participação', 'Permitir diferentes formas de resposta: oral, escrita, visual.'],
  ['Leitura compartilhada e mediação de enunciados', 'Auxiliar compreensão leitora por leitura guiada.'],
  ['Fragmentação de atividades longas em etapas', 'Dividir tarefas extensas em pequenas partes progressivas.'],
  ['Oferta de pistas visuais ou palavras-chave', 'Disponibilizar apoios que auxiliem organização do pensamento.'],
  ['Revisão mediada antes da entrega final', 'Acompanhar a conferência da atividade para identificação de erros.'],
  ['Ampliação do tempo em avaliações', 'Garantir tempo adicional para processamento e registro.'],
  ['Substituição parcial da escrita extensa', 'Permitir registros alternativos quando houver dificuldade significativa.'],
  ['Avaliação diferenciada pelo percurso', 'Valorizar evolução individual, participação e desenvolvimento.'],
  ['Apoio na organização de materiais e tarefas', 'Auxiliar planejamento e gerenciamento de tempo escolar.'],
  ['Mediação verbal para manutenção do foco', 'Realizar lembretes e direcionamentos durante atividades.'],
  ['Priorização de habilidades essenciais do currículo', 'Focar nas aprendizagens fundamentais previstas para o ano.'],
  ['Planejamento articulado entre equipe e AEE', 'Promover alinhamento entre professores, especialistas e gestão.'],
])

const PEI_RECURS_MAP = new Map<string, string>([
  ['Material ampliado, contrastes ou fontes acessíveis', 'Adaptar tamanho, contraste e legibilidade dos materiais.'],
  ['Figuras, pictogramas ou comunicação alternativa', 'Utilizar apoios visuais e sistemas alternativos de comunicação.'],
  ['Tablet ou computador para registro de respostas', 'Permitir recursos digitais para facilitar escrita e participação.'],
  ['Softwares de leitura e síntese de voz', 'Disponibilizar ferramentas digitais de apoio à leitura.'],
  ['Recursos de comunicação suplementar (CSA)', 'Utilizar pranchas, aplicativos ou símbolos para comunicação.'],
  ['Áudio para textos e instruções', 'Oferecer materiais em formato sonoro para favorecer compreensão.'],
  ['Materiais manipuláveis e concretos', 'Favorecer compreensão por experimentação prática e visualização.'],
  ['Ambiente com redução de estímulos sensoriais', 'Minimizar ruídos e fatores que dificultem concentração.'],
  ['Vídeos legendados e materiais multimodais', 'Oferecer conteúdos acessíveis em diferentes formatos.'],
])

function peiItemBlock(doc: InstanceType<typeof PDFDocument>, nome: string, desc: string | undefined) {
  const pad = 6
  const blockH = desc ? 36 : 20
  ensureSpace(doc, blockH + 4)
  const y0 = doc.y

  doc.rect(MARGIN, y0, 3, blockH).fill(DARK)
  doc.rect(MARGIN + 3, y0, CONTENT_W - 3, blockH).fill(LIGHT).strokeColor(BORDER).lineWidth(0.3).stroke()

  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(DARK)
  doc.text(nome, MARGIN + 3 + pad, y0 + 4, { width: CONTENT_W - 3 - pad * 2, lineBreak: false })

  if (desc) {
    doc.font('Helvetica').fontSize(7.5).fillColor(GRAY)
    doc.text(desc, MARGIN + 3 + pad, y0 + 17, { width: CONTENT_W - 3 - pad * 2, lineGap: 1 })
    doc.y = Math.max(doc.y, y0 + blockH) + 3
  } else {
    doc.y = y0 + blockH + 3
  }
}

function legalBasisBlock(doc: InstanceType<typeof PDFDocument>) {
  const pad   = 6
  const codeW = 108
  const descW = CONTENT_W - codeW - pad * 3
  const rowH  = 14

  sectionTitle(doc, 'Embasamento Legal e Técnico')

  doc.font('Helvetica').fontSize(7.5).fillColor(GRAY)
  doc.text(
    'Estrutura fundamentada em normativas oficiais vigentes, garantindo validade pedagógica, intencionalidade educacional e proteção jurídica ao documento.',
    MARGIN, doc.y, { width: CONTENT_W }
  )
  doc.moveDown(0.5)

  ensureSpace(doc, 14 + PEI_LAWS.length * rowH + 4)

  const hdrY = doc.y
  doc.rect(MARGIN, hdrY, CONTENT_W, 14).fill(DARK).strokeColor(BORDER).lineWidth(0.3).stroke()
  doc.font('Helvetica-Bold').fontSize(6.5).fillColor(WHITE)
  doc.text('NORMATIVA / BASE LEGAL', MARGIN + pad, hdrY + 4, { lineBreak: false })
  doc.text('REFERÊNCIA', MARGIN + pad + codeW + pad, hdrY + 4, { lineBreak: false })
  doc.y = hdrY + 14

  PEI_LAWS.forEach((law, i) => {
    ensureSpace(doc, rowH + 2)
    const ry = doc.y
    const bg = i % 2 === 0 ? WHITE : LIGHT
    doc.rect(MARGIN, ry, CONTENT_W, rowH).fill(bg).strokeColor(BORDER).lineWidth(0.2).stroke()
    doc.rect(MARGIN + codeW + pad, ry, 0.5, rowH).fill(BORDER)
    doc.font('Helvetica-Bold').fontSize(7).fillColor(DARK)
    doc.text(law.code, MARGIN + pad, ry + 3, { width: codeW - pad, lineBreak: false })
    doc.font('Helvetica').fontSize(7).fillColor(GRAY)
    doc.text(law.desc, MARGIN + codeW + pad * 2, ry + 3, { width: descW, lineBreak: false })
    doc.y = ry + rowH
  })
  doc.moveDown(0.5)
}

function renderPei(doc: InstanceType<typeof PDFDocument>, c: Record<string, string>, createdAt?: string) {
  const dataElab = c.data_elaboracao?.trim() || (createdAt ? new Date(createdAt).toLocaleDateString('pt-BR') : '—')

  sectionTitle(doc, 'Identificação do Aluno')
  infoRow2col(doc, [
    { label: 'Aluno',     value: c.aluno ?? '' },
    { label: 'RA',        value: c.ra ?? '' },
  ])
  infoRow2col(doc, [
    { label: 'Turma',     value: c.turma ?? '' },
    { label: 'Bimestre',  value: c.bimestre ? `${c.bimestre}º Bimestre` : '—' },
  ])
  infoRow2col(doc, [
    { label: 'Disciplina',       value: c.disciplina ?? '' },
    { label: 'Data de Elaboração', value: dataElab },
  ])
  if (c.diagnostico_cid) infoRow2col(doc, [{ label: 'Diagnóstico / CID', value: c.diagnostico_cid, span: 2 }])

  if (c.habilidades || c.conteudo) {
    sectionTitle(doc, 'Habilidades e Conteúdo do Currículo')
    if (c.habilidades) textBlock(doc, 'Habilidades BNCC', c.habilidades)
    // Regra do PEI: além da habilidade, o conteúdo específico vinculado a ela.
    if (c.conteudo) textBlock(doc, 'Conteúdo Específico', c.conteudo)
  }

  sectionTitle(doc, 'Diagnóstico Funcional')
  if (c.diagnostico_funcional) textBlock(doc, 'Diagnóstico Funcional', c.diagnostico_funcional)
  if (c.diagnostico_obs)       textBlock(doc, 'Observações Diagnósticas', c.diagnostico_obs)

  legalBasisBlock(doc)

  sectionTitle(doc, 'Plano de Ação')
  if (c.objetivos) textBlock(doc, 'Objetivos Específicos', c.objetivos)

  if (c.estrategias) {
    const estLines = c.estrategias.split('\n').map(l => l.trim()).filter(Boolean)
    const ped    = estLines.filter(l => PEI_ESTRAT_PED_MAP.has(l))
    const interv = estLines.filter(l => PEI_INTERV_MAP.has(l))
    const recurs = estLines.filter(l => PEI_RECURS_MAP.has(l))
    const outros = estLines.filter(l => !PEI_ESTRAT_PED_MAP.has(l) && !PEI_INTERV_MAP.has(l) && !PEI_RECURS_MAP.has(l))

    if (ped.length)    { subLabel(doc, 'Estratégias Pedagógicas');    ped.forEach(n    => peiItemBlock(doc, n, PEI_ESTRAT_PED_MAP.get(n))) }
    if (interv.length) { subLabel(doc, 'Intervenções Pedagógicas');   interv.forEach(n => peiItemBlock(doc, n, PEI_INTERV_MAP.get(n))) }
    if (recurs.length) { subLabel(doc, 'Recursos de Acessibilidade'); recurs.forEach(n => peiItemBlock(doc, n, PEI_RECURS_MAP.get(n))) }
    if (outros.length) { subLabel(doc, 'Outras Estratégias');         outros.forEach(n => peiItemBlock(doc, n, undefined)) }
  }

  if (c.avaliacao) textBlock(doc, 'Avaliação do Processo', c.avaliacao)

  sectionTitle(doc, 'Profissionais e Família')
  if (c.profissionais) textBlock(doc, 'Profissionais Envolvidos', c.profissionais)
  if (c.responsaveis || c.proxima_revisao) {
    infoRow2col(doc, [
      { label: 'Responsáveis / Família',  value: c.responsaveis ?? '' },
      { label: 'Data da Próxima Revisão', value: c.proxima_revisao ?? '' },
    ])
  }
}

// ─── GUIA_APRENDIZAGEM specialized renderer ───────────────────────────────────

const BNCC_COMP_MAP = new Map<string, string>([
  ['Conhecimento',                              'Valorizar e utilizar os conhecimentos historicamente construídos sobre o mundo físico, social, cultural e digital.'],
  ['Pensamento científico, crítico e criativo', 'Exercitar a curiosidade intelectual e recorrer à abordagem própria das ciências para investigar causas e elaborar hipóteses.'],
  ['Repertório cultural',                       'Valorizar e fruir as diversas manifestações artísticas e culturais, das locais às mundiais.'],
  ['Comunicação',                               'Utilizar diferentes linguagens para se expressar e partilhar informações e experiências em diferentes contextos.'],
  ['Cultura digital',                           'Compreender, utilizar e criar tecnologias digitais de forma crítica, significativa e ética nas diversas práticas sociais.'],
  ['Trabalho e projeto de vida',                'Valorizar a diversidade de saberes e vivências culturais para entender as relações do mundo do trabalho.'],
  ['Argumentação',                              'Argumentar com base em fatos, dados e informações confiáveis para formular e defender ideias com posicionamento ético.'],
  ['Autoconhecimento e autocuidado',            'Conhecer-se, apreciar-se e cuidar de sua saúde física e emocional, compreendendo-se na diversidade humana.'],
  ['Empatia e cooperação',                      'Exercitar a empatia, o diálogo, a resolução de conflitos e a cooperação, promovendo o respeito ao outro.'],
  ['Responsabilidade e cidadania',              'Agir pessoal e coletivamente com autonomia, responsabilidade e determinação, com base em princípios éticos e democráticos.'],
])

function renderGuiaAprendizagem(
  doc: InstanceType<typeof PDFDocument>,
  c: Record<string, string>,
  createdAt?: string,
  aulas?: AulaSelecionada[],
  aes?: AprendizagemEssencial[],
) {
  const isPV = (c.disciplina ?? '').toLowerCase().includes('projeto de vida')
  const bimestreLabel = c.bimestre ? `${c.bimestre}º Bimestre` : '—'
  const anoLetivo = c.ano_letivo || (createdAt ? new Date(createdAt).getFullYear().toString() : '—')

  sectionTitle(doc, 'Identificação')
  infoRow2col(doc, [
    { label: 'Turma(s)',    value: c.turmas || c.turma || '—' },
    { label: 'Disciplina', value: c.disciplina || '—' },
  ])
  infoRow2col(doc, [
    { label: 'Bimestre',   value: bimestreLabel },
    { label: 'Ano Letivo', value: anoLetivo },
  ])
  if (c.data_inicio) infoRow2col(doc, [{ label: 'Data de Início', value: c.data_inicio, span: 2 }])
  if (c.tema) infoRow2col(doc, [{ label: isPV ? 'Projeto do Bimestre' : 'Tema / Título do Guia', value: c.tema, span: 2 }])

  if (isPV) {
    sectionTitle(doc, 'Competências Socioemocionais')
    if (c.competencias) textBlock(doc, 'Competências do Bimestre', c.competencias)
    if (c.habilidades?.trim()) { doc.moveDown(0.3); habilidadesTable(doc, c.habilidades) }
  } else {
    sectionTitle(doc, 'Competências e Habilidades')
    if (c.competencias) {
      subLabel(doc, 'Competências Gerais (BNCC)')
      c.competencias.split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
        const nomePart = line.replace(/^\d+\.\s*/, '')
        const desc = BNCC_COMP_MAP.get(nomePart)
        ensureSpace(doc, desc ? 30 : 16)
        const y0 = doc.y
        doc.circle(MARGIN + 9, y0 + 5, 2).fill(YELLOW)
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(DARK)
        doc.text(nomePart, MARGIN + 16, y0, { width: CONTENT_W - 18, lineBreak: false })
        if (desc) {
          doc.font('Helvetica').fontSize(7.5).fillColor(GRAY)
          doc.text(desc, MARGIN + 16, doc.y + 2, { width: CONTENT_W - 18, lineGap: 1 })
        }
        doc.y += 5
      })
      doc.y += 4
    }
    if (c.habilidades?.trim()) { doc.moveDown(0.3); habilidadesTable(doc, c.habilidades) }
    if (aes && aes.length > 0) { doc.moveDown(0.3); aesTable(doc, aes) }
  }

  if (aulas && aulas.length > 0) {
    sectionTitle(doc, 'Sequência de Aulas')
    aulasTable(doc, aulas)
  }

  sectionTitle(doc, 'Metodologia e Avaliação')
  if (c.estrategias)      textBlock(doc, isPV ? 'Estratégias Socioemocionais' : 'Estratégias Didáticas', c.estrategias)
  if (c.recursos)         bulletBlock(doc, 'Recursos e Materiais', c.recursos)
  if (c.avaliacao)        bulletBlock(doc, isPV ? 'Avaliação Socioemocional' : 'Avaliação Bimestral', c.avaliacao)
  if (c.ajustes_demanda)  textBlock(doc, 'Ajuste(s) por Demanda', c.ajustes_demanda)
  if (c.composicao_media) textBlock(doc, 'Composição de Média', c.composicao_media)
  if (c.referencias)      referencesBlock(doc, 'Referências', c.referencias)
}

// ─── PDI specialized renderer ─────────────────────────────────────────────────

function renderPdiTable(doc: InstanceType<typeof PDFDocument>, atividades: Record<string, string>[]) {
  if (atividades.length === 0) return
  const pad = 6
  const w1 = CONTENT_W * (60 / 315)
  const w2 = CONTENT_W * (140 / 315)
  const w3 = CONTENT_W - w1 - w2
  const headerH = 28

  function drawHeader(y: number) {
    doc.rect(MARGIN, y, w1, headerH).fill(DARK)
    doc.rect(MARGIN + w1, y, w2, headerH).fill(DARK)
    doc.rect(MARGIN + w1 + w2, y, w3, headerH).fill(DARK)
    doc.font('Helvetica-Bold').fontSize(7).fillColor(WHITE)
    doc.text('DIMENSÃO', MARGIN + pad, y + 3, { width: w1 - pad * 2, lineBreak: false })
    doc.text('ATIVIDADE', MARGIN + w1 + pad, y + 3, { width: w2 - pad * 2, lineBreak: false })
    doc.text('PRAZO / OBJETIVOS / META', MARGIN + w1 + w2 + pad, y + 3, { width: w3 - pad * 2 })
  }

  ensureSpace(doc, headerH + 80)
  let rowY = doc.y
  drawHeader(rowY)
  rowY += headerH

  atividades.forEach((ativ, i) => {
    const dimensao = ativ.dimensao || '—'
    const prazo = ((ativ.prazo_inicio || '') + (ativ.prazo_fim ? ` a ${ativ.prazo_fim}` : '')) || '—'
    const objetivos = ativ.objetivos?.substring(0, 150) || '—'
    const meta = ativ.meta?.substring(0, 150) || '—'
    const rightText = `PRAZO: ${prazo}\n\nOBJETIVOS: ${objetivos}\n\nMETA: ${meta}`

    doc.font('Helvetica').fontSize(8)
    const dimH = Math.ceil(doc.heightOfString(dimensao, { width: w1 - pad * 2 }))
    const rightH = Math.ceil(doc.heightOfString(rightText, { width: w3 - pad * 2 }))
    let rowH = Math.max(dimH, rightH) + pad * 2
    rowH = Math.max(rowH, 60)

    if (rowY + rowH > PAGE_H - BOTTOM_M) {
      doc.addPage()
      rowY = doc.y
      drawHeader(rowY)
      rowY += headerH
    }

    const bg = i % 2 === 0 ? WHITE : LIGHT
    doc.rect(MARGIN, rowY, w1, rowH).fill(bg).strokeColor(BORDER).lineWidth(0.4).stroke()
    doc.rect(MARGIN + w1, rowY, w2, rowH).fill(bg).strokeColor(BORDER).lineWidth(0.4).stroke()
    doc.rect(MARGIN + w1 + w2, rowY, w3, rowH).fill(bg).strokeColor(BORDER).lineWidth(0.4).stroke()

    doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK)
    doc.text(dimensao, MARGIN + pad, rowY + pad, { width: w1 - pad * 2, align: 'center', lineBreak: false })

    const dimObj = DIMENSOES_PDI[parseInt(dimensao)]
    const atividadeTitulo = dimObj?.atividades.find(a => a.id === ativ.atividade)?.titulo || '—'
    doc.font('Helvetica').fontSize(8.5).fillColor(DARK)
    doc.text(atividadeTitulo, MARGIN + w1 + pad, rowY + pad, { width: w2 - pad * 2, lineGap: 1.5 })

    doc.font('Helvetica').fontSize(7.5).fillColor(DARK)
    doc.text(rightText, MARGIN + w1 + w2 + pad, rowY + pad, { width: w3 - pad * 2, lineGap: 1.2 })

    rowY += rowH
  })
  doc.y = rowY + 4
}

function renderPdi(doc: InstanceType<typeof PDFDocument>, c: Record<string, string>, createdAt?: string) {
  const dataElab = c.data_elaboracao?.trim() || (createdAt ? new Date(createdAt).toLocaleDateString('pt-BR') : '—')
  const periodoRef = c.periodo?.trim() || '—'

  sectionTitle(doc, 'Identificação')
  infoRow2col(doc, [
    { label: 'Período de Referência', value: periodoRef },
    { label: 'Data de Elaboração',    value: dataElab },
  ])

  sectionTitle(doc, 'Plano de Desenvolvimento Individual — Dimensões')
  try {
    const atividades = c.atividades_json ? JSON.parse(c.atividades_json) : []
    if (atividades.length === 0) {
      doc.font('Helvetica').fontSize(9.5).fillColor(GRAY).text('Nenhuma atividade registrada.', MARGIN + 8, doc.y + 4)
      doc.y += 20
    } else {
      renderPdiTable(doc, atividades)
    }
  } catch {
    doc.font('Helvetica').fontSize(9.5).fillColor(GRAY).text('Erro ao processar atividades.', MARGIN + 8, doc.y + 4)
    doc.y += 20
  }
}

// ─── Projeto científico renderer ──────────────────────────────────────────────

function sciSection(doc: InstanceType<typeof PDFDocument>, num: string, title: string) {
  ensureSpace(doc, 50)
  doc.moveDown(0.5)
  const y = doc.y
  doc.font('Helvetica-Bold').fontSize(11).fillColor(DARK)
  doc.text(`${num}.  ${title.toUpperCase()}`, MARGIN, y, { lineBreak: false })
  doc.moveDown(0.15)
  doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + CONTENT_W * 0.35, doc.y).strokeColor(YELLOW).lineWidth(1.2).stroke()
  doc.moveDown(0.5)
}

function renderProjeto(doc: InstanceType<typeof PDFDocument>, c: Record<string, string>, createdAt?: string) {
  const periodo = c.periodo?.trim() || (createdAt
    ? ((new Date(createdAt).getMonth() + 1) <= 6 ? `1º Semestre ${new Date(createdAt).getFullYear()}` : `2º Semestre ${new Date(createdAt).getFullYear()}`)
    : '—')

  // Título
  ensureSpace(doc, 90)
  doc.moveDown(0.6)
  doc.font('Helvetica-Bold').fontSize(17).fillColor(DARK)
  doc.text(c.titulo?.trim() || 'Projeto de Pesquisa', MARGIN, doc.y, { width: CONTENT_W, align: 'center', lineGap: 3 })
  doc.moveDown(0.4)
  if (c.tema_sugerido?.trim()) {
    doc.font('Helvetica').fontSize(10).fillColor(GRAY)
    doc.text(c.tema_sugerido.trim(), MARGIN, doc.y, { width: CONTENT_W, align: 'center' })
    doc.moveDown(0.35)
  }
  doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + CONTENT_W, doc.y).strokeColor(YELLOW).lineWidth(1.5).stroke()
  doc.moveDown(0.4)

  // Metadados
  const meta = [c.grande_area, c.subarea, c.linha_aplicacao, c.tipo_projeto].map(x => x?.trim()).filter(Boolean)
  if (meta.length > 0) {
    doc.font('Helvetica').fontSize(7.5).fillColor(GRAY)
    doc.text(meta.join('  ·  '), MARGIN, doc.y, { width: CONTENT_W, align: 'center', lineBreak: false })
    doc.moveDown(0.4)
  }
  const escopo: string[] = []
  if (c.turmas?.trim())      escopo.push(`Turmas: ${c.turmas.trim()}`)
  if (c.disciplinas?.trim()) escopo.push(`Disciplinas: ${c.disciplinas.trim()}`)
  if (c.acao?.trim())        escopo.push(`Ação: ${c.acao.trim()}`)
  if (periodo)               escopo.push(`Período: ${periodo}`)
  if (escopo.length > 0) {
    doc.font('Helvetica').fontSize(8).fillColor(GRAY)
    doc.text(escopo.join('   |   '), MARGIN, doc.y, { width: CONTENT_W, align: 'center', lineBreak: false })
    doc.moveDown(0.8)
  }

  // Resumo
  if (c.resumo?.trim()) {
    ensureSpace(doc, 80)
    const boxY = doc.y
    doc.font('Helvetica').fontSize(8.5)
    const resumoH = doc.heightOfString(c.resumo.trim(), { width: CONTENT_W - 22 })
    const boxH = resumoH + 28
    doc.rect(MARGIN, boxY, CONTENT_W, boxH).fill(LIGHT)
    doc.rect(MARGIN, boxY, 3, boxH).fill(DARK)
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor(DARK)
    doc.text('RESUMO', MARGIN + 10, boxY + 8, { characterSpacing: 1.5, lineBreak: false })
    doc.font('Helvetica').fontSize(8.5).fillColor(DARK)
    doc.text(c.resumo.trim(), MARGIN + 10, boxY + 18, { width: CONTENT_W - 18, lineGap: 1.5 })
    doc.y = boxY + boxH + 6
  }
  if (c.palavras_chave?.trim()) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(GRAY)
    doc.text('Palavras-chave: ', MARGIN, doc.y, { continued: true, lineBreak: false })
    doc.font('Helvetica').fontSize(8).fillColor(GRAY).text(c.palavras_chave.trim())
    doc.moveDown(0.8)
  }
  doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + CONTENT_W, doc.y).strokeColor(BORDER).lineWidth(0.5).stroke()
  doc.moveDown(0.6)

  const para = (txt: string) => { doc.font('Helvetica').fontSize(9.5).fillColor(DARK).text(txt.trim(), MARGIN, doc.y, { width: CONTENT_W, lineGap: 2 }); doc.moveDown(0.6) }

  let n = 1
  if (c.problema?.trim())      { sciSection(doc, String(n++), 'Problema de Pesquisa'); para(c.problema) }
  if (c.justificativa?.trim()) { sciSection(doc, String(n++), 'Justificativa'); para(c.justificativa) }
  if (c.objetivo_geral?.trim() || c.objetivos_especificos?.trim()) {
    sciSection(doc, String(n++), 'Objetivos')
    if (c.objetivo_geral?.trim()) {
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(GRAY).text('Objetivo Geral', MARGIN, doc.y)
      para(c.objetivo_geral)
    }
    if (c.objetivos_especificos?.trim()) {
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(GRAY).text('Objetivos Específicos', MARGIN, doc.y)
      c.objetivos_especificos.trim().split('\n').filter(Boolean).forEach(item => {
        ensureSpace(doc, 20)
        doc.font('Helvetica').fontSize(9.5).fillColor(DARK).text(item.trim(), MARGIN + 10, doc.y, { width: CONTENT_W - 10, lineGap: 1.5 })
      })
      doc.moveDown(0.4)
    }
  }
  if (c.metodologia?.trim()) { sciSection(doc, String(n++), 'Metodologia'); para(c.metodologia) }
  if (c.resultados?.trim())  { sciSection(doc, String(n++), 'Resultados Esperados'); para(c.resultados) }
  if (c.impacto?.trim())     { sciSection(doc, String(n++), 'Impacto Esperado'); para(c.impacto) }
  if (c.recursos?.trim())    { sciSection(doc, String(n++), 'Recursos Previstos'); para(c.recursos) }
  if (c.referencias?.trim()) {
    sciSection(doc, String(n++), 'Referências')
    c.referencias.trim().split('\n').filter(Boolean).forEach((ref, i) => {
      ensureSpace(doc, 22)
      doc.font('Helvetica').fontSize(8.5).fillColor(DARK).text(`${i + 1}.  ${ref.trim()}`, MARGIN + 14, doc.y, { width: CONTENT_W - 14, lineGap: 1.5 })
    })
  }
}

// ─── Plano de Eletiva renderer ────────────────────────────────────────────────

function cronogramaTable(doc: InstanceType<typeof PDFDocument>, raw: string) {
  let rows: { date: string; acao: string }[] = []
  try { rows = raw ? JSON.parse(raw) : [] } catch { return }
  if (rows.length === 0) return

  const pad = 6
  const numW = 28
  const dateW = 70
  const acaoW = CONTENT_W - numW - dateW

  subLabel(doc, 'Conteúdo Programático')
  const headerH = 16
  ensureSpace(doc, headerH + 20)
  let y0 = doc.y
  doc.rect(MARGIN, y0, CONTENT_W, headerH).fill(DARK)
  doc.font('Helvetica-Bold').fontSize(7).fillColor(WHITE)
  doc.text('#', MARGIN + pad, y0 + 4, { width: numW - pad, lineBreak: false })
  doc.text('DATA', MARGIN + numW + pad, y0 + 4, { width: dateW - pad, lineBreak: false })
  doc.text('ATIVIDADE / TEMA', MARGIN + numW + dateW + pad, y0 + 4, { width: acaoW - pad, lineBreak: false })
  let rowY = y0 + headerH

  rows.forEach((row, i) => {
    doc.font('Helvetica').fontSize(8)
    const acaoH = doc.heightOfString(row.acao || '—', { width: acaoW - pad * 2 })
    const rowH = Math.max(acaoH + pad * 2, 18)
    if (rowY + rowH > PAGE_H - BOTTOM_M) { doc.addPage(); rowY = doc.y }
    const bg = i % 2 === 0 ? WHITE : LIGHT
    doc.rect(MARGIN, rowY, numW, rowH).fill(bg).strokeColor(BORDER).lineWidth(0.3).stroke()
    doc.rect(MARGIN + numW, rowY, dateW, rowH).fill(bg).strokeColor(BORDER).lineWidth(0.3).stroke()
    doc.rect(MARGIN + numW + dateW, rowY, acaoW, rowH).fill(bg).strokeColor(BORDER).lineWidth(0.3).stroke()
    doc.font('Helvetica').fontSize(7.5).fillColor(GRAY).text(String(i + 1).padStart(2, '0'), MARGIN + pad, rowY + pad, { width: numW - pad, lineBreak: false })
    doc.fillColor(DARK).text(row.date, MARGIN + numW + pad, rowY + pad, { width: dateW - pad, lineBreak: false })
    doc.text(row.acao || '—', MARGIN + numW + dateW + pad, rowY + pad, { width: acaoW - pad * 2, lineGap: 1 })
    rowY += rowH
  })
  doc.y = rowY + 4
}

function renderPlanoEletiva(doc: InstanceType<typeof PDFDocument>, c: Record<string, string>, createdAt?: string) {
  const semestre = c.semestre?.trim() || (createdAt ? ((new Date(createdAt).getMonth() + 1) <= 6 ? '1º Semestre' : '2º Semestre') : '—')
  const nivelLabel = c.nivel_ensino === 'medio' ? 'Ensino Médio' : c.nivel_ensino === 'fundamental' ? 'Ensino Fundamental' : (c.nivel_ensino ?? '—')

  sectionTitle(doc, 'Identificação')
  infoRow2col(doc, [{ label: 'Nome da Eletiva', value: c.nome_eletiva ?? '', span: 2 }])
  infoRow2col(doc, [
    { label: 'Nível de Ensino', value: nivelLabel },
    { label: 'Semestre', value: semestre },
  ])
  infoRow2col(doc, [
    { label: 'Carga Horária Semanal', value: c.carga_horaria ?? '' },
    { label: 'Professor(a) Parceiro(a)', value: c.professor_parceiro || '—' },
  ])

  sectionTitle(doc, 'Proposta Pedagógica')
  if (c.ementa)        textBlock(doc, 'Ementa', c.ementa)
  if (c.habilidades?.trim()) bulletBlock(doc, 'Habilidades BNCC', c.habilidades)
  if (c.justificativa) textBlock(doc, 'Justificativa', c.justificativa)
  if (c.objetivos)     textBlock(doc, 'Objetivos', c.objetivos)
  if (c.cronograma)    cronogramaTable(doc, c.cronograma)

  sectionTitle(doc, 'Metodologia e Avaliação')
  if (c.metodologia)      textBlock(doc, 'Metodologia', c.metodologia)
  if (c.avaliacao)        bulletBlock(doc, 'Avaliação', c.avaliacao)
  if (c.materiais)        bulletBlock(doc, 'Materiais e Recursos', c.materiais)
  if (c.composicao_media) textBlock(doc, 'Composição de Média', c.composicao_media)
  if (c.referencias)      referencesBlock(doc, 'Referências', c.referencias)
}

function renderPlanoEma(doc: InstanceType<typeof PDFDocument>, c: Record<string, string>, createdAt?: string) {
  const bimestre = c.bimestre?.trim() || (createdAt ? (() => { const m = new Date(createdAt).getMonth() + 1; return m <= 3 ? '1' : m <= 6 ? '2' : m <= 9 ? '3' : '4' })() : '—')
  sectionTitle(doc, 'Identificação')
  infoRow2col(doc, [
    { label: 'Modalidade', value: c.modalidade ?? '' },
    { label: 'Bimestre', value: bimestre ? `${bimestre}º Bimestre` : '—' },
  ])
  infoRow2col(doc, [
    { label: 'Turmas Atendidas', value: c.turmas ?? '' },
    { label: 'Carga Horária Semanal', value: c.carga_horaria ?? '' },
  ])
  if (c.tema) infoRow2col(doc, [{ label: 'Tema / Projeto do Bimestre', value: c.tema, span: 2 }])

  sectionTitle(doc, 'Planejamento')
  if (c.objetivos)        textBlock(doc, 'Objetivos', c.objetivos)
  if (c.conteudos)        textBlock(doc, 'Conteúdos', c.conteudos)
  if (c.metodologia)      textBlock(doc, 'Metodologia', c.metodologia)
  if (c.avaliacao)        bulletBlock(doc, 'Avaliação', c.avaliacao)
  if (c.materiais)        bulletBlock(doc, 'Materiais e Equipamentos', c.materiais)
  if (c.composicao_media) textBlock(doc, 'Composição de Média', c.composicao_media)
  if (c.referencias)      referencesBlock(doc, 'Referências', c.referencias)
}

// ─── Carta Náutica renderer ───────────────────────────────────────────────────

const FAROL_LABEL: Record<string, string> = {
  para_comecar: 'Para começar', relembre: 'Relembre', foco_conteudo: 'Foco no conteúdo',
  na_pratica: 'Na prática', encerramento: 'Encerramento',
}

function renderCartaNautica(doc: InstanceType<typeof PDFDocument>, c: Record<string, string>) {
  let aulas: { aulaNum: number; titulo: string; conteudo?: string | null; objetivos?: string | null; slides: { slideNum: number; tipo: string }[] }[] = []
  try { aulas = c.aulas_slides_json ? JSON.parse(c.aulas_slides_json) : [] } catch { aulas = [] }

  sectionTitle(doc, 'Identificação')
  infoRow2col(doc, [
    { label: 'Turma(s)',   value: c.turmas || c.turma || '—' },
    { label: 'Disciplina', value: c.disciplina || '—' },
  ])
  infoRow2col(doc, [
    { label: 'Bimestre', value: c.bimestre ? `${c.bimestre}º Bimestre` : '—' },
    { label: 'Período',  value: c.periodo || 'por_aula' },
  ])

  if (aulas.length === 0) {
    sectionTitle(doc, 'Mapa de Slides')
    doc.font('Helvetica').fontSize(9.5).fillColor(GRAY).text('Nenhuma aula mapeada.', MARGIN + 8, doc.y + 4)
    doc.y += 20
    return
  }

  for (const aula of aulas) {
    sectionTitle(doc, `Aula ${aula.aulaNum} — ${aula.titulo}`)
    if (aula.objetivos) textBlock(doc, 'Objetivos', aula.objetivos)

    // Agrupa slides por farol
    const byTipo = new Map<string, number[]>()
    for (const sl of aula.slides) {
      if (!byTipo.has(sl.tipo)) byTipo.set(sl.tipo, [])
      byTipo.get(sl.tipo)!.push(sl.slideNum)
    }
    const ordem = ['para_comecar', 'relembre', 'foco_conteudo', 'na_pratica', 'encerramento']
    for (const tipo of ordem) {
      const nums = byTipo.get(tipo)
      if (nums && nums.length > 0) {
        infoRow2col(doc, [{ label: FAROL_LABEL[tipo] ?? tipo, value: nums.sort((a, b) => a - b).map(n => `Slide ${n}`).join(', '), span: 2 }])
      }
    }
  }
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function generatePdf(input: PdfInput): Promise<Buffer> {
  // Tipos simples já migrados — usam o novo design system v2 (ABNT seletiva)
  if (NEW_GENERIC_TYPES.has(input.type)) {
    return generateGenericPdf({
      type:       input.type,
      title:      input.title,
      content:    input.content,
      schoolName: input.schoolName,
      authorName: input.authorName,
      createdAt:  input.createdAt,
    })
  }
  if (NEW_PLANO_AULA_TYPES.has(input.type)) {
    return generatePlanoAulaPdf({
      type:       input.type,
      title:      input.title,
      content:    input.content,
      schoolName: input.schoolName,
      authorName: input.authorName,
      createdAt:  input.createdAt,
      aprendizagensEssenciais: input.aprendizagensEssenciais,
      aulasSelecionadas:       input.aulasSelecionadas,
    })
  }
  if (NEW_GUIA_TYPES.has(input.type)) {
    return generateGuiaPdf({
      type:       input.type,
      title:      input.title,
      content:    input.content,
      schoolName: input.schoolName,
      authorName: input.authorName,
      createdAt:  input.createdAt,
      aprendizagensEssenciais: input.aprendizagensEssenciais,
      aulasSelecionadas:       input.aulasSelecionadas,
    })
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true })
    const chunks: Buffer[] = []

    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end',  () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    header(doc, input)

    doc.on('pageAdded', () => {
      miniHeader(doc, input)
    })

    if (input.type === 'PLANO_AULA' || input.type === 'OE_PLANO_AULA') {
      renderPlanoDeAula(
        doc,
        input.content,
        input.createdAt.toISOString(),
        input.aprendizagensEssenciais,
        input.aulasSelecionadas,
      )
    } else if (input.type === 'PEI') {
      renderPei(doc, input.content, input.createdAt.toISOString())
    } else if (input.type === 'GUIA_APRENDIZAGEM' || input.type === 'OE_GUIA_APRENDIZAGEM') {
      renderGuiaAprendizagem(
        doc,
        input.content,
        input.createdAt.toISOString(),
        input.aulasSelecionadas,
        input.aprendizagensEssenciais,
      )
    } else if (input.type === 'PDI') {
      renderPdi(doc, input.content, input.createdAt.toISOString())
    } else if (input.type === 'PROJETO') {
      renderProjeto(doc, input.content, input.createdAt.toISOString())
    } else if (input.type === 'PLANO_ELETIVA') {
      renderPlanoEletiva(doc, input.content, input.createdAt.toISOString())
    } else if (input.type === 'PLANO_EMA') {
      renderPlanoEma(doc, input.content, input.createdAt.toISOString())
    } else if (input.type === 'CARTA_NAUTICA') {
      renderCartaNautica(doc, input.content)
    } else {
      renderGeneric(doc, input)
    }

    footer(doc, input)
    doc.end()
  })
}
