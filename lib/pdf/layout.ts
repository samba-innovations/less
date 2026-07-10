/**
 * Layout do PDF: header minimalista com a logotipo do less (SVG),
 * mini-header em páginas seguintes e footer com paginação.
 *
 * Design minimalista — só preto/branco/cinzas. Sem faixas coloridas, sem
 * sub-barra escura. A identidade visual vem só da logotipo "less".
 */

import fs from 'fs'
import path from 'path'
import type PDFDocument from 'pdfkit'
import SVGtoPDF from 'svg-to-pdfkit'
import { DOC_TYPES, type DocType } from '../doc-types'
import {
  PAGE_W, PAGE_H, MARGIN_LEFT, MARGIN_RIGHT,
  CONTENT_W, COLORS, FONT, SIZE,
} from './theme'

type PDFDoc = InstanceType<typeof PDFDocument>

export type DocHeaderInfo = {
  type:       DocType
  title:      string
  schoolName: string
  authorName: string
  createdAt:  Date
}

// ── Cache do SVG da logo (lê do disco uma vez por processo) ─────────────────
let _logoSvg: string | null = null
function getLogoSvg(): string | null {
  if (_logoSvg !== null) return _logoSvg || null
  try {
    const file = path.join(process.cwd(), 'public', 'less-isotipo.svg')
    _logoSvg = fs.readFileSync(file, 'utf-8')
    return _logoSvg
  } catch {
    _logoSvg = ''
    return null
  }
}

// ── Posiciona a logo no PDF (largura fixa, altura proporcional) ─────────────
function placeLogo(doc: PDFDoc, x: number, y: number, width: number) {
  const svg = getLogoSvg()
  if (!svg) {
    // Fallback: texto "less" estilizado
    doc.fontSize(SIZE.brand).font(FONT.bold).fillColor(COLORS.fg)
      .text('less', x, y, { lineBreak: false })
    return
  }
  // SVG original tem viewBox 0 0 1713.61 492.85 → altura = width * 492.85/1713.61
  SVGtoPDF(doc, svg, x, y, { width, assumePt: true, preserveAspectRatio: 'xMinYMin meet' })
}

// ── Header completo (1ª página) ──────────────────────────────────────────────
export function fullHeader(doc: PDFDoc, info: DocHeaderInfo) {
  const typeMeta = DOC_TYPES[info.type]

  // Isotipo (quadrado 1080x1080 → uso 28pt)
  const logoW = 28
  const logoY = 38
  placeLogo(doc, MARGIN_LEFT, logoY, logoW)

  // Nome da escola à direita
  doc.fontSize(SIZE.small).font(FONT.regular).fillColor(COLORS.fgMuted)
    .text(info.schoolName, MARGIN_LEFT, 44, {
      width: CONTENT_W, align: 'right', lineBreak: false, ellipsis: true,
    })

  // Linha sutil abaixo do header
  const lineY = 72
  doc.save()
    .moveTo(MARGIN_LEFT, lineY).lineTo(PAGE_W - MARGIN_RIGHT, lineY)
    .lineWidth(0.4).strokeColor(COLORS.border).stroke().restore()

  // Tipo do documento como "tag" textual sutil abaixo da linha
  doc.fontSize(SIZE.tiny).font(FONT.bold).fillColor(COLORS.fgMuted)
    .text(typeMeta.label.toUpperCase(), MARGIN_LEFT, lineY + 6, {
      width: CONTENT_W, lineBreak: false, characterSpacing: 0.5,
    })

  // Reset estado do PDFKit pra defaults do corpo (evita herança ao paginar)
  doc.font(FONT.regular).fontSize(SIZE.body).fillColor(COLORS.fg).fillOpacity(1).strokeOpacity(1)
  doc.y = lineY + 28
}

// ── Mini-header (páginas 2+) ─────────────────────────────────────────────────
export function miniHeader(doc: PDFDoc, info: DocHeaderInfo) {
  const logoW = 18
  placeLogo(doc, MARGIN_LEFT, 32, logoW)

  doc.fontSize(SIZE.tiny).font(FONT.regular).fillColor(COLORS.fgMuted)
    .text(info.title, MARGIN_LEFT, 36, {
      width: CONTENT_W, align: 'right', lineBreak: false, ellipsis: true,
    })

  doc.save()
    .moveTo(MARGIN_LEFT, 56).lineTo(PAGE_W - MARGIN_RIGHT, 56)
    .lineWidth(0.3).strokeColor(COLORS.borderSoft).stroke().restore()

  // Reset estado do PDFKit pra defaults do corpo (essencial: text() em
  // auto-pagination continua usando este estado na nova página)
  doc.font(FONT.regular).fontSize(SIZE.body).fillColor(COLORS.fg).fillOpacity(1).strokeOpacity(1)
  doc.y = 72
}

// ── Footer (paginação + metadados) ──────────────────────────────────────────
// IMPORTANTE: o footer é desenhado em y = PAGE_H - 40 (fora da área "útil"
// definida por margins.bottom). PDFKit auto-pagina se text() tentar escrever
// além da margem inferior, criando páginas em branco. Por isso suspendemos
// temporariamente o bottom margin durante o footer.
export function drawFooter(doc: PDFDoc, info: DocHeaderInfo, pageNum: number, totalPages: number) {
  const y = PAGE_H - 40

  const originalBottom = doc.page.margins.bottom
  doc.page.margins.bottom = 0

  doc.save()
    .moveTo(MARGIN_LEFT, y - 4).lineTo(PAGE_W - MARGIN_RIGHT, y - 4)
    .lineWidth(0.3).strokeColor(COLORS.borderSoft).stroke().restore()

  const dateStr = info.createdAt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  doc.fontSize(SIZE.metadata).font(FONT.regular).fillColor(COLORS.fgFaint)
    .text(`${info.schoolName}  ·  ${dateStr}`, MARGIN_LEFT, y + 4, {
      width: CONTENT_W * 0.7, lineBreak: false, ellipsis: true,
    })

  doc.fontSize(SIZE.metadata).font(FONT.bold).fillColor(COLORS.fgMuted)
    .text(`${pageNum} / ${totalPages}`, MARGIN_LEFT, y + 4, {
      width: CONTENT_W, align: 'right', lineBreak: false,
    })

  doc.fontSize(6.5).font(FONT.regular).fillColor(COLORS.fgFaint)
    .text('documento gerado por less', MARGIN_LEFT, y + 16, {
      width: CONTENT_W, align: 'center', lineBreak: false,
    })

  doc.page.margins.bottom = originalBottom
}

export function paginate(doc: PDFDoc, info: DocHeaderInfo) {
  const range = doc.bufferedPageRange()
  const total = range.count
  for (let i = 0; i < total; i++) {
    doc.switchToPage(range.start + i)
    drawFooter(doc, info, i + 1, total)
  }
}
