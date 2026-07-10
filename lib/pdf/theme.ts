/**
 * Design tokens dos PDFs do less.
 *
 * Aplica ABNT seletiva (NBR 14724) nas medidas que importam pro look profissional
 * (margens, fonte, espaçamento) sem a parafernália de capa/folha de rosto/sumário —
 * documentos escolares operacionais não cabem isso. As medidas vêm em pontos PDF
 * (1pt = 1/72in; 1cm ≈ 28.35pt).
 */

import { DOC_TYPES, type DocType } from '../doc-types'

// ── Página A4 ────────────────────────────────────────────────────────────────
export const PAGE_W = 595.28   // 21cm em pts
export const PAGE_H = 841.89   // 29.7cm em pts

// ── Margens ABNT (sup/esq 3cm, inf/dir 2cm) ──────────────────────────────────
export const MARGIN_TOP    = 85   // 3cm
export const MARGIN_LEFT   = 85   // 3cm
export const MARGIN_RIGHT  = 57   // 2cm
export const MARGIN_BOTTOM = 57   // 2cm

export const CONTENT_W = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT
export const CONTENT_X = MARGIN_LEFT

// Header (minimalista)
export const BODY_TOP_Y = 100   // logo + linha + tag → corpo começa aqui na pág 1
export const MINI_TOP_Y = 72    // miniHeader (págs 2+) → corpo começa aqui

// Footer (linha + paginação + "gerado por less")
export const FOOTER_TOP_Y  = PAGE_H - 40        // onde a linha do footer é desenhada
export const BODY_BOTTOM_Y = FOOTER_TOP_Y - 8   // body deve terminar antes disso

// PDFKit margins — para que o auto-pagination respeite header/footer
export const PDF_MARGIN_TOP    = MINI_TOP_Y                    // 72 (págs 2+ resume aqui)
export const PDF_MARGIN_BOTTOM = PAGE_H - BODY_BOTTOM_Y        // ≈ 48

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

// ── Tipografia ABNT (Helvetica do PDFKit ~ Arial) ────────────────────────────
export const FONT = {
  regular: 'Helvetica',
  bold:    'Helvetica-Bold',
  italic:  'Helvetica-Oblique',
} as const

export const SIZE = {
  bodyBig:   12,   // corpo ABNT
  body:      11,   // corpo padrão (compacta um pouco)
  small:     9.5,
  tiny:      8,
  metadata:  7.5,
  title:     20,   // título principal do doc
  h1:        14,   // seções "1 Algo"
  h2:        12,   // subseções "1.1 Algo"
  brand:     18,   // "less" no header
} as const

export const LINE_HEIGHT = {
  tight:  1.2,
  normal: 1.4,
  abnt:   1.5,   // 1.5 ABNT no corpo
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
