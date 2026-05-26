import PDFDocument from 'pdfkit'
import { DOC_TYPES, type DocType, type FieldDef } from './doc-types'

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

export function generatePdf(input: PdfInput): Promise<Buffer> {
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

    if (input.type === 'PLANO_AULA') {
      renderPlanoDeAula(
        doc,
        input.content,
        input.createdAt.toISOString(),
        input.aprendizagensEssenciais,
        input.aulasSelecionadas,
      )
    } else {
      renderGeneric(doc, input)
    }

    footer(doc, input)
    doc.end()
  })
}
