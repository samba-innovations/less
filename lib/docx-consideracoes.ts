import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, WidthType, ShadingType, BorderStyle, VerticalAlign,
  LineRuleType,
} from 'docx'

const CM     = 567
const MARGIN = { top: 3 * CM, bottom: 2 * CM, left: 3 * CM, right: 2 * CM }

const NAVY    = '0D2137'
const NAVY_M  = '1A3A58'
const WHITE   = 'FFFFFF'
const GOLD    = 'D4A017'
const GREEN_BG = 'C6EFCE'
const GREEN_FG = '276221'
const RED_BG   = 'FFC7CE'
const RED_FG   = '9C0006'
const BLUE_BG  = 'DDEEFF'
const BLUE_FG  = '1F3864'

const FONT = 'Times New Roman'
const SZ12 = 24
const SZ11 = 22
const SZ10 = 20
const SZ14 = 28

const SINGLE = { line: 240, lineRule: LineRuleType.AUTO }

function noBorder() { return { style: BorderStyle.NONE, size: 0, color: WHITE } }
function thinBorder(color = '999999') { return { style: BorderStyle.SINGLE, size: 4, color } }
function thickBorder(color = NAVY_M)  { return { style: BorderStyle.SINGLE, size: 8, color } }

function navyCell(text: string, width: number): TableCell {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text, font: FONT, size: SZ10, bold: true, color: WHITE })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 60 },
    })],
    shading: { type: ShadingType.SOLID, color: NAVY_M, fill: NAVY_M },
    verticalAlign: VerticalAlign.CENTER,
    width: { size: width, type: WidthType.DXA },
    borders: { top: thickBorder(), bottom: thickBorder(), left: thinBorder(WHITE), right: thinBorder(WHITE) },
  })
}

function dataCell(text: string, width: number, shade?: { fill: string; color: string }, align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT): TableCell {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text: text || '—', font: FONT, size: SZ10, color: shade?.color ?? '212529' })],
      alignment: align,
      spacing: { before: 60, after: 60 },
    })],
    shading: shade
      ? { type: ShadingType.SOLID, color: shade.fill, fill: shade.fill }
      : { type: ShadingType.SOLID, color: 'FFFFFF', fill: 'FFFFFF' },
    verticalAlign: VerticalAlign.CENTER,
    width: { size: width, type: WidthType.DXA },
    borders: { top: thinBorder(), bottom: thinBorder(), left: thinBorder(), right: thinBorder() },
  })
}

function gap(after = 120): Paragraph {
  return new Paragraph({ children: [new TextRun('')], spacing: { after } })
}

export interface StudentRow {
  num:      string
  nome:     string
  ra:       string
  destaque: string
  ponto:    string
}

export interface AreaData {
  geral:    string
  students: StudentRow[]
}

export interface ConsideracoesInput {
  turma:     string
  schoolName?: string
  lgg:       AreaData
  chs:       AreaData
  cnt:       AreaData
  sortMode?: 'destaques-primeiro'
}

function sortedByDestaques(area: AreaData): AreaData {
  return {
    ...area,
    students: [...area.students].sort((a, b) => {
      if (Boolean(a.destaque) === Boolean(b.destaque)) return 0
      return a.destaque ? -1 : 1
    }),
  }
}

function buildAreaSection(label: string, fullLabel: string, area: AreaData): (Paragraph | Table)[] {
  const result: (Paragraph | Table)[] = []

  result.push(new Paragraph({
    children: [
      new TextRun({ text: '  ' }),
      new TextRun({ text: label, font: FONT, size: SZ12, bold: true, color: WHITE }),
      new TextRun({ text: `  —  ${fullLabel}`, font: FONT, size: SZ10, bold: false, color: 'BBCCEE' }),
    ],
    spacing: { before: Math.round(0.6 * CM), after: 0 },
    shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD } },
  }))

  if (area.geral?.trim()) {
    result.push(new Paragraph({
      children: [new TextRun({ text: 'Considerações Gerais da Área', font: FONT, size: SZ10, bold: true, color: BLUE_FG, allCaps: true })],
      spacing: { before: Math.round(0.3 * CM), after: 60 },
      shading: { type: ShadingType.SOLID, color: BLUE_BG, fill: BLUE_BG },
      indent: { left: Math.round(0.5 * CM), right: Math.round(0.5 * CM) },
      border: { left: { style: BorderStyle.THICK, size: 12, color: NAVY_M } },
    }))
    result.push(new Paragraph({
      children: [new TextRun({ text: area.geral.trim(), font: FONT, size: SZ11 })],
      spacing: { after: Math.round(0.4 * CM), ...SINGLE },
      shading: { type: ShadingType.SOLID, color: BLUE_BG, fill: BLUE_BG },
      indent: { left: Math.round(0.5 * CM), right: Math.round(0.5 * CM) },
      border: { left: { style: BorderStyle.THICK, size: 12, color: NAVY_M } },
    }))
  } else {
    result.push(gap(Math.round(0.3 * CM)))
  }

  const active = area.students.filter(s => s.destaque || s.ponto)

  if (active.length === 0) {
    result.push(new Paragraph({
      children: [new TextRun({ text: 'Nenhum registro individual nesta área.', font: FONT, size: SZ10, italics: true, color: '868E96' })],
      spacing: { after: Math.round(0.3 * CM) },
    }))
    return result
  }

  const W_NUM = 480; const W_RA = 900; const W_NOME = 2800; const W_DES = 2020; const W_PON = 2020

  const headerRow = new TableRow({
    children: [
      navyCell('Nº', W_NUM), navyCell('RA', W_RA), navyCell('NOME', W_NOME),
      navyCell('DESTAQUE ACADÊMICO', W_DES), navyCell('PONTO DE ATENÇÃO', W_PON),
    ],
    tableHeader: true,
  })

  const dataRows = active.map(s => new TableRow({
    children: [
      dataCell(s.num, W_NUM, undefined, AlignmentType.CENTER),
      dataCell(s.ra, W_RA, undefined, AlignmentType.CENTER),
      dataCell(s.nome, W_NOME),
      dataCell(s.destaque, W_DES, s.destaque ? { fill: GREEN_BG, color: GREEN_FG } : undefined),
      dataCell(s.ponto, W_PON, s.ponto ? { fill: RED_BG, color: RED_FG } : undefined),
    ],
  }))

  result.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: thickBorder(), bottom: thickBorder(), left: thickBorder(), right: thickBorder(), insideHorizontal: thinBorder(), insideVertical: thinBorder() },
    rows: [headerRow, ...dataRows],
  }))

  result.push(gap(Math.round(0.5 * CM)))
  return result
}

export async function generateConsideracoesDocx(input: ConsideracoesInput): Promise<Buffer> {
  const children: (Paragraph | Table)[] = []

  const schoolDisplay = input.schoolName || 'Samba Innovations'

  children.push(new Paragraph({
    children: [new TextRun({ text: schoolDisplay, font: FONT, size: SZ10, bold: true, color: NAVY })],
    alignment: AlignmentType.CENTER,
    spacing: { after: Math.round(0.3 * CM) },
  }))

  children.push(new Paragraph({
    children: [new TextRun({ text: 'CONSIDERAÇÕES GERAIS SOBRE O DESEMPENHO DA TURMA', font: FONT, size: SZ14, bold: true, color: NAVY, allCaps: true })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD } },
  }))

  if (input.turma?.trim()) {
    children.push(new Paragraph({
      children: [new TextRun({ text: `Turma: ${input.turma.trim()}`, font: FONT, size: SZ12, bold: true, color: NAVY_M, italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: Math.round(0.5 * CM) },
    }))
  }

  const sort = input.sortMode === 'destaques-primeiro'
  children.push(...buildAreaSection('LGG', 'Linguagens', sort ? sortedByDestaques(input.lgg) : input.lgg))
  children.push(...buildAreaSection('CHS', 'Ciências Humanas e Sociais', sort ? sortedByDestaques(input.chs) : input.chs))
  children.push(...buildAreaSection('CNT/MAT', 'Ciências da Natureza e Suas Tecnologias / Matemática', sort ? sortedByDestaques(input.cnt) : input.cnt))

  children.push(gap(Math.round(0.5 * CM)))
  children.push(new Paragraph({
    children: [new TextRun({ text: `Gerado via less · ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`, font: FONT, size: SZ10, color: '868E96', italics: true })],
    alignment: AlignmentType.CENTER,
    border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' } },
    spacing: { before: Math.round(0.3 * CM) },
  }))

  const doc = new Document({
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: MARGIN } },
      children,
    }],
  })

  return Packer.toBuffer(doc) as unknown as Buffer
}
