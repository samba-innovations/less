/**
 * Primitivas de renderização compartilhadas por todos os tipos de PDF do less.
 *
 * Cada função aceita o `doc` do PDFKit e desenha algo. Mantém o cursor Y consistente
 * (sempre avança `doc.y` no final) e respeita as margens do theme.
 */

import type PDFDocument from 'pdfkit'
import {
  cw, cx, BODY_BOTTOM_Y,
  COLORS, FONT, SIZE, LINE_HEIGHT, SPACE,
} from './theme'
import { addMirroredPage } from '@pdf'

type PDFDoc = InstanceType<typeof PDFDocument>

// ── Quebra de página automática se precisar de espaço ────────────────────────
export function ensureSpace(doc: PDFDoc, needed: number) {
  if (doc.y + needed > BODY_BOTTOM_Y) addMirroredPage(doc)
}

// ── Espaçamento vertical ─────────────────────────────────────────────────────
export function spacer(doc: PDFDoc, amount: keyof typeof SPACE | number = 'md') {
  doc.y += typeof amount === 'number' ? amount : SPACE[amount]
}

// ── Linha divisória sutil ────────────────────────────────────────────────────
export function divider(doc: PDFDoc, color: string = COLORS.borderSoft) {
  ensureSpace(doc, 8)
  doc.save()
    .moveTo(cx(doc), doc.y)
    .lineTo(cx(doc) + cw(doc), doc.y)
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
    .text(title, cx(doc), doc.y, { width: cw(doc), lineGap: 2 })
  if (subtitle) {
    doc.y += 2
    doc.font(FONT.regular).fontSize(SIZE.small).fillColor(COLORS.fgMuted)
      .text(subtitle, cx(doc), doc.y, { width: cw(doc) })
  }
  doc.y += SPACE.md
}

// ── Cabeçalho de seção numerada (estilo "1 INTRODUÇÃO" ABNT) ─────────────────
/**
 * Espaço mínimo que um título precisa ter ABAIXO dele para não ficar órfão.
 *
 * O `ensureSpace` só media a altura do próprio título, então ele cabia no pé da
 * página e o conteúdo ia para a seguinte — "CONTEÚDO" numa folha e a tabela na
 * outra. Título é sempre seguido de algo; o que vale é caber o título mais o
 * começo do que vem depois.
 *
 * Os valores cobrem o menor bloco real de cada nível: uma tabela com cabeçalho
 * e uma linha (~55pt) para a seção, e três linhas de texto (~45pt) para a
 * subseção.
 */
const RESERVA_SECAO    = 28 + 55
const RESERVA_SUBSECAO = 24 + 45

export function sectionTitle(doc: PDFDoc, label: string, accentColor?: string) {
  ensureSpace(doc, RESERVA_SECAO)
  doc.y += SPACE.xs
  doc.font(FONT.bold).fontSize(SIZE.h1).fillColor(COLORS.fg)
    .text(label.toUpperCase(), cx(doc), doc.y, { width: cw(doc), lineBreak: false })
  if (accentColor) {
    const y = doc.y + 2
    doc.save()
      .rect(cx(doc), y, 32, 2)
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
  ensureSpace(doc, RESERVA_SUBSECAO)
  doc.y += SPACE.xs
  doc.font(FONT.bold).fontSize(SIZE.h2).fillColor(COLORS.fg)
    .text(label, cx(doc), doc.y, { width: cw(doc) })
  doc.y += SPACE.xs
}

// ── Parágrafo de corpo — Times 12, entrelinha 1,35, justificado ──────────────
export function paragraph(doc: PDFDoc, text: string, opts: { abnt?: boolean; small?: boolean } = {}) {
  if (!text?.trim()) return
  const size = opts.small ? SIZE.small : SIZE.body
  ensureSpace(doc, size * 2)
  doc.font(FONT.regular).fontSize(size).fillColor(COLORS.fg)
  // lineGap é o espaço EXTRA: desconta a altura natural da linha da fonte.
  const lineGap = Math.max(0, size * LINE_HEIGHT.abnt - doc.currentLineHeight(false))
  doc.text(text, cx(doc), doc.y, {
    width:   cw(doc),
    align:   opts.abnt === false ? 'left' : 'justify',
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
      .text(label.toUpperCase(), cx(doc), startY, { width: labelW })
    doc.font(FONT.regular).fontSize(SIZE.body).fillColor(COLORS.fg)
      .text(value, cx(doc) + labelW + 8, startY, { width: cw(doc) - labelW - 8 })
    doc.y = Math.max(doc.y, startY + 16)
    doc.y += SPACE.xs
  } else {
    ensureSpace(doc, 32)
    doc.font(FONT.bold).fontSize(SIZE.tiny).fillColor(COLORS.fgMuted)
      .text(label.toUpperCase(), cx(doc), doc.y, { width: cw(doc), characterSpacing: 0.4 })
    doc.y += 2
    doc.font(FONT.regular).fontSize(SIZE.body).fillColor(COLORS.fg)
      .text(value, cx(doc), doc.y, { width: cw(doc) })
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
    .rect(cx(doc), startY, cw(doc), endY - startY)
    .lineWidth(0.75)
    .strokeColor(COLORS.borderSoft)
    .stroke()
  if (opts.accent) {
    doc.rect(cx(doc), startY, 3, endY - startY).fill(opts.accent)
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
    const bulletX = cx(doc) + 4
    const textX   = cx(doc) + 14
    const y = doc.y
    doc.text('•', bulletX, y)
    doc.text(item, textX, y, {
      width: cw(doc) - 18,
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
  const widths = weights.map(w => (cw(doc) * w) / totalW)
  const rowH = 22

  ensureSpace(doc, rowH * 2)

  // Header
  doc.save().rect(cx(doc), doc.y, cw(doc), rowH).fill(COLORS.bgSoft).restore()
  let x = cx(doc)
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
      .moveTo(cx(doc), doc.y)
      .lineTo(cx(doc) + cw(doc), doc.y)
      .lineWidth(0.4).strokeColor(COLORS.borderSoft)
      .stroke()
      .restore()
    let colX = cx(doc)
    for (let i = 0; i < row.length; i++) {
      doc.font(FONT.regular).fontSize(SIZE.small).fillColor(COLORS.fg)
        .text(row[i] ?? '', colX + 8, doc.y + 6, { width: widths[i] - 16, ellipsis: true })
      colX += widths[i]
    }
    doc.y += rowH
  }
  doc.save()
    .moveTo(cx(doc), doc.y)
    .lineTo(cx(doc) + cw(doc), doc.y)
    .lineWidth(0.4).strokeColor(COLORS.borderSoft)
    .stroke()
    .restore()
  doc.y += SPACE.md
}

// ── Tabela de dados — célula que quebra linha e cresce a altura ──────────────
// A `lightTable` acima corta o texto com `ellipsis` numa linha de 22pt fixos:
// serve para listas curtas (código, número), não para conteúdo redigido. Aqui a
// altura da linha sai da célula mais alta, e a tabela quebra de página
// repetindo o cabeçalho.
const CELULA_PAD_X = 6
const CELULA_PAD_Y = 5

export function dataTable(
  doc: PDFDoc,
  headers: string[],
  rows: string[][],
  opts: { colWeights?: number[]; size?: number } = {},
) {
  if (rows.length === 0) return
  const size    = opts.size ?? SIZE.small
  const weights = opts.colWeights ?? headers.map(() => 1)
  const total   = weights.reduce((a, b) => a + b, 0)
  const widths  = weights.map(w => (cw(doc) * w) / total)

  function alturaDaLinha(cells: string[], font: string): number {
    doc.font(font).fontSize(size)
    let maior = 0
    for (let i = 0; i < widths.length; i++) {
      // String vazia mede 0 e achataria a linha; o espaço garante uma linha.
      const h = doc.heightOfString(cells[i]?.trim() || ' ', { width: widths[i] - CELULA_PAD_X * 2 })
      if (h > maior) maior = h
    }
    return maior + CELULA_PAD_Y * 2
  }

  function desenharLinha(cells: string[], font: string, altura: number, fundo?: string) {
    const y  = doc.y
    const x0 = cx(doc)
    if (fundo) doc.save().rect(x0, y, cw(doc), altura).fill(fundo).restore()

    doc.save().lineWidth(0.5).strokeColor(COLORS.border)
    doc.rect(x0, y, cw(doc), altura).stroke()
    let xv = x0
    for (let i = 0; i < widths.length - 1; i++) {
      xv += widths[i]
      doc.moveTo(xv, y).lineTo(xv, y + altura).stroke()
    }
    doc.restore()

    let x = x0
    for (let i = 0; i < widths.length; i++) {
      doc.font(font).fontSize(size).fillColor(COLORS.fg)
        .text(cells[i] ?? '', x + CELULA_PAD_X, y + CELULA_PAD_Y, { width: widths[i] - CELULA_PAD_X * 2 })
      x += widths[i]
    }
    // O texto de cada célula mexeu no cursor; a linha manda.
    doc.y = y + altura
  }

  const alturaCabecalho = alturaDaLinha(headers, FONT.bold)
  // Cabeçalho sozinho no pé da página é pior que quebrar antes. Mede a primeira
  // linha de verdade em vez de chutar uma folga: linha com texto longo ocupa
  // bem mais que a altura padrão.
  ensureSpace(doc, alturaCabecalho + alturaDaLinha(rows[0], FONT.regular))
  desenharLinha(headers, FONT.bold, alturaCabecalho, COLORS.bgSoft)

  for (const row of rows) {
    const altura = alturaDaLinha(row, FONT.regular)
    if (doc.y + altura > BODY_BOTTOM_Y) {
      addMirroredPage(doc)
      desenharLinha(headers, FONT.bold, alturaDaLinha(headers, FONT.bold), COLORS.bgSoft)
    }
    desenharLinha(row, FONT.regular, altura)
  }
  doc.y += SPACE.md
}

// ── Referências no padrão ABNT (NBR 6023) ────────────────────────────────────
// Uma entrada por linha do campo. O destaque tipográfico vai no TÍTULO, em
// negrito; subtítulo (depois dos dois-pontos) não recebe destaque, e expressões
// latinas ("In:", "et al.", "apud") vão em itálico. Alinhamento à esquerda, sem
// justificar, com um respiro entre as entradas.

const AUTOR_INSTITUCIONAL =
  /^(minist[ée]rio|secretaria|conselho|departamento|instituto|funda[çc][ãa]o|universidade|comiss[ãa]o|coordenadoria|ag[êe]ncia|diretoria)\b/i

/** Elemento de autoria: começa em CAIXA ALTA ("LUCKESI", "BRASIL") ou é órgão. */
function ehElementoDeAutoria(seg: string): boolean {
  const s = seg.trim()
  if (!s) return false
  if (AUTOR_INSTITUCIONAL.test(s)) return true
  const primeira = s.split(/[\s,(.]/)[0] ?? ''
  const letras = primeira.replace(/[^A-Za-zÀ-ÿ]/g, '')
  return letras.length >= 2 && letras === letras.toUpperCase()
}

export function separarReferenciaAbnt(entrada: string): { autor: string; titulo: string; resto: string } {
  // Mantém o ponto colado em cada parte: "9.394" não quebra porque não há espaço.
  const partes = entrada.split(/(?<=\.)\s+/)
  let i = 0
  while (i < partes.length && ehElementoDeAutoria(partes[i])) i++
  // Sem autoria reconhecida, ou nada sobrando para ser título: não arrisca.
  if (i === 0 || i >= partes.length) return { autor: entrada, titulo: '', resto: '' }

  const autor = partes.slice(0, i).join(' ') + ' '
  const bruto = partes[i]
  const cauda = partes.slice(i + 1).join(' ')
  const corte = bruto.indexOf(':')
  const titulo = corte > 0 ? bruto.slice(0, corte) : bruto.replace(/\.\s*$/, '')
  const depois = corte > 0 ? bruto.slice(corte) : '.'
  return { autor, titulo, resto: `${depois} ${cauda}`.trimEnd() }
}

export function referenciasAbnt(doc: PDFDoc, texto: string) {
  const entradas = texto.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const size = SIZE.small

  for (const entrada of entradas) {
    ensureSpace(doc, size * 3)
    const { autor, titulo, resto } = separarReferenciaAbnt(entrada)
    const comum = { width: cw(doc), align: 'left' as const, lineGap: 0 }

    doc.fillColor(COLORS.fg).fontSize(size)
    if (!titulo) {
      doc.font(FONT.regular).text(autor, cx(doc), doc.y, comum)
    } else {
      doc.font(FONT.regular).text(autor, cx(doc), doc.y, { ...comum, continued: true })
      doc.font(FONT.bold).text(titulo, { ...comum, continued: true })
      escreverRestoComLatim(doc, resto, comum, size)
    }
    doc.y += SPACE.xs
  }
  doc.y += SPACE.xs
}

/** Escreve a cauda da referência pondo em itálico as expressões latinas. */
function escreverRestoComLatim(
  doc: PDFDoc,
  resto: string,
  comum: { width: number; align: 'left'; lineGap: number },
  size: number,
) {
  const pedacos = resto.split(/(\bIn:|\bet al\.|\bapud\b)/g).filter(p => p !== '')
  if (pedacos.length <= 1) {
    doc.font(FONT.regular).fontSize(size).text(resto, { ...comum, continued: false })
    return
  }
  pedacos.forEach((p, idx) => {
    const latim = /^(In:|et al\.|apud)$/.test(p)
    doc.font(latim ? FONT.italic : FONT.regular).fontSize(size)
      .text(p, { ...comum, continued: idx < pedacos.length - 1 })
  })
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
    addMirroredPage(doc)
  }
  // Move pro fundo da página (não deixa espaço no meio entre conteúdo e assinatura
  // crescer demais: usa max para não sobrescrever conteúdo se ele chegou perto).
  doc.y = Math.max(doc.y + SPACE.md, targetY)

  const startX = cx(doc) + (cw(doc) - width) / 2
  doc.save()
    .moveTo(startX, doc.y)
    .lineTo(startX + width, doc.y)
    .lineWidth(0.6).strokeColor(COLORS.fg)
    .stroke()
    .restore()
  doc.y += 4
  doc.font(FONT.regular).fontSize(SIZE.small).fillColor(COLORS.fgMuted)
    .text(label, cx(doc), doc.y, { width: cw(doc), align: 'center', lineBreak: false })
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
