import PDFDocument from 'pdfkit'
import { DOC_TYPES, type DocType } from './doc-types'

const PAGE_W  = 595.28
const PAGE_H  = 841.89
const MARGIN  = 50
const BOTTOM_M = 60
const CONTENT_W = PAGE_W - MARGIN * 2

const BRAND  = '#1a0f00' // text on yellow
const YELLOW = '#fce375'
const DARK   = '#1a1a2e'
const GRAY   = '#4b5563'
const LIGHT  = '#f3f4f6'
const BORDER = '#d1d5db'
const WHITE  = '#ffffff'

type DocContent = Record<string, string>

export type PdfInput = {
  type:       DocType
  title:      string
  content:    DocContent
  schoolName: string
  authorName: string
  createdAt:  Date
}

function ensureSpace(doc: InstanceType<typeof PDFDocument>, needed: number) {
  if (doc.y + needed > PAGE_H - BOTTOM_M) doc.addPage()
}

function header(doc: InstanceType<typeof PDFDocument>, input: PdfInput) {
  const typeMeta = DOC_TYPES[input.type]

  // Yellow top bar
  doc.rect(0, 0, PAGE_W, 56).fill(YELLOW)

  // "less" wordmark
  doc.fontSize(18).font('Helvetica-Bold').fillColor(BRAND)
    .text('less', MARGIN, 18, { continued: true })
  doc.fontSize(9).font('Helvetica').fillColor('#5a3d00')
    .text(` · ${typeMeta.label}`, { continued: false })

  // School name right-aligned
  doc.fontSize(8).font('Helvetica').fillColor(BRAND)
    .text(input.schoolName, MARGIN, 38, { width: CONTENT_W, align: 'right' })

  // Dark subbar
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

  const textH = doc.heightOfString(text, { width: CONTENT_W - 16, fontSize: 8.5 }) + 12
  ensureSpace(doc, textH)

  const bodyY = doc.y
  doc.rect(MARGIN, bodyY, CONTENT_W, textH).fill(WHITE).stroke(BORDER)
  doc.fontSize(8.5).font('Helvetica').fillColor(DARK)
    .text(text, MARGIN + 8, bodyY + 6, { width: CONTENT_W - 16, lineGap: 1.5 })

  doc.y = bodyY + textH + 6
}

function renderGeneric(
  doc: InstanceType<typeof PDFDocument>,
  input: PdfInput
) {
  const { content, type } = input
  const meta = DOC_TYPES[type]

  // Split fields into info fields (text, select, date, number) and textarea fields
  const infoFields  = meta.fields.filter(f => f.type !== 'textarea')
  const blockFields = meta.fields.filter(f => f.type === 'textarea')

  if (infoFields.length > 0) {
    sectionTitle(doc, 'Identificação')
    infoFields.forEach((f, i) => {
      infoRow(doc, f.label, content[f.key] ?? '', i === infoFields.length - 1)
    })
    doc.y += 10
  }

  blockFields.forEach(f => {
    if (content[f.key]?.trim()) {
      textBlock(doc, f.label, content[f.key])
    }
  })
}

export function generatePdf(input: PdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true })
    const chunks: Buffer[] = []

    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end',  () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // First page
    header(doc, input)

    // Add page event for continuation pages
    doc.on('pageAdded', () => {
      miniHeader(doc, input)
    })

    renderGeneric(doc, input)
    footer(doc, input)

    doc.end()
  })
}
