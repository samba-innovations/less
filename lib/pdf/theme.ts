/**
 * Design tokens dos PDFs do less.
 *
 * Aplica ABNT seletiva (NBR 14724) nas medidas que importam pro look profissional
 * (margens, fonte, espaçamento) sem a parafernália de capa/folha de rosto/sumário —
 * documentos escolares operacionais não cabem isso. As medidas vêm em pontos PDF
 * (1pt = 1/72in; 1cm ≈ 28.35pt).
 */

import type PDFDocument from 'pdfkit'
import {
  PAGE_W as SHARED_PAGE_W, PAGE_H as SHARED_PAGE_H,
  MARGIN_TOP as SHARED_MARGIN_TOP, MARGIN_BOTTOM as SHARED_MARGIN_BOTTOM,
  MARGIN_INNER, MARGIN_OUTER,
  CONTENT_MARGIN_BOTTOM, BODY_BOTTOM_Y as SHARED_BODY_BOTTOM_Y,
  currentMargins, contentWidth,
} from '@pdf'
import { DOC_TYPES, type DocType } from '../doc-types'

type PDFDoc = InstanceType<typeof PDFDocument>

// ── Página A4 ────────────────────────────────────────────────────────────────
export const PAGE_W = SHARED_PAGE_W   // 21cm em pts
export const PAGE_H = SHARED_PAGE_H   // 29.7cm em pts

// ── Margens ABNT espelhadas ──────────────────────────────────────────────────
// Superior 3cm, inferior 2cm, interna (lombada) 3cm, externa 2cm — a interna
// troca de lado a cada página, como o "espelhar margens" do Word. Por isso a
// posição horizontal do corpo depende da página: use cx(doc)/cw(doc).
export const MARGIN_TOP    = SHARED_MARGIN_TOP
export const MARGIN_BOTTOM = SHARED_MARGIN_BOTTOM
export const MARGIN_INNER_ = MARGIN_INNER
export const MARGIN_OUTER_ = MARGIN_OUTER

/** X inicial do corpo na página atual (respeita o espelho). */
export const cx = (doc: PDFDoc): number => currentMargins(doc).left
/** Largura útil do corpo na página atual. */
export const cw = (doc: PDFDoc): number => contentWidth(doc)

// O Y onde o corpo começa vem do próprio header (renderFullHeader /
// renderMiniHeader devolvem essa posição) — não há mais constante fixa.

// Footer institucional (shared/pdf): 18mm de bloco + 2cm de margem inferior.
export const FOOTER_TOP_Y  = PAGE_H - CONTENT_MARGIN_BOTTOM
export const BODY_BOTTOM_Y = SHARED_BODY_BOTTOM_Y - 6   // 6pt de respiro

// PDFKit margins — para que o auto-pagination respeite header/footer
export const PDF_MARGIN_TOP    = MARGIN_TOP
export const PDF_MARGIN_BOTTOM = CONTENT_MARGIN_BOTTOM

// ── Paleta ───────────────────────────────────────────────────────────────────
export const COLORS = {
  brand:        '#1a0f00',   // marrom escuro do "less"
  brandSoft:    '#5a3d00',   // marrom secundário (subtítulos)
  yellow:       '#fce375',   // amarelo da faixa
  yellowDeep:   '#e5b831',   // amarelo mais saturado pra acentos
  dark:         '#1a1a2e',   // sub-barra
  fg:           '#0f172a',   // texto principal
  fgMuted:      '#475569',   // texto secundário
  fgFaint:      '#94a3b8',   // metadata
  border:       '#d1d5db',
  borderSoft:   '#e5e7eb',
  bg:           '#ffffff',
  bgSoft:       '#f8fafc',
  bgRow:        '#f3f4f6',
  divider:      '#cbd5e1',
  // status / ênfase
  emerald:      '#065f46',
  rose:         '#9f1239',
  amber:        '#b45309',
  blue:         '#1e40af',
} as const

// ── Tipografia ABNT (Times New Roman via Base14 do PDF) ──────────────────────
export const FONT = {
  regular: 'Times-Roman',
  bold:    'Times-Bold',
  italic:  'Times-Italic',
} as const

export const SIZE = {
  bodyBig:   12,   // corpo ABNT
  body:      12,   // corpo padrão — ABNT: 12pt
  small:     10,
  tiny:      8,
  metadata:  7.5,
  title:     16,   // título principal do doc
  h1:        14,   // seções "1 Algo"
  h2:        12,   // subseções "1.1 Algo"
  brand:     18,   // "less" no header
} as const

export const LINE_HEIGHT = {
  tight:  1.2,
  normal: 1.35,
  abnt:   1.35,   // entrelinha do corpo
} as const

// ── Espaçamentos ─────────────────────────────────────────────────────────────
export const SPACE = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 22,
  xl: 32,
} as const

// ── Pega cor de acento por tipo de documento ──────────────────────────────────
export function accentFor(type: DocType): string {
  return DOC_TYPES[type]?.color ?? COLORS.brand
}

// ── Util: pts → cm pra cálculos ──────────────────────────────────────────────
export const cmToPt = (cm: number) => cm * 28.3464567
