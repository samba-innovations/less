// Excel oficial da ATA (Resumo · Dados · Mapão · Assinaturas · ATA[5º] · Dados
// Complementares) — migrado do samba-paper v1; desenho ExcelJS idêntico, auth e
// consultas adaptadas ao v2 (JWT + lessDocument + TeacherAssignment/orgRoles).
import { NextRequest, NextResponse } from "next/server";
import { getAuthCookie } from "@/lib/cookie";
import { verifyToken, canCreateAta, effectiveRole } from "@/lib/jwt";
import { db } from "@/lib/db";
import ExcelJS from "exceljs";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudentGrade { num: number; media: string | number; faltas: number; ac: number }
interface AtaStudent {
  name: string; situacao: string;
  grades: Record<string, StudentGrade>;
  totalFaltas: number; freqPct: string; ftAn: number; freqAnPct: string;
}
interface AtaMeta {
  anoLetivo: string; diretoria: string; escola: string; tipoEnsino: string;
  turma: string; tipoFechamento: string; totalAulas: string; totalAulasEletiva: string;
}
interface AtaCsvData { meta: AtaMeta; disciplines: string[]; students: AtaStudent[] }
interface ClassTeacher { name: string; discipline: string }
interface StaffMember  { name: string; role: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const FONT_NAME = "Calibri";

// Usuários de teste / não-efetivos ocultados das seções de DIREÇÃO e COORDENAÇÃO
// nas assinaturas (contas de teste com papel de coordenador). NÃO se aplica à seção
// de PROFESSORES: quem é efetivo docente aparece normalmente na sua disciplina.
// Casado por nome normalizado (sem acento/caixa/espaços). Pode-se sobrepor via env.
const normStaffName = (s: string) =>
  String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const HIDDEN_STAFF = new Set(
  (process.env.HIDDEN_STAFF_NAMES ?? "Vinicius Bertuzzo Lima")
    .split(",").map(normStaffName).filter(Boolean),
);
const isHiddenStaff = (name: string) => HIDDEN_STAFF.has(normStaffName(name));

const BIMESTRE_LABEL: Record<string, string> = {
  "1": "1º Bimestre", "2": "2º Bimestre", "3": "3º Bimestre", "4": "4º Bimestre",
  "5": "5º Conceito (Anual)",
};

const BIMESTRE_LABEL_UPPER: Record<string, string> = {
  "1": "1º BIMESTRE", "2": "2º BIMESTRE", "3": "3º BIMESTRE", "4": "4º BIMESTRE",
  "5": "5º CONCEITO (ANUAL)",
};

// ─── Color helpers ────────────────────────────────────────────────────────────

function parseFreq(s: string): number {
  return parseInt(String(s ?? "0").replace("%", ""), 10) || 0;
}
function isNumeric(m: string | number): boolean {
  if (m === null || m === undefined || m === "" || m === "-") return false;
  const s = String(m).trim();
  return !isNaN(Number(s)) && s !== "";
}
function isEmaLetter(m: string | number): boolean {
  const s = String(m ?? "").trim().toUpperCase();
  return s === "ET" || s === "ES" || s === "EP";
}
function emaLetterInsuf(m: string | number): boolean {
  return String(m ?? "").trim().toUpperCase() === "EP";
}
function isActive(s: string) {
  return !["Transferido", "Baixa - Transferência"].includes(s);
}
function isInactiveRow(situacao: string): boolean {
  // Rows that are not "normal active" and not "Encerrado" → bright yellow
  return !["Ativo", "Encerrado", ""].includes(situacao);
}

// ─── Fill constants ───────────────────────────────────────────────────────────

const RED_FILL:        Partial<ExcelJS.Fill> = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFC7CE" } };
const YELLOW_FILL:     Partial<ExcelJS.Fill> = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF2CC" } };
const GREEN_FILL:      Partial<ExcelJS.Fill> = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9EAD3" } };
const BLUE_HDR_FILL:   Partial<ExcelJS.Fill> = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F3864" } };
const LIGHT_HDR_FILL:  Partial<ExcelJS.Fill> = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD6E4F0" } };
const SUBHDR_FILL:     Partial<ExcelJS.Fill> = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F1FB" } };
const DISC_ALT_FILL:   Partial<ExcelJS.Fill> = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF4FB" } };
const INACTIVE_FILL:   Partial<ExcelJS.Fill> = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } }; // bright yellow
const GOVT_HDR_FILL:   Partial<ExcelJS.Fill> = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F5FC" } };
const WHITE_FILL:      Partial<ExcelJS.Fill> = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
const ROW_ALT_FILL:    Partial<ExcelJS.Fill> = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7F9FD" } };

// ─── Font constants ───────────────────────────────────────────────────────────

const BLUE_FONT:   Partial<ExcelJS.Font> = { name: FONT_NAME, color: { argb: "FF1F5C8B" }, bold: true };
const RED_FONT:    Partial<ExcelJS.Font> = { name: FONT_NAME, color: { argb: "FF9C0006" }, bold: true };
const ORANGE_FONT: Partial<ExcelJS.Font> = { name: FONT_NAME, color: { argb: "FF7F4F0E" } };
const NAVY_FONT:   Partial<ExcelJS.Font> = { name: FONT_NAME, color: { argb: "FF1F3864" }, bold: true };
const WHITE_FONT:  Partial<ExcelJS.Font> = { name: FONT_NAME, color: { argb: "FFFFFFFF" }, bold: true };

// ─── Border helpers ───────────────────────────────────────────────────────────

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin" }, bottom: { style: "thin" },
  left: { style: "thin" }, right: { style: "thin" },
};
const THICK_OUTER: Partial<ExcelJS.Borders> = {
  top: { style: "medium" }, bottom: { style: "medium" },
  left: { style: "medium" }, right: { style: "medium" },
};

function applyBorder(cell: ExcelJS.Cell, borders: Partial<ExcelJS.Borders> = THIN_BORDER) {
  cell.border = borders as ExcelJS.Borders;
}

/** Returns border style for a column inside a discipline group (position 0–3) */
function discColBorder(pos: number): Partial<ExcelJS.Borders> {
  return {
    top:    { style: "thin" },
    bottom: { style: "thin" },
    left:   pos === 0 ? { style: "medium" } : { style: "hair" },
    right:  pos === 3 ? { style: "medium" } : { style: "hair" },
  };
}
function discColBorderHdr(pos: number): Partial<ExcelJS.Borders> {
  return {
    top:    { style: "medium" },
    bottom: { style: "medium" },
    left:   pos === 0 ? { style: "medium" } : { style: "hair" },
    right:  pos === 3 ? { style: "medium" } : { style: "hair" },
  };
}
function totalColBorder(pos: number, totalCols: number): Partial<ExcelJS.Borders> {
  return {
    top:    { style: "thin" },
    bottom: { style: "thin" },
    left:   pos === 0 ? { style: "medium" } : { style: "hair" },
    right:  pos === totalCols - 1 ? { style: "medium" } : { style: "hair" },
  };
}

// ─── Official header helper ───────────────────────────────────────────────────

/** Adds the official government/school header block to a worksheet.
 *  Returns the next available row number after the header. */
function addOfficialHeader(ws: ExcelJS.Worksheet, totalCols: number, startRow = 1): number {
  let row = startRow;

  const merge = (r: number) => ws.mergeCells(r, 1, r, totalCols);
  const setRow = (
    r: number,
    value: string,
    font: Partial<ExcelJS.Font>,
    height: number,
    fill: Partial<ExcelJS.Fill> = GOVT_HDR_FILL,
  ) => {
    const cell = ws.getCell(r, 1);
    cell.value = value;
    cell.font  = font as ExcelJS.Font;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: false };
    cell.fill  = fill as ExcelJS.Fill;
    ws.getRow(r).height = height;
    merge(r);
  };

  setRow(row, "GOVERNO DO ESTADO DE SÃO PAULO – SECRETARIA DE ESTADO DA EDUCAÇÃO",
    { name: FONT_NAME, bold: true, size: 9, color: { argb: "FF1F3864" } }, 16);
  row++;
  setRow(row, "UNIDADE REGIONAL DE ENSINO – REGIÃO BAURU",
    { name: FONT_NAME, bold: true, size: 10, color: { argb: "FF1F3864" } }, 16);
  row++;
  setRow(row, "EE PROF. CHRISTINO CABRAL",
    { name: FONT_NAME, bold: true, size: 11, color: { argb: "FF1F3864" } }, 18);
  row++;
  setRow(row, "Rua Gerson França, 19-165 – Jardim Estoril II – CEP: 17016-000  ·  Tel: (14) 3223-3855  ·  e625598a@educacao.sp.gov.br",
    { name: FONT_NAME, size: 8, color: { argb: "FF555555" } }, 13);
  row++;

  // Blue separator
  ws.getRow(row).height = 3;
  for (let c = 1; c <= totalCols; c++) {
    ws.getCell(row, c).fill = BLUE_HDR_FILL as ExcelJS.Fill;
  }
  row++;

  return row;
}

// ─── Sheet 1 — Resumo (ATA title + notas) ────────────────────────────────────

function buildResumo(wb: ExcelJS.Workbook, data: AtaCsvData, bimestre: string, notas: string, topicos: string) {
  const ws = wb.addWorksheet("Resumo");
  ws.pageSetup.paperSize   = 9; // A4
  ws.pageSetup.orientation = "portrait";
  ws.pageSetup.fitToPage   = true;
  ws.pageSetup.fitToWidth  = 1;
  ws.pageSetup.fitToHeight = 0;
  ws.pageSetup.margins = { left: 0.79, right: 0.79, top: 0.79, bottom: 0.79, header: 0.3, footer: 0.3 };

  const TOTAL_COLS = 6;
  ws.columns = [
    { width: 32 }, { width: 24 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 },
  ];

  let row = addOfficialHeader(ws, TOTAL_COLS);

  // ATA title
  const bimestreUpper = BIMESTRE_LABEL_UPPER[bimestre] ?? bimestre.toUpperCase();
  const titleText = `ATA DE REUNIÃO DO CONSELHO DE ANO/CLASSE/SÉRIE - ${data.meta.anoLetivo} - ${data.meta.turma} - ${bimestreUpper}`;
  const titleCell = ws.getCell(row, 1);
  titleCell.value = titleText;
  titleCell.font  = { name: FONT_NAME, bold: true, size: 13, color: { argb: "FF1F3864" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  titleCell.fill  = LIGHT_HDR_FILL as ExcelJS.Fill;
  titleCell.border = THICK_OUTER as ExcelJS.Borders;
  ws.mergeCells(row, 1, row, TOTAL_COLS);
  ws.getRow(row).height = 36;
  row++;

  // Notas / Deliberações box — always present (blank if empty)
  const notasText = notas?.trim() ?? "";
  const nc = ws.getCell(row, 1);
  nc.value     = notasText || "";
  nc.font      = { name: FONT_NAME, size: 10 };
  nc.alignment = { wrapText: true, vertical: "top" };
  nc.fill      = WHITE_FILL as ExcelJS.Fill;
  applyBorder(nc, THICK_OUTER);
  ws.getRow(row).height = notasText
    ? Math.min(400, Math.max(80, 15 * Math.ceil(notasText.length / 80)))
    : 160;
  ws.mergeCells(row, 1, row, TOTAL_COLS);
  row++;

  // Tópicos discutidos — renderizado em VÁRIAS linhas (uma por parágrafo) para
  // que o texto apareça por INTEIRO e pagine naturalmente (célula mesclada única
  // não expande a altura e cortava textos longos). Quebras caem entre linhas.
  const topicosText = topicos.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trimEnd();
  if (topicosText.trim().length > 0) {
    const th = ws.getCell(row, 1);
    th.value     = "TÓPICOS DISCUTIDOS";
    th.font      = WHITE_FONT as ExcelJS.Font;
    th.fill      = BLUE_HDR_FILL as ExcelJS.Fill;
    th.alignment = { horizontal: "center", vertical: "middle" };
    ws.mergeCells(row, 1, row, TOTAL_COLS);
    ws.getRow(row).height = 18;
    applyBorder(th, THICK_OUTER);
    row++;

    const CHARS_PER_LINE = 115; // largura útil aproximada das 6 colunas
    const lines = topicosText.split("\n");
    const M = { style: "medium" as const };
    lines.forEach((line, i) => {
      const first = i === 0;
      const last  = i === lines.length - 1;
      // Borda de "caixa" contínua: verticais em toda linha; topo só na 1ª, base só na última.
      for (let c = 1; c <= TOTAL_COLS; c++) {
        const cell = ws.getCell(row, c);
        cell.fill = WHITE_FILL as ExcelJS.Fill;
        cell.border = {
          left:   c === 1 ? M : undefined,
          right:  c === TOTAL_COLS ? M : undefined,
          top:    first ? M : undefined,
          bottom: last ? M : undefined,
        } as ExcelJS.Borders;
      }
      const tc = ws.getCell(row, 1);
      tc.value     = line;
      tc.font      = { name: FONT_NAME, size: 10 };
      tc.alignment = { wrapText: true, vertical: "top" };
      const wrapped = Math.max(1, Math.ceil(line.length / CHARS_PER_LINE));
      ws.getRow(row).height = Math.max(15, wrapped * 15);
      ws.mergeCells(row, 1, row, TOTAL_COLS);
      row++;
    });
  }
}

// ─── Sheet 3 — Dados (identificação + estatísticas) ──────────────────────────

function buildDados(
  wb: ExcelJS.Workbook, data: AtaCsvData, bimestre: string,
  mapaoInfo?: {
    firstDataRow: number; lastDataRow: number;
    discMCols: { disc: string; col: string }[];
    situCol: string; freqCol: string; freqAnCol: string;
  }
) {
  const ws = wb.addWorksheet("Dados");
  ws.pageSetup.paperSize   = 9; // A4
  ws.pageSetup.orientation = "portrait";
  ws.pageSetup.fitToPage   = true;
  ws.pageSetup.fitToWidth  = 1;
  ws.pageSetup.fitToHeight = 0;
  ws.pageSetup.margins = { left: 0.79, right: 0.79, top: 0.79, bottom: 0.79, header: 0.3, footer: 0.3 };

  // 6 colunas uniformes: stats e tabela de disciplinas se encaixam bem
  const TOTAL_COLS = 6;
  ws.columns = [
    { width: 30 }, // Disciplina / Total
    { width: 20 }, // Qtd. Abaixo / Ativos
    { width: 18 }, // Status / Transferidos
    { width: 20 }, // Aprovados
    { width: 20 }, // Pontos de Atenção
    { width: 18 }, // Alerta Presença
  ];

  let row = addOfficialHeader(ws, TOTAL_COLS);
  ws.getRow(row).height = 6; row++;

  // Metadata grid
  const metaRows: [string, string][] = [
    ["Ano Letivo",       data.meta.anoLetivo],
    ["Diretoria",        data.meta.diretoria],
    ["Escola",           data.meta.escola],
    ["Tipo de Ensino",   data.meta.tipoEnsino],
    ["Turma",            data.meta.turma],
    ["Bimestre",         BIMESTRE_LABEL[bimestre] ?? bimestre],
    ["Tipo Fechamento",  data.meta.tipoFechamento],
    ["Total de Aulas",   data.meta.totalAulas],
  ];

  {
    const h = ws.getCell(row, 1);
    h.value = "IDENTIFICAÇÃO"; h.font = WHITE_FONT as ExcelJS.Font;
    h.fill  = BLUE_HDR_FILL as ExcelJS.Fill;
    h.alignment = { horizontal: "center", vertical: "middle" };
    ws.mergeCells(row, 1, row, TOTAL_COLS);
    ws.getRow(row).height = 18;
    applyBorder(h, THICK_OUTER);
    row++;
  }

  for (const [label, value] of metaRows) {
    const lc = ws.getCell(row, 1);
    const vc = ws.getCell(row, 2);
    lc.value = label; lc.font = { name: FONT_NAME, bold: true, size: 10 };
    lc.fill  = SUBHDR_FILL as ExcelJS.Fill;
    lc.alignment = { vertical: "middle", wrapText: true };
    vc.value = value; vc.font = { name: FONT_NAME, size: 10 };
    vc.fill  = WHITE_FILL as ExcelJS.Fill;
    vc.alignment = { vertical: "middle", wrapText: true };
    ws.mergeCells(row, 2, row, TOTAL_COLS);
    ws.getRow(row).height = 18;
    applyBorder(lc); applyBorder(vc);
    row++;
  }
  ws.getRow(row).height = 8; row++;

  // Cálculo estático — usado como fallback se mapaoInfo não disponível
  const ativos       = data.students.filter((s) => isActive(s.situacao));
  const transferidos = data.students.filter((s) => !isActive(s.situacao));
  const aprovados    = ativos.filter((s) =>
    data.disciplines.every((d) => {
      const m = s.grades[d]?.media;
      if (isNumeric(m)) return Number(m) >= 5;
      if (isEmaLetter(m)) return !emaLetterInsuf(m);
      return true;
    })
  );
  const reprovados     = ativos.filter((s) =>
    data.disciplines.some((d) => {
      const m = s.grades[d]?.media;
      if (isNumeric(m)) return Number(m) < 5;
      return isEmaLetter(m) && emaLetterInsuf(m);
    })
  );
  const alertaPresenca = ativos.filter((s) => { const f = parseFreq(s.freqPct); return f >= 75 && f < 90; });
  const riscoPresenca  = ativos.filter((s) => parseFreq(s.freqPct) < 75);

  {
    const h = ws.getCell(row, 1);
    h.value = "ESTATÍSTICAS DA TURMA"; h.font = WHITE_FONT as ExcelJS.Font;
    h.fill  = BLUE_HDR_FILL as ExcelJS.Fill;
    h.alignment = { horizontal: "center", vertical: "middle" };
    ws.mergeCells(row, 1, row, TOTAL_COLS);
    ws.getRow(row).height = 18;
    applyBorder(h, THICK_OUTER);
    row++;
  }

  const statLabels = ["Total", "Ativos", "Transferidos", "Aprovados", "Pontos de\nAtenção", "Alerta\nPresença"];
  const statFills  = [SUBHDR_FILL, SUBHDR_FILL, YELLOW_FILL, GREEN_FILL, RED_FILL, YELLOW_FILL];

  statLabels.forEach((h, i) => {
    const c = ws.getCell(row, i + 1);
    c.value = h; c.font = { name: FONT_NAME, bold: true, size: 9, color: { argb: "FF1F3864" } };
    c.fill  = LIGHT_HDR_FILL as ExcelJS.Fill;
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    ws.getRow(row).height = 36;
    applyBorder(c);
  });
  row++;

  // Fórmulas dinâmicas referenciando Mapão (se mapaoInfo disponível)
  const mi = mapaoInfo;
  let statFormulas: (number | { formula: string })[];

  if (mi) {
    const f   = mi.firstDataRow;
    const l   = mi.lastDataRow;
    const sit = mi.situCol;         // B
    const fr  = mi.freqCol;         // coluna Fre%
    const sR  = `'Mapão'!${sit}${f}:${sit}${l}`;

    // Pontos de Atenção: alunos ativos com alguma nota < 5 ou "EP"
    const insufTerms = mi.discMCols
      .map(({ col: c }) =>
        `ISNUMBER('Mapão'!${c}${f}:${c}${l})*('Mapão'!${c}${f}:${c}${l}<5)+('Mapão'!${c}${f}:${c}${l}="EP")`
      ).join('+');
    const pontosF = insufTerms.length > 0
      ? `SUMPRODUCT(--(${insufTerms}>0)*(${sR}<>"Transferido")*(${sR}<>"Baixa - Transferência"))`
      : '0';

    statFormulas = [
      { formula: `COUNTA('Mapão'!A${f}:A${l})` },
      { formula: `COUNTIFS(${sR},"<>Transferido",${sR},"<>Baixa - Transferência")` },
      { formula: `COUNTIF(${sR},"Transferido")+COUNTIF(${sR},"Baixa - Transferência")` },
      // Aprovados = Ativos - Pontos de Atenção (preenchido abaixo por referência de célula)
      0, // placeholder
      { formula: pontosF },
      { formula: `COUNTIF('Mapão'!${fr}${f}:${fr}${l},"<75")+COUNTIFS('Mapão'!${fr}${f}:${fr}${l},">="&75,'Mapão'!${fr}${f}:${fr}${l},"<"&90)` },
    ];
  } else {
    statFormulas = [
      data.students.length, ativos.length, transferidos.length,
      aprovados.length, reprovados.length, alertaPresenca.length + riscoPresenca.length,
    ];
  }

  const statValRow = row;
  statFormulas.forEach((v, i) => {
    const c = ws.getCell(statValRow, i + 1);
    c.value = typeof v === 'object' ? v : v;
    c.font  = { name: FONT_NAME, bold: true, size: 16, color: { argb: "FF1F3864" } };
    c.fill  = statFills[i] as ExcelJS.Fill;
    c.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(statValRow).height = 28;
    applyBorder(c);
  });

  // Aprovados = Ativos - Pontos de Atenção (referencia células da mesma linha)
  if (mi) {
    const ativosAddr = ws.getCell(statValRow, 2).address;
    const pontosAddr = ws.getCell(statValRow, 5).address;
    const aprov = ws.getCell(statValRow, 4);
    aprov.value = { formula: `${ativosAddr}-${pontosAddr}` };
    aprov.font  = { name: FONT_NAME, bold: true, size: 16, color: { argb: "FF1F3864" } };
    aprov.fill  = GREEN_FILL as ExcelJS.Fill;
    aprov.alignment = { horizontal: "center", vertical: "middle" };
    applyBorder(aprov);
  }

  row++;
  ws.getRow(row).height = 8; row++;

  // Performance by discipline
  {
    const h = ws.getCell(row, 1);
    h.value = "DESEMPENHO INSUFICIENTE POR DISCIPLINA"; h.font = WHITE_FONT as ExcelJS.Font;
    h.fill  = BLUE_HDR_FILL as ExcelJS.Fill;
    h.alignment = { horizontal: "center", vertical: "middle" };
    ws.mergeCells(row, 1, row, TOTAL_COLS);
    ws.getRow(row).height = 18;
    applyBorder(h, THICK_OUTER);
    row++;
  }

  const colHdrs = ["Disciplina", "Qtd. Abaixo de 5", "Status", "", "", ""];
  colHdrs.forEach((h, i) => {
    if (!h) return;
    const c = ws.getCell(row, i + 1);
    c.value = h; c.font = { name: FONT_NAME, bold: true, size: 10, color: { argb: "FF1F3864" } };
    c.fill  = LIGHT_HDR_FILL as ExcelJS.Fill;
    c.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(row).height = 18;
    applyBorder(c);
  });
  row++;

  for (const d of data.disciplines) {
    // Calcula insuf estaticamente para fallback e semNota
    const insuf = ativos.filter((s) => {
      const m = s.grades[d]?.media;
      if (isNumeric(m)) return Number(m) < 5;
      return isEmaLetter(m) && emaLetterInsuf(m);
    }).length;
    const semNota = ativos.every((s) => {
      const m = s.grades[d]?.media;
      return !isNumeric(m) && !isEmaLetter(m);
    });

    // Coluna M desta disciplina no Mapão (para COUNTIF dinâmico)
    const mInfo = mapaoInfo?.discMCols.find(x => x.disc === d);
    const useFormula = !semNota && mInfo && mapaoInfo;

    const r = ws.getRow(row);
    r.height = 18;

    const dc = r.getCell(1);
    dc.value = d; dc.font = { name: FONT_NAME, size: 10 };
    dc.fill  = (row % 2 === 0 ? WHITE_FILL : ROW_ALT_FILL) as ExcelJS.Fill;
    dc.alignment = { vertical: "middle", wrapText: true };
    applyBorder(dc);

    const nc = r.getCell(2);
    if (semNota) {
      nc.value = "Sem notas lançadas";
      nc.fill  = YELLOW_FILL as ExcelJS.Fill;
      nc.font  = { name: FONT_NAME, size: 10, ...ORANGE_FONT };
    } else if (useFormula) {
      // COUNTIF dinâmico: conta notas < 5 OU "EP" na coluna M do Mapão
      const mCol  = mInfo!.col;
      const fRow  = mapaoInfo!.firstDataRow;
      const lRow  = mapaoInfo!.lastDataRow;
      const rng   = `'Mapão'!${mCol}${fRow}:${mCol}${lRow}`;
      nc.value    = { formula: `COUNTIF(${rng},"<5")+COUNTIF(${rng},"EP")` };
      nc.font     = { name: FONT_NAME, size: 10 };
      nc.fill     = (row % 2 === 0 ? WHITE_FILL : ROW_ALT_FILL) as ExcelJS.Fill;
      // CF na célula de contagem: > 0 → vermelho, = 0 → verde
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ws as any).addConditionalFormatting({
        ref: `${ws.getCell(row, 2).address}:${ws.getCell(row, 2).address}`,
        rules: [
          { type: 'cellIs', operator: 'greaterThan', formulae: [0], priority: 1,
            style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFC7CE' } }, font: { color: { argb: 'FF9C0006' }, bold: true } } },
          { type: 'cellIs', operator: 'equal', formulae: [0], priority: 2,
            style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFD9EAD3' } } } },
        ],
      });
    } else {
      nc.value = insuf;
      nc.font  = { name: FONT_NAME, size: 10 };
      if (insuf > 0) { nc.fill = RED_FILL as ExcelJS.Fill; nc.font = { ...nc.font, ...RED_FONT }; }
      else           { nc.fill = (row % 2 === 0 ? WHITE_FILL : ROW_ALT_FILL) as ExcelJS.Fill; }
    }
    nc.alignment = { horizontal: "center", vertical: "middle" };
    applyBorder(nc);

    const sc = r.getCell(3);
    if (useFormula) {
      // Status dinâmico baseado na célula de contagem ao lado
      const cntAddr = ws.getCell(row, 2).address;
      sc.value = { formula: `IF(${cntAddr}>0,"⚠ Atenção","✓ OK")` };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ws as any).addConditionalFormatting({
        ref: `${sc.address}:${sc.address}`,
        rules: [
          { type: 'containsText', text: 'Atenção', priority: 1,
            style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFC7CE' } }, font: { color: { argb: 'FF9C0006' }, bold: true } } },
          { type: 'containsText', text: 'OK', priority: 2,
            style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFD9EAD3' } } } },
        ],
      });
      sc.fill = (row % 2 === 0 ? WHITE_FILL : ROW_ALT_FILL) as ExcelJS.Fill;
    } else {
      sc.value = semNota ? "⚠ Atenção" : insuf > 0 ? "⚠ Atenção" : "✓ OK";
      sc.font  = { name: FONT_NAME, size: 10 };
      if (insuf > 0 || semNota) sc.fill = (semNota ? YELLOW_FILL : RED_FILL) as ExcelJS.Fill;
      else sc.fill = (row % 2 === 0 ? WHITE_FILL : ROW_ALT_FILL) as ExcelJS.Fill;
    }
    sc.alignment = { horizontal: "center", vertical: "middle" };
    sc.font = { name: FONT_NAME, size: 10 };
    applyBorder(sc);
    row++;
  }
  ws.getRow(row).height = 8; row++;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addCFdados = (ref: string, rules: unknown[]) => (ws as any).addConditionalFormatting({ ref, rules });

  if (mi) {
    const { firstDataRow: fd, lastDataRow: ld, situCol: sit, freqCol: fr, freqAnCol: fan } = mi;
    const numStudents = ld - fd + 1;

    // ── Presença dos Alunos ──────────────────────────────────────────────────
    {
      const h = ws.getCell(row, 1);
      h.value = "PRESENÇA DOS ALUNOS"; h.font = WHITE_FONT as ExcelJS.Font;
      h.fill  = BLUE_HDR_FILL as ExcelJS.Fill;
      h.alignment = { horizontal: "center", vertical: "middle" };
      ws.mergeCells(row, 1, row, TOTAL_COLS);
      ws.getRow(row).height = 18;
      applyBorder(h, THICK_OUTER);
      row++;
    }
    ["Aluno", "Fre(%)", "Fre An(%)", "Status Presença"].forEach((h, i) => {
      const c = ws.getCell(row, i + 1);
      c.value = h;
      c.font  = { name: FONT_NAME, bold: true, size: 10, color: { argb: "FF1F3864" } };
      c.fill  = LIGHT_HDR_FILL as ExcelJS.Fill;
      c.alignment = { horizontal: "center", vertical: "middle" };
      applyBorder(c);
    });
    ws.mergeCells(row, 4, row, TOTAL_COLS);
    ws.getRow(row).height = 18;
    row++;

    const presStartRow = row;
    for (let mapRow = fd; mapRow <= ld; mapRow++) {
      const r = ws.getRow(row); r.height = 16;

      const nc = r.getCell(1);
      nc.value = { formula: `'Mapão'!A${mapRow}` };
      nc.font  = { name: FONT_NAME, size: 10 };
      nc.fill  = WHITE_FILL as ExcelJS.Fill;
      nc.alignment = { vertical: "middle" };
      applyBorder(nc);

      const fc = r.getCell(2);
      fc.value = { formula: `'Mapão'!${fr}${mapRow}` };
      fc.numFmt = '0"%"';
      fc.font  = { name: FONT_NAME, size: 10 };
      fc.fill  = WHITE_FILL as ExcelJS.Fill;
      fc.alignment = { horizontal: "center", vertical: "middle" };
      applyBorder(fc);

      const fanc = r.getCell(3);
      fanc.value = { formula: `'Mapão'!${fan}${mapRow}` };
      fanc.numFmt = '0"%"';
      fanc.font  = { name: FONT_NAME, size: 10 };
      fanc.fill  = WHITE_FILL as ExcelJS.Fill;
      fanc.alignment = { horizontal: "center", vertical: "middle" };
      applyBorder(fanc);

      const sc = r.getCell(4);
      sc.value = { formula: `IF(OR('Mapão'!${sit}${mapRow}="Transferido",'Mapão'!${sit}${mapRow}="Baixa - Transferência"),"—",IF('Mapão'!${fr}${mapRow}<75,"⚠ Risco (<75%)",IF('Mapão'!${fr}${mapRow}<90,"⚠ Alerta (75–89%)","✓ OK")))` };
      sc.font  = { name: FONT_NAME, size: 10 };
      sc.fill  = WHITE_FILL as ExcelJS.Fill;
      sc.alignment = { horizontal: "center", vertical: "middle" };
      applyBorder(sc);
      ws.mergeCells(row, 4, row, TOTAL_COLS);

      row++;
    }
    const presEndRow = row - 1;

    if (numStudents > 0) {
      const c2s = ws.getCell(presStartRow, 2).address;
      const c2e = ws.getCell(presEndRow,   2).address;
      addCFdados(`${c2s}:${c2e}`, [
        { type: 'cellIs', operator: 'lessThan',           formulae: [75], priority: 1,
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFC7CE' } }, font: { color: { argb: 'FF9C0006' }, bold: true } } },
        { type: 'expression', priority: 2, formulae: [`AND(${c2s}>=75,${c2s}<90)`],
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFF2CC' } }, font: { color: { argb: 'FF7F4F0E' } } } },
        { type: 'cellIs', operator: 'greaterThanOrEqual', formulae: [90], priority: 3,
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFD9EAD3' } } } },
      ]);
      const c4s = ws.getCell(presStartRow, 4).address;
      const c4e = ws.getCell(presEndRow,   4).address;
      addCFdados(`${c4s}:${c4e}`, [
        { type: 'containsText', text: 'Risco',  priority: 1,
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFC7CE' } }, font: { color: { argb: 'FF9C0006' }, bold: true } } },
        { type: 'containsText', text: 'Alerta', priority: 2,
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFF2CC' } }, font: { color: { argb: 'FF7F4F0E' } } } },
        { type: 'containsText', text: 'OK',     priority: 3,
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFD9EAD3' } } } },
      ]);
    }
    ws.getRow(row).height = 8; row++;

    // ── Desempenho Individual ────────────────────────────────────────────────
    {
      const h = ws.getCell(row, 1);
      h.value = "DESEMPENHO INDIVIDUAL"; h.font = WHITE_FONT as ExcelJS.Font;
      h.fill  = BLUE_HDR_FILL as ExcelJS.Fill;
      h.alignment = { horizontal: "center", vertical: "middle" };
      ws.mergeCells(row, 1, row, TOTAL_COLS);
      ws.getRow(row).height = 18;
      applyBorder(h, THICK_OUTER);
      row++;
    }
    ["Aluno", "Notas\nVermelhas", "Status"].forEach((h, i) => {
      const c = ws.getCell(row, i + 1);
      c.value = h;
      c.font  = { name: FONT_NAME, bold: true, size: 10, color: { argb: "FF1F3864" } };
      c.fill  = LIGHT_HDR_FILL as ExcelJS.Fill;
      c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      applyBorder(c);
    });
    ws.mergeCells(row, 3, row, TOTAL_COLS);
    ws.getRow(row).height = 28;
    row++;

    const rankStartRow = row;
    for (let mapRow = fd; mapRow <= ld; mapRow++) {
      const r = ws.getRow(row); r.height = 16;

      const nc = r.getCell(1);
      nc.value = { formula: `'Mapão'!A${mapRow}` };
      nc.font  = { name: FONT_NAME, size: 10 };
      nc.fill  = WHITE_FILL as ExcelJS.Fill;
      nc.alignment = { vertical: "middle" };
      applyBorder(nc);

      // Conta disciplinas com nota insuf para este aluno (linha mapRow do Mapão)
      const terms = mi.discMCols.map(({ col: c }) =>
        `((ISNUMBER('Mapão'!${c}${mapRow})*('Mapão'!${c}${mapRow}<5))+('Mapão'!${c}${mapRow}="EP")>0)*1`
      );
      const cc = r.getCell(2);
      cc.value = terms.length > 0 ? { formula: terms.join('+') } : 0;
      cc.font  = { name: FONT_NAME, size: 11, bold: true };
      cc.fill  = WHITE_FILL as ExcelJS.Fill;
      cc.alignment = { horizontal: "center", vertical: "middle" };
      applyBorder(cc);

      const countAddr = ws.getCell(row, 2).address;
      const sc = r.getCell(3);
      sc.value = { formula: `IF(OR('Mapão'!${sit}${mapRow}="Transferido",'Mapão'!${sit}${mapRow}="Baixa - Transferência"),"—",IF(${countAddr}>3,"🔴 Crítico (>3)",IF(${countAddr}>0,"⚠ Atenção (1–3)","✓ OK")))` };
      sc.font  = { name: FONT_NAME, size: 10 };
      sc.fill  = WHITE_FILL as ExcelJS.Fill;
      sc.alignment = { horizontal: "center", vertical: "middle" };
      applyBorder(sc);
      ws.mergeCells(row, 3, row, TOTAL_COLS);

      row++;
    }
    const rankEndRow = row - 1;

    if (numStudents > 0) {
      const rc2s = ws.getCell(rankStartRow, 2).address;
      const rc2e = ws.getCell(rankEndRow,   2).address;
      addCFdados(`${rc2s}:${rc2e}`, [
        { type: 'cellIs', operator: 'greaterThan', formulae: [3], priority: 1,
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFC7CE' } }, font: { color: { argb: 'FF9C0006' }, bold: true } } },
        { type: 'expression', priority: 2, formulae: [`AND(${rc2s}>0,${rc2s}<=3)`],
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFF2CC' } }, font: { color: { argb: 'FF7F4F0E' } } } },
        { type: 'cellIs', operator: 'equal', formulae: [0], priority: 3,
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFD9EAD3' } } } },
      ]);
      const rc3s = ws.getCell(rankStartRow, 3).address;
      const rc3e = ws.getCell(rankEndRow,   3).address;
      addCFdados(`${rc3s}:${rc3e}`, [
        { type: 'containsText', text: 'Crítico', priority: 1,
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFC7CE' } }, font: { color: { argb: 'FF9C0006' }, bold: true } } },
        { type: 'containsText', text: 'Atenção', priority: 2,
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFF2CC' } }, font: { color: { argb: 'FF7F4F0E' } } } },
        { type: 'containsText', text: 'OK',      priority: 3,
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFD9EAD3' } } } },
      ]);
    }

  } else {
    // ── Fallback estático (sem mapaoInfo) ────────────────────────────────────

    if (alertaPresenca.length > 0) {
      const h = ws.getCell(row, 1);
      h.value = "ALUNOS EM ALERTA DE PRESENÇA (75–89%)";
      h.font  = { name: FONT_NAME, bold: true, size: 10, color: { argb: "FF7F4F0E" } };
      h.fill  = YELLOW_FILL as ExcelJS.Fill;
      h.alignment = { horizontal: "center", vertical: "middle" };
      ws.mergeCells(row, 1, row, 3); ws.getRow(row).height = 18;
      applyBorder(h); row++;
      for (const s of alertaPresenca) {
        ws.getCell(row, 1).value = s.name;
        ws.getCell(row, 1).font  = { name: FONT_NAME, size: 10 };
        ws.getCell(row, 1).fill  = WHITE_FILL as ExcelJS.Fill;
        applyBorder(ws.getCell(row, 1));
        ws.getCell(row, 2).value = s.freqPct;
        ws.getCell(row, 2).fill  = YELLOW_FILL as ExcelJS.Fill;
        ws.getCell(row, 2).alignment = { horizontal: "center" };
        ws.getCell(row, 2).font  = { name: FONT_NAME, size: 10, bold: true, ...ORANGE_FONT };
        applyBorder(ws.getCell(row, 2));
        ws.getRow(row).height = 16; row++;
      }
      ws.getRow(row).height = 6; row++;
    }

    if (riscoPresenca.length > 0) {
      const h = ws.getCell(row, 1);
      h.value = "ALUNOS EM RISCO DE PRESENÇA (<75%)";
      h.font  = { name: FONT_NAME, bold: true, size: 10, color: { argb: "FF9C0006" } };
      h.fill  = RED_FILL as ExcelJS.Fill;
      h.alignment = { horizontal: "center", vertical: "middle" };
      ws.mergeCells(row, 1, row, 3); ws.getRow(row).height = 18;
      applyBorder(h); row++;
      for (const s of riscoPresenca) {
        ws.getCell(row, 1).value = s.name;
        ws.getCell(row, 1).font  = { name: FONT_NAME, size: 10 };
        ws.getCell(row, 1).fill  = WHITE_FILL as ExcelJS.Fill;
        applyBorder(ws.getCell(row, 1));
        ws.getCell(row, 2).value = s.freqPct;
        ws.getCell(row, 2).fill  = RED_FILL as ExcelJS.Fill;
        ws.getCell(row, 2).alignment = { horizontal: "center" };
        ws.getCell(row, 2).font  = { name: FONT_NAME, size: 10, bold: true, ...RED_FONT };
        applyBorder(ws.getCell(row, 2));
        ws.getRow(row).height = 16; row++;
      }
      ws.getRow(row).height = 6;
      row++;
    }

    const rankingRed = ativos
      .map((s) => ({
        name: s.name,
        count: data.disciplines.filter((d) => {
          const m = s.grades[d]?.media;
          if (isNumeric(m)) return Number(m) < 5;
          return isEmaLetter(m) && emaLetterInsuf(m);
        }).length,
      }))
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count);

    if (rankingRed.length > 0) {
      ws.getRow(row).height = 8; row++;

      const rh = ws.getCell(row, 1);
      rh.value = "RANKING — ALUNOS COM NOTAS VERMELHAS (< 5 ou EP)";
      rh.font  = WHITE_FONT as ExcelJS.Font;
      rh.fill  = BLUE_HDR_FILL as ExcelJS.Fill;
      rh.alignment = { horizontal: "center", vertical: "middle" };
      rh.border = THICK_OUTER as ExcelJS.Borders;
      ws.mergeCells(row, 1, row, TOTAL_COLS);
      ws.getRow(row).height = 18; row++;

      ["Aluno", "Qtd. Notas Vermelhas", "Alerta", "", "", ""].forEach((h, i) => {
        if (!h) return;
        const c = ws.getCell(row, i + 1);
        c.value = h; c.font = { name: FONT_NAME, bold: true, size: 10, color: { argb: "FF1F3864" } };
        c.fill  = LIGHT_HDR_FILL as ExcelJS.Fill;
        c.alignment = { horizontal: "center", vertical: "middle" };
        ws.getRow(row).height = 18;
        applyBorder(c);
      });
      row++;

      for (const s of rankingRed) {
        const isAlta = s.count > 3;
        const fill   = isAlta ? RED_FILL : YELLOW_FILL;
        const font   = isAlta ? RED_FONT  : ORANGE_FONT;
        const alerta = isAlta ? "🔴 Crítico (>3)"  : "⚠ Atenção (1–3)";

        const nc = ws.getCell(row, 1);
        nc.value = s.name; nc.font = { name: FONT_NAME, size: 10 };
        nc.fill  = WHITE_FILL as ExcelJS.Fill;
        nc.alignment = { vertical: "middle" };
        applyBorder(nc);

        const cc = ws.getCell(row, 2);
        cc.value = s.count;
        cc.font  = { name: FONT_NAME, size: 11, bold: true, ...font };
        cc.fill  = fill as ExcelJS.Fill;
        cc.alignment = { horizontal: "center", vertical: "middle" };
        applyBorder(cc);

        const ac = ws.getCell(row, 3);
        ac.value = alerta;
        ac.font  = { name: FONT_NAME, size: 9, bold: true, ...font };
        ac.fill  = fill as ExcelJS.Fill;
        ac.alignment = { horizontal: "center", vertical: "middle" };
        applyBorder(ac);

        ws.getRow(row).height = 16; row++;
      }
    }
  }
}

// ─── Sheet 2 — Mapão ─────────────────────────────────────────────────────────

function colLetter(n: number): string {
  let s = '';
  while (n > 0) { s = String.fromCharCode(64 + ((n - 1) % 26 + 1)) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function buildMapao(wb: ExcelJS.Workbook, data: AtaCsvData, bimestre: string, includedBlankDiscs: string[] = []):
  { firstDataRow: number; lastDataRow: number; discMCols: { disc: string; col: string }[]; situCol: string; freqCol: string; freqAnCol: string } {
  const ws = wb.addWorksheet("Mapão");

  const DISC_COUNT = data.disciplines.length;
  const TOT_START  = 3 + DISC_COUNT * 4; // first column of TOTAL group (1-indexed)

  // Column widths (A3 landscape — more room)
  const cols: Partial<ExcelJS.Column>[] = [
    { width: 42 }, // ALUNO
    { width: 15 }, // SITUAÇÃO
  ];
  for (let i = 0; i < DISC_COUNT; i++) {
    cols.push({ width: 5 }, { width: 8 }, { width: 6 }, { width: 6 }); // Nº M F AC
  }
  cols.push({ width: 7 }, { width: 8 }, { width: 8 }, { width: 9 }); // TF Fre% FT An Fre An%
  ws.columns = cols;

  // Print settings — A3 landscape (única aba em A3 conforme requisito)
  ws.pageSetup.paperSize      = 8 as unknown as ExcelJS.PaperSize; // A3
  ws.pageSetup.orientation    = "landscape";
  ws.pageSetup.fitToPage      = true;
  ws.pageSetup.fitToWidth     = 1;
  ws.pageSetup.fitToHeight    = 0;
  ws.pageSetup.margins = { left: 0.79, right: 0.79, top: 0.79, bottom: 0.79, header: 0.3, footer: 0.3 };

  // ── Metadata rows (compact header for Mapão — no official header per requirements) ──
  const bimestreStr = BIMESTRE_LABEL[bimestre] ?? bimestre;
  const metaBlock: [string, string | undefined][] = [
    ["ATA", undefined],
    [data.meta.escola, undefined],
    ["Ano Letivo:", data.meta.anoLetivo],
    ["Diretoria:", data.meta.diretoria],
    ["Tipo de Ensino:", data.meta.tipoEnsino],
    ["Turma:", data.meta.turma],
    ["Bimestre:", bimestreStr],
    ["Tipo Fechamento:", data.meta.tipoFechamento],
    ["Total de Aulas:", data.meta.totalAulas],
  ];
  const TOTAL_COLS = 2 + DISC_COUNT * 4 + 4;
  for (const [i, [label, value]] of metaBlock.entries()) {
    const r = ws.addRow([]);
    const c1 = r.getCell(1);
    c1.value     = label;
    c1.alignment = { vertical: "middle", wrapText: true };
    if (i === 0) {
      c1.font  = { name: FONT_NAME, bold: true, size: 12, color: { argb: "FF1F3864" } };
      c1.fill  = LIGHT_HDR_FILL as ExcelJS.Fill;
      ws.mergeCells(r.number, 1, r.number, TOTAL_COLS);
      c1.alignment = { horizontal: "center", vertical: "middle" };
      r.height = 22;
    } else if (i === 1) {
      c1.font  = { name: FONT_NAME, bold: true, size: 10, color: { argb: "FF1F3864" } };
      c1.fill  = SUBHDR_FILL as ExcelJS.Fill;
      ws.mergeCells(r.number, 1, r.number, TOTAL_COLS);
      c1.alignment = { horizontal: "center", vertical: "middle" };
      r.height = 18;
    } else {
      c1.font  = { name: FONT_NAME, bold: true, size: 9 };
      if (value) { r.getCell(2).value = value; r.getCell(2).font = { name: FONT_NAME, size: 9 }; }
      r.height = 14;
    }
  }

  // Empty row
  ws.addRow([]).height = 4;

  // ── Discipline header row ──────────────────────────────────────────────────
  const discHeaderRow = ws.addRow([]);
  discHeaderRow.getCell(1).value = "ALUNO";
  discHeaderRow.getCell(2).value = "SITUAÇÃO";

  for (let di = 0; di < data.disciplines.length; di++) {
    const startCol = 3 + di * 4;
    const c = discHeaderRow.getCell(startCol);
    c.value = data.disciplines[di];
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.fill  = (di % 2 === 0 ? LIGHT_HDR_FILL : SUBHDR_FILL) as ExcelJS.Fill;
    c.font  = { name: FONT_NAME, bold: true, size: 9, color: { argb: "FF1F3864" } };
    c.border = discColBorderHdr(0) as ExcelJS.Borders;
    ws.mergeCells(discHeaderRow.number, startCol, discHeaderRow.number, startCol + 3);
  }
  // TOTAL header
  const totCell = discHeaderRow.getCell(TOT_START);
  totCell.value = "TOTAL";
  totCell.alignment = { horizontal: "center", vertical: "middle" };
  totCell.fill  = LIGHT_HDR_FILL as ExcelJS.Fill;
  totCell.font  = WHITE_FONT as ExcelJS.Font;
  totCell.fill  = BLUE_HDR_FILL as ExcelJS.Fill;
  totCell.border = { top: { style: "medium" }, bottom: { style: "medium" }, left: { style: "medium" }, right: { style: "medium" } } as ExcelJS.Borders;
  ws.mergeCells(discHeaderRow.number, TOT_START, discHeaderRow.number, TOT_START + 3);

  // Style name/situação headers
  [1, 2].forEach((col) => {
    const c = discHeaderRow.getCell(col);
    c.font  = { name: FONT_NAME, bold: true, size: 9, color: { argb: "FFFFFFFF" } };
    c.fill  = BLUE_HDR_FILL as ExcelJS.Fill;
    c.alignment = { horizontal: "center", vertical: "middle" };
    applyBorder(c, THICK_OUTER);
  });
  discHeaderRow.height = 22;

  // ── Sub-header row (Nº M F AC) ────────────────────────────────────────────
  const subRow = ws.addRow([]);
  subRow.getCell(1).value = "";
  subRow.getCell(2).value = "";
  [1, 2].forEach((col) => {
    subRow.getCell(col).fill = BLUE_HDR_FILL as ExcelJS.Fill;
    applyBorder(subRow.getCell(col), THICK_OUTER);
  });

  for (let di = 0; di < data.disciplines.length; di++) {
    const sc = 3 + di * 4;
    const fill = (di % 2 === 0 ? LIGHT_HDR_FILL : SUBHDR_FILL) as ExcelJS.Fill;
    ["Nº", "M", "F", "AC"].forEach((h, hi) => {
      const c = subRow.getCell(sc + hi);
      c.value = h;
      c.font  = { name: FONT_NAME, bold: true, size: 9, color: { argb: "FF1F3864" } };
      c.alignment = { horizontal: "center", vertical: "middle" };
      c.fill  = fill;
      c.border = discColBorder(hi) as ExcelJS.Borders;
    });
  }
  ["TF", "Fre(%)", "FT An", "Fre An(%)"].forEach((h, hi) => {
    const c = subRow.getCell(TOT_START + hi);
    c.value = h; c.font = { name: FONT_NAME, bold: true, size: 8, color: { argb: "FF1F3864" } };
    c.alignment = { horizontal: "center", vertical: "middle" };
    c.fill = SUBHDR_FILL as ExcelJS.Fill;
    c.border = totalColBorder(hi, 4) as ExcelJS.Borders;
  });
  subRow.height = 16;

  // Freeze panes
  ws.views = [{ state: "frozen", xSplit: 2, ySplit: subRow.number }];
  ws.pageSetup.printTitlesRow = `1:${subRow.number}`;

  // ── Student rows ───────────────────────────────────────────────────────────
  const firstDataRow = subRow.number + 1;
  for (let si = 0; si < data.students.length; si++) {
    const s   = data.students[si];
    const inactive = isInactiveRow(s.situacao);
    const r   = ws.addRow([]);
    r.height  = 15;

    // Base row fill — bright yellow for inactive, alternating white/light otherwise
    const rowFill: Partial<ExcelJS.Fill> = inactive
      ? INACTIVE_FILL
      : si % 2 === 0 ? WHITE_FILL : ROW_ALT_FILL;

    // Name cell
    const nc = r.getCell(1);
    nc.value     = s.name;
    nc.font      = { name: FONT_NAME, size: 9, bold: inactive };
    nc.fill      = rowFill as ExcelJS.Fill;
    nc.alignment = { vertical: "middle", wrapText: false };
    applyBorder(nc, { ...THIN_BORDER, left: { style: "medium" } });

    // Situação cell
    const sc2 = r.getCell(2);
    sc2.value     = s.situacao;
    sc2.font      = { name: FONT_NAME, size: 9, bold: inactive, color: inactive ? { argb: "FF7F4F0E" } : { argb: "FF444444" } };
    sc2.fill      = rowFill as ExcelJS.Fill;
    sc2.alignment = { horizontal: "center", vertical: "middle" };
    applyBorder(sc2, { ...THIN_BORDER, right: { style: "medium" } });

    // Discipline columns
    for (let di = 0; di < data.disciplines.length; di++) {
      const d   = data.disciplines[di];
      const g   = s.grades[d];
      const sc  = 3 + di * 4;

      // Nº
      const cnr = r.getCell(sc);
      cnr.value = g?.num ?? "";
      cnr.alignment = { horizontal: "center", vertical: "middle" };
      cnr.fill  = inactive ? INACTIVE_FILL as ExcelJS.Fill : (di % 2 === 0 ? WHITE_FILL : DISC_ALT_FILL) as ExcelJS.Fill;
      cnr.font  = { name: FONT_NAME, size: 9 };
      cnr.border = discColBorder(0) as ExcelJS.Borders;

      // M — média (fill dinâmico via CF rules adicionadas após o loop de alunos)
      const mv  = g?.media ?? "-";
      const cmr = r.getCell(sc + 1);
      cmr.value = isNumeric(mv) ? Number(mv) : String(mv);
      cmr.alignment = { horizontal: "center", vertical: "middle" };
      cmr.font  = { name: FONT_NAME, size: 9 };
      if (inactive) {
        // Linha inativa fica estática (não será editada)
        cmr.fill = INACTIVE_FILL as ExcelJS.Fill;
        if (isNumeric(mv) && Number(mv) < 5)   cmr.font = { ...cmr.font, ...RED_FONT };
        else if (isNumeric(mv))                  cmr.font = { ...cmr.font, ...BLUE_FONT };
        else if (isEmaLetter(mv)) cmr.font = { ...cmr.font, ...(emaLetterInsuf(mv) ? RED_FONT : BLUE_FONT) };
      } else {
        // Sem fill estático — CF rules assumem o controle da cor
        cmr.fill = (di % 2 === 0 ? WHITE_FILL : DISC_ALT_FILL) as ExcelJS.Fill;
      }
      cmr.border = discColBorder(1) as ExcelJS.Borders;

      // F
      const cfr = r.getCell(sc + 2);
      cfr.value = g?.faltas ?? 0; cfr.alignment = { horizontal: "center", vertical: "middle" };
      cfr.fill  = inactive ? INACTIVE_FILL as ExcelJS.Fill : (di % 2 === 0 ? WHITE_FILL : DISC_ALT_FILL) as ExcelJS.Fill;
      cfr.font  = { name: FONT_NAME, size: 9 };
      cfr.border = discColBorder(2) as ExcelJS.Borders;

      // AC
      const car = r.getCell(sc + 3);
      car.value = g?.ac ?? 0; car.alignment = { horizontal: "center", vertical: "middle" };
      car.fill  = inactive ? INACTIVE_FILL as ExcelJS.Fill : (di % 2 === 0 ? WHITE_FILL : DISC_ALT_FILL) as ExcelJS.Fill;
      car.font  = { name: FONT_NAME, size: 9 };
      car.border = discColBorder(3) as ExcelJS.Borders;
    }

    // TOTAL columns
    const totFill = inactive ? INACTIVE_FILL : rowFill;

    r.getCell(TOT_START).value = s.totalFaltas;
    r.getCell(TOT_START).alignment = { horizontal: "center", vertical: "middle" };
    r.getCell(TOT_START).font = { name: FONT_NAME, size: 9 };
    r.getCell(TOT_START).fill = totFill as ExcelJS.Fill;
    r.getCell(TOT_START).border = totalColBorder(0, 4) as ExcelJS.Borders;

    // Freq% — armazenar como número (fill via CF rules)
    const freqVal  = parseFreq(s.freqPct);
    const freqCell = r.getCell(TOT_START + 1);
    freqCell.value = freqVal;  // número 0-100, não string
    freqCell.numFmt = '0"%"';  // exibe "95%" mas armazena 95
    freqCell.alignment = { horizontal: "center", vertical: "middle" };
    freqCell.font = { name: FONT_NAME, size: 9 };
    freqCell.fill = inactive ? INACTIVE_FILL as ExcelJS.Fill : (si % 2 === 0 ? WHITE_FILL : ROW_ALT_FILL) as ExcelJS.Fill;
    freqCell.border = totalColBorder(1, 4) as ExcelJS.Borders;

    r.getCell(TOT_START + 2).value = s.ftAn;
    r.getCell(TOT_START + 2).alignment = { horizontal: "center", vertical: "middle" };
    r.getCell(TOT_START + 2).font = { name: FONT_NAME, size: 9 };
    r.getCell(TOT_START + 2).fill = totFill as ExcelJS.Fill;
    r.getCell(TOT_START + 2).border = totalColBorder(2, 4) as ExcelJS.Borders;

    // Freq An% — mesmo padrão
    const freqAnVal  = parseFreq(s.freqAnPct);
    const freqAnCell = r.getCell(TOT_START + 3);
    freqAnCell.value = freqAnVal;
    freqAnCell.numFmt = '0"%"';
    freqAnCell.alignment = { horizontal: "center", vertical: "middle" };
    freqAnCell.font = { name: FONT_NAME, size: 9 };
    freqAnCell.fill = inactive ? INACTIVE_FILL as ExcelJS.Fill : (si % 2 === 0 ? WHITE_FILL : ROW_ALT_FILL) as ExcelJS.Fill;
    freqAnCell.border = totalColBorder(3, 4) as ExcelJS.Borders;
  }

  // ── CF rules: todas as colunas M (média) e frequência ────────────────────────
  // Substitui fills estáticos por Formatação Condicional real do Excel.
  // Qualquer edição manual na planilha muda a cor automaticamente.
  {
    const lastDataRow = firstDataRow + data.students.length - 1;

    // Helper para adicionar CF a uma coluna
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addCF = (ref: string, rules: unknown[]) => (ws as any).addConditionalFormatting({ ref, rules });

    for (let di = 0; di < data.disciplines.length; di++) {
      const mediaCol = 3 + di * 4 + 1; // Nº=+0, M=+1, F=+2, AC=+3
      const c = colLetter(mediaCol);
      const ref = `${c}${firstDataRow}:${c}${lastDataRow}`;
      addCF(ref, [
        // Numérico < 5 → vermelho
        { type: 'expression', priority: 1, formulae: [`AND(ISNUMBER(${c}${firstDataRow}),${c}${firstDataRow}<5)`],
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFC7CE' } }, font: { color: { argb: 'FF9C0006' }, bold: true } } },
        // Numérico >= 5 → azul
        { type: 'expression', priority: 2, formulae: [`AND(ISNUMBER(${c}${firstDataRow}),${c}${firstDataRow}>=5)`],
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFDCE6F1' } }, font: { color: { argb: 'FF1F5C8B' }, bold: true } } },
        // EP (insuficiente) → vermelho
        { type: 'expression', priority: 3, formulae: [`${c}${firstDataRow}="EP"`],
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFC7CE' } }, font: { color: { argb: 'FF9C0006' }, bold: true } } },
        // ET ou ES (suficiente) → azul
        { type: 'expression', priority: 4, formulae: [`OR(${c}${firstDataRow}="ET",${c}${firstDataRow}="ES")`],
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFDCE6F1' } }, font: { color: { argb: 'FF1F5C8B' }, bold: true } } },
        // Vazio ou "-" → amarelo
        { type: 'expression', priority: 5, formulae: [`OR(${c}${firstDataRow}="",${c}${firstDataRow}="-")`],
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFF2CC' } }, font: { color: { argb: 'FF7F4F0E' } } } },
      ]);
    }

    // CF para Fre% e Fre An% (valores numéricos 0-100)
    for (const freqColOffset of [1, 3]) {
      const fc  = colLetter(TOT_START + freqColOffset);
      const ref = `${fc}${firstDataRow}:${fc}${lastDataRow}`;
      addCF(ref, [
        { type: 'cellIs', operator: 'lessThan',           formulae: [75], priority: 1,
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFC7CE' } }, font: { color: { argb: 'FF9C0006' }, bold: true } } },
        { type: 'expression', priority: 2, formulae: [`AND(${fc}${firstDataRow}>=75,${fc}${firstDataRow}<90)`],
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFF2CC' } }, font: { color: { argb: 'FF7F4F0E' } } } },
        { type: 'cellIs', operator: 'greaterThanOrEqual', formulae: [90], priority: 3,
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFD9EAD3' } } } },
      ]);
    }
  }

  // ── Legend (will print on next A3 page due to fitToPage) ─────────────────
  ws.addRow([]).height = 10;
  const legHdr = ws.addRow(["LEGENDA"]);
  legHdr.getCell(1).font = { name: FONT_NAME, bold: true, size: 10, color: { argb: "FF1F3864" } };
  legHdr.getCell(1).fill = LIGHT_HDR_FILL as ExcelJS.Fill;
  legHdr.height = 18;
  ws.mergeCells(legHdr.number, 1, legHdr.number, 6);

  const legendItems = [
    "M — Menção (resultado informado no fechamento bimestral)",
    "ET — Engajamento Total (≥5, azul)  ·  ES — Engajamento Satisfatório (≥5, azul)  ·  EP — Engajamento Parcial (<5, vermelho)",
    "F — Frequência  ·  AC — Ausência Compensada  ·  TF — Total de Faltas",
    "Fre% — Frequência no Bimestre  ·  FT An — Faltas no Ano  ·  Fre An% — Frequência Anual",
    "Linha amarela — Aluno transferido / baixado (não compõe resultado)",
    "Fundo vermelho na nota — Média insuficiente (<5)  ·  Fundo amarelo — Nota não lançada",
    "Verde na freq — ≥90%  ·  Amarelo — 75–89%  ·  Vermelho — <75%",
  ];
  for (const item of legendItems) {
    const lr = ws.addRow([item]);
    lr.getCell(1).font = { name: FONT_NAME, size: 9, italic: true };
    lr.getCell(1).fill = WHITE_FILL as ExcelJS.Fill;
    lr.height = 14;
    ws.mergeCells(lr.number, 1, lr.number, 8);
  }

  // Retorna info para buildDados usar COUNTIF referenciando este sheet
  const lastDataRow = firstDataRow + data.students.length - 1;
  const discMCols = data.disciplines.map((disc, di) => ({
    disc,
    col: colLetter(3 + di * 4 + 1), // coluna M desta disciplina
  }));
  return {
    firstDataRow, lastDataRow, discMCols,
    situCol:  'B',
    freqCol:  colLetter(TOT_START + 1),
    freqAnCol: colLetter(TOT_START + 3),
  };
}

// ─── Sheet 3 — Assinaturas ───────────────────────────────────────────────────

function buildAssinaturas(
  wb: ExcelJS.Workbook,
  data: AtaCsvData,
  teachers: ClassTeacher[],
  directors: { name: string; cargo: string }[],
  coordinators: { name: string; cargo: string }[],
  bimestre: string,
) {
  const ws = wb.addWorksheet("Assinaturas");
  ws.pageSetup.paperSize   = 9; // A4
  ws.pageSetup.orientation = "portrait";
  ws.pageSetup.fitToPage   = true;
  ws.pageSetup.fitToWidth  = 1;
  ws.pageSetup.fitToHeight = 0;
  ws.pageSetup.margins = { left: 0.79, right: 0.79, top: 0.79, bottom: 0.79, header: 0.3, footer: 0.3 };

  const TOTAL_COLS = 3;
  ws.columns = [{ width: 42 }, { width: 32 }, { width: 36 }];

  let row = addOfficialHeader(ws, TOTAL_COLS);

  // Empty row
  ws.getRow(row).height = 8; row++;

  // Document title
  const titleCell = ws.getCell(row, 1);
  titleCell.value = "LISTA DE ASSINATURAS — CONSELHO DE CLASSE";
  titleCell.font  = { name: FONT_NAME, bold: true, size: 13, color: { argb: "FF1F3864" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.fill  = LIGHT_HDR_FILL as ExcelJS.Fill;
  titleCell.border = THICK_OUTER as ExcelJS.Borders;
  ws.mergeCells(row, 1, row, TOTAL_COLS);
  ws.getRow(row).height = 24; row++;

  const subCell = ws.getCell(row, 1);
  subCell.value = `Turma: ${data.meta.turma}  ·  ${BIMESTRE_LABEL[bimestre] ?? bimestre}  ·  Ano Letivo: ${data.meta.anoLetivo}`;
  subCell.font  = { name: FONT_NAME, size: 10, italic: true, color: { argb: "FF1F3864" } };
  subCell.alignment = { horizontal: "center", vertical: "middle" };
  subCell.fill  = SUBHDR_FILL as ExcelJS.Fill;
  ws.mergeCells(row, 1, row, TOTAL_COLS);
  ws.getRow(row).height = 18; row++;
  ws.getRow(row).height = 6; row++;

  // Build section helper
  const buildSection = (title: string, items: { col1: string; col2: string }[]) => {
    // Section header
    const hdr = ws.getCell(row, 1);
    hdr.value = title;
    hdr.font  = WHITE_FONT as ExcelJS.Font;
    hdr.fill  = BLUE_HDR_FILL as ExcelJS.Fill;
    hdr.alignment = { horizontal: "center", vertical: "middle" };
    hdr.border = THICK_OUTER as ExcelJS.Borders;
    ws.mergeCells(row, 1, row, TOTAL_COLS);
    ws.getRow(row).height = 20;
    (row as number)++;

    // Column headers
    const ch = ws.getRow(row);
    ["Nome Completo", "Cargo / Disciplina", "Assinatura"].forEach((h, i) => {
      const c = ch.getCell(i + 1);
      c.value = h;
      c.font  = { name: FONT_NAME, bold: true, size: 9, color: { argb: "FF1F3864" } };
      c.fill  = SUBHDR_FILL as ExcelJS.Fill;
      c.alignment = { horizontal: "center", vertical: "middle" };
      applyBorder(c);
    });
    ws.getRow(row).height = 18;
    (row as number)++;

    // Data rows (double height for signature space)
    for (const item of items) {
      const r = ws.getRow(row);
      r.getCell(1).value = item.col1;
      r.getCell(1).font  = { name: FONT_NAME, size: 10 };
      r.getCell(1).fill  = WHITE_FILL as ExcelJS.Fill;
      r.getCell(1).alignment = { vertical: "bottom" };
      applyBorder(r.getCell(1));

      r.getCell(2).value = item.col2;
      r.getCell(2).font  = { name: FONT_NAME, size: 9, italic: true, color: { argb: "FF444444" } };
      r.getCell(2).fill  = WHITE_FILL as ExcelJS.Fill;
      r.getCell(2).alignment = { vertical: "bottom" };
      applyBorder(r.getCell(2));

      r.getCell(3).value = "";
      r.getCell(3).fill  = ROW_ALT_FILL as ExcelJS.Fill;
      r.getCell(3).border = {
        bottom: { style: "medium" }, top: { style: "thin" },
        left:   { style: "thin" },   right: { style: "thin" },
      } as ExcelJS.Borders;

      ws.getRow(row).height = 36; // double height for signatures
      (row as number)++;
    }

    // Placeholder rows if section is empty
    if (items.length === 0) {
      for (let i = 0; i < 3; i++) {
        const r = ws.getRow(row);
        r.getCell(1).value = ""; r.getCell(1).fill = WHITE_FILL as ExcelJS.Fill; applyBorder(r.getCell(1));
        r.getCell(2).value = ""; r.getCell(2).fill = WHITE_FILL as ExcelJS.Fill; applyBorder(r.getCell(2));
        r.getCell(3).value = ""; r.getCell(3).fill = ROW_ALT_FILL as ExcelJS.Fill;
        r.getCell(3).border = { bottom: { style: "medium" }, top: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } as ExcelJS.Borders;
        ws.getRow(row).height = 36; (row as number)++;
      }
    }
    ws.getRow(row).height = 10; (row as number)++;
  };

  buildSection(
    "DIREÇÃO",
    directors.map((d) => ({ col1: d.name, col2: d.cargo })),
  );
  buildSection(
    "COORDENAÇÃO PEDAGÓGICA",
    coordinators.map((c) => ({ col1: c.name, col2: c.cargo })),
  );
  buildSection(
    "PROFESSORES",
    teachers.map((t) => ({ col1: t.name, col2: t.discipline })),
  );

  // Footer note
  ws.getRow(row).height = 6; row++;
  const footCell = ws.getCell(row, 1);
  footCell.value = `Documento gerado pelo samba paper  ·  ${new Date().toLocaleDateString("pt-BR")}`;
  footCell.font  = { name: FONT_NAME, size: 8, italic: true, color: { argb: "FF888888" } };
  footCell.alignment = { horizontal: "center" };
  ws.mergeCells(row, 1, row, TOTAL_COLS);
}

// ─── Sheet 4 — ATA ───────────────────────────────────────────────────────────

function buildAta(wb: ExcelJS.Workbook, data: AtaCsvData, bimestre: string) {
  const ws = wb.addWorksheet("ATA");
  ws.pageSetup.paperSize      = 9; // A4
  ws.pageSetup.orientation    = "portrait";
  ws.pageSetup.fitToPage      = true;
  ws.pageSetup.fitToWidth     = 1;
  ws.pageSetup.fitToHeight    = 0;
  ws.pageSetup.margins = { left: 0.79, right: 0.79, top: 0.79, bottom: 0.79, header: 0.3, footer: 0.3 };

  // Main disciplines: those with at least one numeric or EMA letter grade
  const mainDiscs = data.disciplines.filter((d) =>
    data.students.some((s) => isNumeric(s.grades[d]?.media) || isEmaLetter(s.grades[d]?.media))
  );

  const TOTAL_COLS = 2 + mainDiscs.length + 2; // Nome + RA + discs + Freq + Resultado

  ws.columns = [
    { width: 40 }, // Nome
    { width: 12 }, // RA
    ...mainDiscs.map(() => ({ width: 8 })),
    { width: 10 }, // Freq
    { width: 14 }, // Resultado
  ];

  let row = addOfficialHeader(ws, TOTAL_COLS);

  // Title block
  const titles: [string, Partial<ExcelJS.Font>][] = [
    ["RESULTADO DO RENDIMENTO ESCOLAR", { name: FONT_NAME, bold: true, size: 13, color: { argb: "FF1F3864" } }],
    [data.meta.escola, { name: FONT_NAME, bold: true, size: 11 }],
    [`${data.meta.diretoria} — ${data.meta.tipoEnsino}`, { name: FONT_NAME, size: 9 }],
    [`Turma: ${data.meta.turma}  ·  ${BIMESTRE_LABEL[bimestre] ?? bimestre}  ·  Ano Letivo: ${data.meta.anoLetivo}`,
      { name: FONT_NAME, size: 10, italic: true, color: { argb: "FF1F3864" } }],
  ];
  for (const [i, [txt, font]] of titles.entries()) {
    const c = ws.getCell(row, 1);
    c.value = txt; c.font = font as ExcelJS.Font;
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.fill  = (i === 0 ? LIGHT_HDR_FILL : WHITE_FILL) as ExcelJS.Fill;
    if (i === 0) applyBorder(c, THICK_OUTER);
    ws.mergeCells(row, 1, row, TOTAL_COLS);
    ws.getRow(row).height = i === 0 ? 22 : 16;
    row++;
  }
  ws.getRow(row).height = 6; row++;

  // Column headers
  const hdrRow = ws.getRow(row);
  hdrRow.height = 80; // tall for rotated text

  hdrRow.getCell(1).value = "Nome do(a) Aluno(a)";
  hdrRow.getCell(2).value = "RA";
  mainDiscs.forEach((d, di) => {
    const c = hdrRow.getCell(3 + di);
    c.value = d;
    c.alignment = { horizontal: "center", vertical: "bottom", textRotation: 90, wrapText: false };
    c.font  = { name: FONT_NAME, bold: true, size: 8, color: { argb: "FF1F3864" } };
    c.fill  = (di % 2 === 0 ? LIGHT_HDR_FILL : SUBHDR_FILL) as ExcelJS.Fill;
    applyBorder(c);
  });
  hdrRow.getCell(3 + mainDiscs.length).value = "Freq.";
  hdrRow.getCell(3 + mainDiscs.length + 1).value = "Resultado Final";
  [1, 2, 3 + mainDiscs.length, 3 + mainDiscs.length + 1].forEach((col) => {
    const c = hdrRow.getCell(col);
    c.font  = { name: FONT_NAME, bold: true, size: 9, color: { argb: "FF1F3864" } };
    c.fill  = LIGHT_HDR_FILL as ExcelJS.Fill;
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    applyBorder(c);
  });
  row++;

  ws.pageSetup.printTitlesRow = `1:${row - 1}`;
  ws.views = [{ state: "frozen", xSplit: 0, ySplit: row - 1 }];

  // Student rows
  for (let si = 0; si < data.students.length; si++) {
    const s  = data.students[si];
    const r  = ws.getRow(row);
    r.height = 15;

    const bg: Partial<ExcelJS.Fill> = si % 2 === 0 ? WHITE_FILL : ROW_ALT_FILL;

    r.getCell(1).value = s.name;
    r.getCell(1).font  = { name: FONT_NAME, size: 9 };
    r.getCell(1).fill  = bg as ExcelJS.Fill;
    r.getCell(1).alignment = { vertical: "middle", wrapText: false };
    applyBorder(r.getCell(1));

    r.getCell(2).value = "";
    r.getCell(2).font  = { name: FONT_NAME, size: 9 };
    r.getCell(2).fill  = bg as ExcelJS.Fill;
    r.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
    applyBorder(r.getCell(2));

    mainDiscs.forEach((d, di) => {
      const m  = s.grades[d]?.media;
      const c  = r.getCell(3 + di);
      c.value  = isNumeric(m) ? Number(m) : (m === "-" ? "-" : String(m ?? ""));
      c.alignment = { horizontal: "center", vertical: "middle" };
      c.font   = { name: FONT_NAME, size: 9 };
      if (isEmaLetter(m)) {
        if (emaLetterInsuf(m)) { c.fill = RED_FILL as ExcelJS.Fill;  c.font = { name: FONT_NAME, size: 9, ...RED_FONT };  }
        else                   { c.fill = bg as ExcelJS.Fill;         c.font = { name: FONT_NAME, size: 9, ...BLUE_FONT }; }
      } else if (String(m) === "-")                 { c.fill = YELLOW_FILL as ExcelJS.Fill; c.font = { name: FONT_NAME, size: 9, ...ORANGE_FONT }; }
      else if (isNumeric(m) && Number(m) < 5)       { c.fill = RED_FILL as ExcelJS.Fill;    c.font = { name: FONT_NAME, size: 9, ...RED_FONT };    }
      else if (isNumeric(m))                        { c.fill = bg as ExcelJS.Fill;           c.font = { name: FONT_NAME, size: 9, ...BLUE_FONT };   }
      else                                          { c.fill = bg as ExcelJS.Fill; }
      applyBorder(c);
    });

    const freqVal  = parseFreq(s.freqPct);
    const freqCell = r.getCell(3 + mainDiscs.length);
    freqCell.value = s.freqPct;
    freqCell.alignment = { horizontal: "center", vertical: "middle" };
    freqCell.font = { name: FONT_NAME, size: 9 };
    if (freqVal >= 90)      freqCell.fill = GREEN_FILL  as ExcelJS.Fill;
    else if (freqVal >= 75) freqCell.fill = YELLOW_FILL as ExcelJS.Fill;
    else                  { freqCell.fill = RED_FILL as ExcelJS.Fill; freqCell.font = { name: FONT_NAME, size: 9, bold: true, ...RED_FONT }; }
    applyBorder(freqCell);

    const hasInsuf = mainDiscs.some((d) => {
      const m = s.grades[d]?.media;
      if (isNumeric(m)) return Number(m) < 5;
      return isEmaLetter(m) && emaLetterInsuf(m);
    });
    const resultado = !isActive(s.situacao) ? s.situacao : hasInsuf ? "Reprovado" : "Aprovado";
    const resCell   = r.getCell(3 + mainDiscs.length + 1);
    resCell.value   = resultado;
    resCell.alignment = { horizontal: "center", vertical: "middle" };
    resCell.font    = { name: FONT_NAME, size: 9, bold: true };
    if (resultado === "Aprovado")  { resCell.fill = GREEN_FILL as ExcelJS.Fill; resCell.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: "FF375623" } }; }
    else if (resultado === "Reprovado") { resCell.fill = RED_FILL as ExcelJS.Fill; resCell.font = { name: FONT_NAME, size: 9, bold: true, ...RED_FONT }; }
    else { resCell.fill = YELLOW_FILL as ExcelJS.Fill; resCell.font = { name: FONT_NAME, size: 9, bold: true, ...ORANGE_FONT }; }
    applyBorder(resCell);
    row++;
  }

  // Legend
  row++;
  const leg = ws.getRow(row);
  leg.getCell(1).value = "Legenda: M — Média  ·  ET — Engajamento Total  ·  ES — Engajamento Satisfatório  ·  EP — Engajamento Parcial  ·  F — Frequência  ·  AC — Ausência Compensada";
  leg.getCell(1).font  = { name: FONT_NAME, size: 8, italic: true, color: { argb: "FF666666" } };
  leg.getCell(1).fill  = SUBHDR_FILL as ExcelJS.Fill;
  ws.mergeCells(row, 1, row, TOTAL_COLS);
  leg.height = 16;
}

// ─── Date serial helper ───────────────────────────────────────────────────────

function formatExcelDate(v: string): string {
  // Detect Excel date serial numbers (e.g. "40368.99967592592")
  const n = parseFloat(v);
  if (isNaN(n) || n < 25569 || n > 73413) return v; // outside 1970–2101 range
  if (!/^\d{5}(\.\d+)?$/.test(v.trim())) return v;   // must look like a 5-digit number
  const d = new Date(Math.floor(n - 25569) * 86400000);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

// ─── Sheet — Dados Complementares ────────────────────────────────────────────

interface GenericCsvData2 { fileName: string; headers: string[]; rows: string[][] }

function buildDadosComplementares(wb: ExcelJS.Workbook, data: GenericCsvData2) {
  const ws = wb.addWorksheet("Dados Complementares");
  ws.pageSetup.paperSize   = 9;           // A4
  ws.pageSetup.orientation = "portrait";
  ws.pageSetup.fitToPage   = true;
  ws.pageSetup.fitToWidth  = 1;
  ws.pageSetup.fitToHeight = 0;
  ws.pageSetup.margins = { left: 0.79, right: 0.79, top: 0.79, bottom: 0.79, header: 0.3, footer: 0.3 };

  const TOTAL_COLS = Math.max(data.headers.length, 1);
  // Distribute column widths: readable but compact enough for portrait A4
  const colWidth = Math.max(12, Math.min(30, Math.floor(160 / TOTAL_COLS)));
  ws.columns = data.headers.map(() => ({ width: colWidth }));

  // Official government header (identical to other sheets)
  let row = addOfficialHeader(ws, TOTAL_COLS);

  // Sheet title
  const titleCell = ws.getCell(row, 1);
  titleCell.value = "DADOS COMPLEMENTARES DOS ALUNOS";
  titleCell.font  = { name: FONT_NAME, bold: true, size: 13, color: { argb: "FF1F3864" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.fill  = LIGHT_HDR_FILL as ExcelJS.Fill;
  titleCell.border = THICK_OUTER as ExcelJS.Borders;
  ws.mergeCells(row, 1, row, TOTAL_COLS);
  ws.getRow(row).height = 28; row++;

  // Subtitle: filename + record count
  const subtCell = ws.getCell(row, 1);
  subtCell.value = `Arquivo: ${data.fileName}  ·  ${data.rows.length} registro${data.rows.length !== 1 ? "s" : ""}  ·  ${data.headers.length} coluna${data.headers.length !== 1 ? "s" : ""}`;
  subtCell.font  = { name: FONT_NAME, size: 9, italic: true, color: { argb: "FF555555" } };
  subtCell.alignment = { horizontal: "center", vertical: "middle" };
  subtCell.fill  = SUBHDR_FILL as ExcelJS.Fill;
  ws.mergeCells(row, 1, row, TOTAL_COLS);
  ws.getRow(row).height = 16; row++;

  ws.getRow(row).height = 4; row++;

  // CSV header row — exact column names from the imported file
  const csvHeaderRow = row;
  data.headers.forEach((h, i) => {
    const c = ws.getCell(row, i + 1);
    c.value = h;
    c.font  = WHITE_FONT as ExcelJS.Font;
    c.fill  = BLUE_HDR_FILL as ExcelJS.Fill;
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    applyBorder(c, THICK_OUTER);
  });
  ws.getRow(row).height = 22; row++;

  // Data rows — exact CSV content, one cell per column
  data.rows.forEach((dataRow, ri) => {
    const exRow = ws.getRow(row);
    exRow.height = 16;
    dataRow.forEach((cell, ci) => {
      const c = exRow.getCell(ci + 1);
      c.value = formatExcelDate(cell);
      c.font  = { name: FONT_NAME, size: 9 };
      c.fill  = (ri % 2 === 0 ? WHITE_FILL : ROW_ALT_FILL) as ExcelJS.Fill;
      c.alignment = { vertical: "middle", wrapText: false };
      applyBorder(c);
    });
    row++;
  });

  ws.pageSetup.printTitlesRow = `1:${csvHeaderRow}`;
  ws.views = [{ state: "frozen", xSplit: 0, ySplit: csvHeaderRow }];

  // Footer
  ws.getRow(row).height = 8; row++;
  const footCell = ws.getCell(row, 1);
  footCell.value = `Total: ${data.rows.length} registros  ·  Gerado por samba paper  ·  ${new Date().toLocaleDateString("pt-BR")}`;
  footCell.font  = { name: FONT_NAME, size: 8, italic: true, color: { argb: "FF888888" } };
  footCell.alignment = { horizontal: "center" };
  ws.mergeCells(row, 1, row, TOTAL_COLS);
}


// ─── Route handler (v2) ───────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getAuthCookie();
  if (!token) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  let payload: Awaited<ReturnType<typeof verifyToken>>;
  try { payload = await verifyToken(token); } catch { return NextResponse.json({ error: "Não autenticado" }, { status: 401 }); }
  if (!canCreateAta(effectiveRole(payload))) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  const docId  = Number(id);
  if (!Number.isFinite(docId) || docId <= 0) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const school = payload.isAdmin && !payload.orgSlug ? null
    : await db.school.findFirst({ where: { organization: { slug: payload.orgSlug } }, select: { id: true, organizationId: true } });
  const doc = await db.lessDocument.findFirst({ where: { id: docId, ...(school ? { schoolId: school.id } : {}) } });
  if (!doc) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });

  let csvData: AtaCsvData;
  let bimestre = "";
  let notas    = "";
  let topicos  = "";
  let csvData2: GenericCsvData2 | null = null;
  let teachers: ClassTeacher[] = [];
  let includedBlankDiscs: string[] = [];

  try {
    const body = await req.json() as {
      csvData?: AtaCsvData;
      teachers?: ClassTeacher[];
      bimestre?: string;
      notas?: string;
      topicos?: string;
      csvData2?: GenericCsvData2;
      excludedDiscs?: string[];
      includedBlankDiscs?: string[];
    };
    const content = doc.content as Record<string, unknown>;
    if (body.csvData) {
      csvData  = body.csvData;
      bimestre = body.bimestre ?? String(content.bimestre ?? "");
    } else {
      if (!content.csvRaw) return NextResponse.json({ error: "Nenhum dado importado" }, { status: 400 });
      csvData  = JSON.parse(String(content.csvRaw));
      bimestre = String(content.bimestre ?? "");
    }
    notas    = body.notas    ?? String(content.notas    ?? "");
    topicos  = body.topicos  ?? String(content.topicos  ?? "");
    csvData2           = body.csvData2          ?? null;
    teachers           = body.teachers          ?? [];
    includedBlankDiscs = body.includedBlankDiscs ?? [];

    if (body.excludedDiscs?.length && csvData) {
      const excluded = new Set(body.excludedDiscs);
      csvData = {
        ...csvData,
        disciplines: csvData.disciplines.filter(d => !excluded.has(d)),
      };
    }
  } catch {
    return NextResponse.json({ error: "Erro ao processar dados" }, { status: 400 });
  }

  // Direção e coordenação da escola (assinaturas) — papéis por organização (v2)
  let directors: { name: string; cargo: string }[] = [];
  let coordinators: { name: string; cargo: string }[] = [];
  try {
    if (school) {
      const dirUsers = await db.user.findMany({
        where: {
          isActive: true,
          orgRoles: { some: { organizationId: school.organizationId, role: { in: ["PRINCIPAL", "VICE_PRINCIPAL"] } } },
        },
        select: { name: true, orgRoles: { where: { organizationId: school.organizationId }, select: { role: true } } },
        orderBy: { name: "asc" },
      });
      directors = dirUsers.map(u => ({
        name: u.name,
        cargo: u.orgRoles[0]?.role === "PRINCIPAL" ? "Diretora(o) de Escola" : "Vice-Diretora(o) de Escola",
      })).filter(d => !isHiddenStaff(d.name));

      const coordUsers = await db.user.findMany({
        where: {
          isActive: true,
          orgRoles: { some: { organizationId: school.organizationId, role: { in: ["COORDINATOR", "TEACHER_COORDINATOR"] } } },
        },
        select: { name: true },
        orderBy: { name: "asc" },
      });
      coordinators = coordUsers.map(u => ({ name: u.name, cargo: "Coordenador(a) Pedagógico(a)" }))
        .filter(c => !isHiddenStaff(c.name));
    }
  } catch {
    // se a consulta falhar, assinaturas saem com linhas em branco
  }

  const wb = new ExcelJS.Workbook();
  wb.creator    = "samba less";
  wb.created    = new Date();
  wb.properties = { date1904: false };

  buildResumo(wb, csvData!, bimestre, notas, topicos);
  const mapaoInfo = buildMapao(wb, csvData!, bimestre, includedBlankDiscs);
  buildDados(wb, csvData!, bimestre, mapaoInfo);
  if (csvData2) buildDadosComplementares(wb, csvData2);
  buildAssinaturas(wb, csvData!, teachers, directors, coordinators, bimestre);

  if (bimestre === "5") {
    buildAta(wb, csvData!, bimestre);
  }

  const buf   = await wb.xlsx.writeBuffer();
  const turma = csvData!.meta.turma.replace(/\s+/g, "_");

  return new NextResponse(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="ata_${turma}_${bimestre}.xlsx"`,
    },
  });
}
