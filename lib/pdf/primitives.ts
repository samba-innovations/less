/**
 * Primitivas de renderização compartilhadas por todos os tipos de PDF do less.
 *
 * Cada função aceita o `doc` do PDFKit e desenha algo. Mantém o cursor Y consistente
 * (sempre avança `doc.y` no final) e respeita as margens do theme.
 */

import type PDFDocument from 'pdfkit'
import {
  CONTENT_W, CONTENT_X, BODY_BOTTOM_Y,
  COLORS, FONT, SIZE, LINE_HEIGHT, SPACE,
} from './theme'

type PDFDoc = InstanceType<typeof PDFDocument>

// ── Quebra de página automática se precisar de espaço ────────────────────────
export function ensureSpace(doc: PDFDoc, needed: number) {
  if (doc.y + needed > BODY_BOTTOM_Y) doc.addPage()
}

// ── Espaçamento vertical ─────────────────────────────────────────────────────
export function spacer(doc: PDFDoc, amount: keyof typeof SPACE | number = 'md') {
  doc.y += typeof amount === 'number' ? amount : SPACE[amount]
}

// ── Linha divisória sutil ────────────────────────────────────────────────────
export function divider(doc: PDFDoc, color: string = COLORS.borderSoft) {
  ensureSpace(doc, 8)
  doc.save()
    .moveTo(CONTENT_X, doc.y)
    .lineTo(CONTENT_X + CONTENT_W, doc.y)
    .lineWidth(0.5)
    .strokeColor(color)
    .stroke()
    .restore()
  doc.y += 6
}

// ── Título grande do documento (logo após o header) ──────────────────────────
export function docTitle(doc: PDFDoc, title: string, subtitle?: string) {
  ensureSpace(doc, 40)
  doc.font(FONT.bold).fontSize(SIZE.title).fillColor(COLORS.fg)
    .text(title, CONTENT_X, doc.y, { width: CONTENT_W, lineGap: 2 })
  if (subtitle) {
    doc.y += 2
    doc.font(FONT.regular).fontSize(SIZE.small).fillColor(COLORS.fgMuted)
      .text(subtitle, CONTENT_X, doc.y, { width: CONTENT_W })
  }
  doc.y += SPACE.md
}

// ── Cabeçalho de seção numerada (estilo "1 INTRODUÇÃO" ABNT) ─────────────────
export function sectionTitle(doc: PDFDoc, label: string, accentColor?: string) {
  ensureSpace(doc, 28)
  doc.y += SPACE.xs
  doc.font(FONT.bold).fontSize(SIZE.h1).fillColor(COLORS.fg)
    .text(label.toUpperCase(), CONTENT_X, doc.y, { width: CONTENT_W, lineBreak: false })
  if (accentColor) {
    const y = doc.y + 2
    doc.save()
      .rect(CONTENT_X, y, 32, 2)
      .fill(accentColor)
      .restore()
    doc.y += 6
  } else {
    doc.y += 2
  }
  doc.y += SPACE.xs
}

// ── Subtítulo (estilo "1.1 Algo") ────────────────────────────────────────────
export function subSectionTitle(doc: PDFDoc, label: string) {
  ensureSpace(doc, 24)
  doc.y += SPACE.xs
  doc.font(FONT.bold).fontSize(SIZE.h2).fillColor(COLORS.fg)
    .text(label, CONTENT_X, doc.y, { width: CONTENT_W })
  doc.y += SPACE.xs
}

// ── Parágrafo de corpo com espaçamento ABNT 1.5 ──────────────────────────────
export function paragraph(doc: PDFDoc, text: string, opts: { abnt?: boolean; small?: boolean } = {}) {
  if (!text?.trim()) return
  const lineGap = opts.abnt
    ? (SIZE.body * LINE_HEIGHT.abnt - SIZE.body)
    : (SIZE.body * LINE_HEIGHT.normal - SIZE.body)
  const size = opts.small ? SIZE.small : SIZE.body
  ensureSpace(doc, size * 2)
  doc.font(FONT.regular).fontSize(size).fillColor(COLORS.fg)
    .text(text, CONTENT_X, doc.y, {
      width:   CONTENT_W,
      align:   opts.abnt ? 'justify' : 'left',
      lineGap,
    })
  doc.y += SPACE.sm
}

// ── Linha label: valor (key/value pair) ──────────────────────────────────────
export function kv(doc: PDFDoc, label: string, value: string, opts: { inline?: boolean; labelWidth?: number } = {}) {
  if (!value?.trim()) return
  if (opts.inline) {
    ensureSpace(doc, 18)
    const labelW = opts.labelWidth ?? 110
    const startY = doc.y
    doc.font(FONT.bold).fontSize(SIZE.small).fillColor(COLORS.fgMuted)
      .text(label.toUpperCase(), CONTENT_X, startY, { width: labelW })
    doc.font(FONT.regular).fontSize(SIZE.body).fillColor(COLORS.fg)
      .text(value, CONTENT_X + labelW + 8, startY, { width: CONTENT_W - labelW - 8 })
    doc.y = Math.max(doc.y, startY + 16)
    doc.y += SPACE.xs
  } else {
    ensureSpace(doc, 32)
    doc.font(FONT.bold).fontSize(SIZE.tiny).fillColor(COLORS.fgMuted)
      .text(label.toUpperCase(), CONTENT_X, doc.y, { width: CONTENT_W, characterSpacing: 0.4 })
    doc.y += 2
    doc.font(FONT.regular).fontSize(SIZE.body).fillColor(COLORS.fg)
      .text(value, CONTENT_X, doc.y, { width: CONTENT_W })
    doc.y += SPACE.sm
  }
}

// ── Card destacado (caixa com borda + conteúdo) ──────────────────────────────
export function card(
  doc: PDFDoc,
  draw: (innerY: number) => void,
  opts: { accent?: string; padding?: number } = {},
) {
  const padding = opts.padding ?? 12
  const startY = doc.y
  ensureSpace(doc, 40)
  // medimos draw mockando — abordagem simples: renderiza, depois desenha a borda por trás.
  // PDFKit não permite "desenhar atrás" facilmente, então renderiza a borda DEPOIS
  // que sabemos a altura final.
  doc.y = startY + padding
  draw(doc.y)
  const endY = doc.y + padding
  doc.save()
    .rect(CONTENT_X, startY, CONTENT_W, endY - startY)
    .lineWidth(0.75)
    .strokeColor(COLORS.borderSoft)
    .stroke()
  if (opts.accent) {
    doc.rect(CONTENT_X, startY, 3, endY - startY).fill(opts.accent)
  }
  doc.restore()
  doc.y = endY + SPACE.sm
}

// ── Bullet list ──────────────────────────────────────────────────────────────
export function bulletList(doc: PDFDoc, items: string[]) {
  for (const item of items) {
    if (!item.trim()) continue
    ensureSpace(doc, SIZE.body * 2)
    doc.font(FONT.regular).fontSize(SIZE.body).fillColor(COLORS.fg)
    const bulletX = CONTENT_X + 4
    const textX   = CONTENT_X + 14
    const y = doc.y
    doc.text('•', bulletX, y)
    doc.text(item, textX, y, {
      width: CONTENT_W - 18,
      align: 'left',
      lineGap: SIZE.body * (LINE_HEIGHT.normal - 1),
    })
    doc.y += 4
  }
  doc.y += SPACE.xs
}

// ── Tabela leve (sem grid pesado — só linhas horizontais) ────────────────────
export function lightTable(
  doc: PDFDoc,
  headers: string[],
  rows: string[][],
  colWeights?: number[],
) {
  if (rows.length === 0) return
  const weights = colWeights ?? headers.map(() => 1)
  const totalW = weights.reduce((a, b) => a + b, 0)
  const widths = weights.map(w => (CONTENT_W * w) / totalW)
  const rowH = 22

  ensureSpace(doc, rowH * 2)

  // Header
  doc.save().rect(CONTENT_X, doc.y, CONTENT_W, rowH).fill(COLORS.bgSoft).restore()
  let x = CONTENT_X
  for (let i = 0; i < headers.length; i++) {
    doc.font(FONT.bold).fontSize(SIZE.small).fillColor(COLORS.fg)
      .text(headers[i], x + 8, doc.y + 7, { width: widths[i] - 16, ellipsis: true })
    x += widths[i]
  }
  doc.y += rowH

  // Rows
  for (const row of rows) {
    ensureSpace(doc, rowH)
    doc.save()
      .moveTo(CONTENT_X, doc.y)
      .lineTo(CONTENT_X + CONTENT_W, doc.y)
      .lineWidth(0.4).strokeColor(COLORS.borderSoft)
      .stroke()
      .restore()
    let cx = CONTENT_X
    for (let i = 0; i < row.length; i++) {
      doc.font(FONT.regular).fontSize(SIZE.small).fillColor(COLORS.fg)
        .text(row[i] ?? '', cx + 8, doc.y + 6, { width: widths[i] - 16, ellipsis: true })
      cx += widths[i]
    }
    doc.y += rowH
  }
  doc.save()
    .moveTo(CONTENT_X, doc.y)
    .lineTo(CONTENT_X + CONTENT_W, doc.y)
    .lineWidth(0.4).strokeColor(COLORS.borderSoft)
    .stroke()
    .restore()
  doc.y += SPACE.md
}

// ── Linha de assinatura — ancorada no rodapé da última página ────────────────
// Não flui com o conteúdo: posiciona absoluta perto do bottom. Evita
// que a assinatura caia sozinha numa página quase vazia se o conteúdo
// terminar 50pt antes do BODY_BOTTOM_Y.
export function signatureLine(doc: PDFDoc, label: string, opts: { width?: number } = {}) {
  const width = opts.width ?? 260
  const SIG_BLOCK_H = 30   // linha + label + folga
  const targetY = BODY_BOTTOM_Y - SIG_BLOCK_H

  // Se o conteúdo já passou da posição alvo, pagina antes (assinatura na nova pág)
  if (doc.y > targetY - 10) {
    doc.addPage()
  }
  // Move pro fundo da página (não deixa espaço no meio entre conteúdo e assinatura
  // crescer demais: usa max para não sobrescrever conteúdo se ele chegou perto).
  doc.y = Math.max(doc.y + SPACE.md, targetY)

  const startX = CONTENT_X + (CONTENT_W - width) / 2
  doc.save()
    .moveTo(startX, doc.y)
    .lineTo(startX + width, doc.y)
    .lineWidth(0.6).strokeColor(COLORS.fg)
    .stroke()
    .restore()
  doc.y += 4
  doc.font(FONT.regular).fontSize(SIZE.small).fillColor(COLORS.fgMuted)
    .text(label, CONTENT_X, doc.y, { width: CONTENT_W, align: 'center', lineBreak: false })
}

// ── Bloco de chip (tag) ──────────────────────────────────────────────────────
export function chip(doc: PDFDoc, text: string, x: number, y: number, color: string = COLORS.brand): { w: number; h: number } {
  const padX = 7, padY = 3
  doc.font(FONT.bold).fontSize(SIZE.tiny)
  const textW = doc.widthOfString(text)
  const w = textW + padX * 2
  const h = SIZE.tiny + padY * 2
  doc.save()
    .roundedRect(x, y, w, h, h / 2)
    .fillColor(color).fillOpacity(0.10).fill()
    .roundedRect(x, y, w, h, h / 2)
    .lineWidth(0.6).strokeColor(color).strokeOpacity(0.4).stroke()
    .restore()
  doc.fillColor(color).fillOpacity(1)
    .text(text.toUpperCase(), x + padX, y + padY, { lineBreak: false })
  doc.fillColor(COLORS.fg) // reset
  return { w, h }
}
