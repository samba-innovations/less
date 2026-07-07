import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, WidthType, ShadingType, BorderStyle, VerticalAlign,
  LineRuleType,
} from 'docx'

// ── Units ────────────────────────────────────────────────────────────────────
const CM = 567 // 1 cm in twips

// ── ABNT NBR 6022 margins ────────────────────────────────────────────────────
const MARGIN = { top: 3 * CM, bottom: 2 * CM, left: 3 * CM, right: 2 * CM }

// ── Colors ───────────────────────────────────────────────────────────────────
const NAVY   = '0D2137'
const GOLD   = 'D4A017'
const WHITE  = 'FFFFFF'
const GRAY   = 'F1F3F5'
const NAVY_M = '1A3A58'
const GRAY_7 = '495057'

// ── Font & sizes (half-points) ───────────────────────────────────────────────
const FONT = 'Times New Roman'
const SZ12 = 24   // 12pt
const SZ14 = 28   // 14pt
const SZ18 = 36   // 18pt
const SZ10 = 20   // 10pt

// ── Line spacing ─────────────────────────────────────────────────────────────
const SINGLE = { line: 240, lineRule: LineRuleType.AUTO }
const HALF5  = { line: 360, lineRule: LineRuleType.AUTO }  // 1.5

// ─── Helpers ─────────────────────────────────────────────────────────────────

function noBorder() {
  return { style: BorderStyle.NONE, size: 0, color: WHITE }
}

function noBorders() {
  return { top: noBorder(), bottom: noBorder(), left: noBorder(), right: noBorder() }
}

function navyCell(text: string, size = SZ12, bold = false): TableCell {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text, font: FONT, size, bold, color: WHITE })],
      alignment: AlignmentType.CENTER,
    })],
    shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
    verticalAlign: VerticalAlign.CENTER,
    borders: noBorders(),
  })
}

function goldCell(): TableCell {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun('')] })],
    shading: { type: ShadingType.SOLID, color: GOLD, fill: GOLD },
    borders: noBorders(),
  })
}

function para(
  text: string,
  opts: {
    bold?: boolean; italic?: boolean; size?: number; color?: string;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType]; spacing?: typeof HALF5;
    indent?: { firstLine?: number; left?: number; right?: number; hanging?: number };
    before?: number; after?: number;
  } = {},
): Paragraph {
  return new Paragraph({
    children: [new TextRun({
      text,
      font: FONT,
      size: opts.size ?? SZ12,
      bold: opts.bold ?? false,
      italics: opts.italic ?? false,
      color: opts.color,
    })],
    alignment: opts.align ?? AlignmentType.JUSTIFIED,
    spacing: { before: opts.before ?? 0, after: opts.after ?? 0, ...(opts.spacing ?? HALF5) },
    indent: opts.indent,
  })
}

function gap(after = 120): Paragraph {
  return new Paragraph({ children: [new TextRun('')], spacing: { after } })
}

function sectionHeading(num: string, title: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: `${num}  ${title.toUpperCase()}`, font: FONT, size: SZ12, bold: true, color: NAVY_M })],
    spacing: { before: Math.round(0.7 * CM), after: Math.round(0.3 * CM), ...HALF5 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: GOLD } },
  })
}

function subheading(label: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: label, font: FONT, size: SZ12, bold: true })],
    spacing: { before: Math.round(0.4 * CM), after: Math.round(0.2 * CM), ...HALF5 },
  })
}

function bodyLines(text: string, firstLineIndent = true): Paragraph[] {
  return text.trim().split('\n').filter(Boolean).map(line =>
    para(line.trim(), {
      indent: firstLineIndent ? { firstLine: Math.round(1.25 * CM) } : undefined,
      spacing: HALF5, after: 0,
    })
  )
}

function refPara(ref: string): Paragraph {
  const trimmed = ref.trim()
  const dotIdx  = trimmed.search(/\.\s/)
  const first   = dotIdx > 0 ? trimmed.slice(0, dotIdx + 1) : trimmed
  const rest    = dotIdx > 0 ? trimmed.slice(dotIdx + 1)    : ''

  return new Paragraph({
    children: [
      new TextRun({ text: first, font: FONT, size: SZ12, bold: true }),
      ...(rest ? [new TextRun({ text: rest, font: FONT, size: SZ12 })] : []),
    ],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: Math.round(0.3 * CM), ...SINGLE },
    indent: { left: Math.round(1.25 * CM), hanging: Math.round(1.25 * CM) },
  })
}

// ─── Main export ──────────────────────────────────────────────────────────────

export interface ProjetoDocxInput {
  content: Record<string, string>
  userName: string
  createdAt?: string
}

export async function generateProjetoDocx(input: ProjetoDocxInput): Promise<Buffer> {
  const c = input.content

  const periodo = c.periodo?.trim() || (() => {
    const d = input.createdAt ? new Date(input.createdAt) : new Date()
    return (d.getMonth() + 1) <= 6
      ? `1º Semestre ${d.getFullYear()}`
      : `2º Semestre ${d.getFullYear()}`
  })()

  // ── Institutional header table ────────────────────────────────────────────
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: noBorder(), bottom: noBorder(), left: noBorder(), right: noBorder(), insideHorizontal: noBorder(), insideVertical: noBorder() },
    rows: [
      new TableRow({ children: [navyCell('Governo do Estado de São Paulo – Secretaria de Estado da Educação', SZ10)] }),
      new TableRow({ children: [navyCell('EE Prof. Christino Cabral', SZ18, true)] }),
      new TableRow({ children: [navyCell('Bauru – SP  ·  Escola de Ensino Integral', SZ10)] }),
    ],
  })

  // ── Gold accent line ──────────────────────────────────────────────────────
  const goldLine = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: noBorder(), bottom: noBorder(), left: noBorder(), right: noBorder(), insideHorizontal: noBorder(), insideVertical: noBorder() },
    rows: [new TableRow({
      height: { value: 90, rule: 'exact' as const },
      children: [goldCell()],
    })],
  })

  // ── App bar (samba paper · Projeto) ───────────────────────────────────────
  const appBar = new Paragraph({
    children: [
      new TextRun({ text: 'samba paper  ·  Projeto Científico', font: FONT, size: SZ10, color: GRAY_7 }),
    ],
    alignment: AlignmentType.RIGHT,
    spacing: { after: Math.round(0.4 * CM) },
    shading: { type: ShadingType.SOLID, color: GRAY, fill: GRAY },
  })

  // ── Title ─────────────────────────────────────────────────────────────────
  const titlePara = para(c.titulo?.trim() || 'Projeto de Pesquisa', {
    bold: true, size: 40, color: NAVY, align: AlignmentType.CENTER,
    before: Math.round(0.8 * CM), after: Math.round(0.2 * CM),
  })

  const children: (Paragraph | Table)[] = [
    headerTable,
    goldLine,
    appBar,
    titlePara,
  ]

  if (c.tema_sugerido?.trim()) {
    children.push(para(c.tema_sugerido.trim(), {
      italic: true, size: SZ12, color: GRAY_7, align: AlignmentType.CENTER, after: Math.round(0.2 * CM),
    }))
  }

  // Metadata strip
  const meta = [c.grande_area, c.subarea, c.linha_aplicacao, c.tipo_projeto].filter(Boolean).join('  ·  ')
  if (meta) {
    children.push(para(meta, { size: SZ10, color: GRAY_7, align: AlignmentType.CENTER, after: Math.round(0.2 * CM) }))
  }

  children.push(para(input.userName, { bold: true, align: AlignmentType.CENTER, after: Math.round(0.2 * CM) }))

  const escopo = [`Período: ${periodo}`].join('   |   ')
  children.push(para(escopo, { size: SZ10, color: GRAY_7, align: AlignmentType.CENTER, after: Math.round(0.6 * CM) }))

  // ── Abstract ──────────────────────────────────────────────────────────────
  if (c.resumo?.trim()) {
    children.push(para('RESUMO', {
      bold: true, size: SZ12, spacing: SINGLE,
      indent: { left: Math.round(4 * CM), right: Math.round(4 * CM) },
      after: Math.round(0.15 * CM),
    }))
    c.resumo.trim().split('\n').filter(Boolean).forEach(line => {
      children.push(para(line.trim(), {
        size: SZ12, spacing: SINGLE,
        indent: { left: Math.round(4 * CM), right: Math.round(4 * CM) },
        after: 0,
      }))
    })
    children.push(gap(Math.round(0.3 * CM)))
  }

  if (c.palavras_chave?.trim()) {
    children.push(new Paragraph({
      children: [
        new TextRun({ text: 'Palavras-chave: ', font: FONT, size: SZ12, bold: true }),
        new TextRun({ text: c.palavras_chave.trim(), font: FONT, size: SZ12 }),
      ],
      spacing: { before: 0, after: Math.round(0.8 * CM), ...SINGLE },
      indent: { left: Math.round(4 * CM) },
    }))
  }

  // ── Sections ──────────────────────────────────────────────────────────────

  if (c.problema?.trim()) {
    children.push(sectionHeading('1', 'Problema de Pesquisa'))
    children.push(...bodyLines(c.problema))
  }

  if (c.justificativa?.trim()) {
    children.push(sectionHeading('2', 'Justificativa'))
    children.push(...bodyLines(c.justificativa))
  }

  if (c.objetivo_geral?.trim() || c.objetivos_especificos?.trim()) {
    children.push(sectionHeading('3', 'Objetivos'))
    if (c.objetivo_geral?.trim()) {
      children.push(subheading('3.1  Objetivo Geral'))
      children.push(...bodyLines(c.objetivo_geral))
    }
    if (c.objetivos_especificos?.trim()) {
      children.push(subheading('3.2  Objetivos Específicos'))
      children.push(...bodyLines(c.objetivos_especificos, false))
    }
  }

  if (c.metodologia?.trim()) {
    children.push(sectionHeading('4', 'Metodologia'))
    children.push(...bodyLines(c.metodologia))
  }

  if (c.resultados?.trim()) {
    children.push(sectionHeading('5', 'Resultados Esperados'))
    children.push(...bodyLines(c.resultados))
  }

  if (c.impacto?.trim()) {
    children.push(sectionHeading('6', 'Impacto Esperado'))
    children.push(...bodyLines(c.impacto))
  }

  if (c.acao?.trim() || c.recursos?.trim()) {
    children.push(sectionHeading('7', 'Ação e Recursos'))
    if (c.acao?.trim()) {
      children.push(subheading('Ação Central'))
      children.push(...bodyLines(c.acao))
    }
    if (c.recursos?.trim()) {
      children.push(subheading('Recursos Previstos'))
      children.push(...bodyLines(c.recursos, false))
    }
  }

  if (c.referencias?.trim()) {
    children.push(sectionHeading('8', 'Referências'))
    c.referencias.trim().split('\n').filter(Boolean).forEach(ref => {
      children.push(refPara(ref))
    })
  }

  // ── Assemble ──────────────────────────────────────────────────────────────
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: MARGIN,
        },
      },
      children,
    }],
  })

  return Packer.toBuffer(doc) as unknown as Buffer
}
