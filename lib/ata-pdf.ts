import PDFDocument from 'pdfkit'
import { type AtaCsvData, type AtaMeta, type ClassTeacher, type GenericCsvData, isNumeric, isInactiveRow, parseFreq } from './ata'

const DARK   = '#0f0714'
const NAVY   = '#1F3864'
const INACT  = '#FFFF00'

function govtHeader(doc: InstanceType<typeof PDFDocument>, pageW: number, ml: number, mr: number, escola: string, diretoria: string) {
  const GOVT_H = 60
  doc.rect(0, 0, pageW, GOVT_H).fill('#ffffff')
  doc.moveTo(ml, GOVT_H - 0.5).lineTo(pageW - mr, GOVT_H - 0.5).strokeColor('#ddc8e8').lineWidth(0.8).stroke()
  const textW = pageW - ml - mr
  doc.font('Helvetica-Bold').fontSize(7).fillColor(DARK)
    .text('GOVERNO DO ESTADO DE SÃO PAULO – SECRETARIA DE ESTADO DA EDUCAÇÃO', ml, 10, { width: textW, align: 'center', lineBreak: false })
  doc.font('Helvetica').fontSize(6.5).fillColor(DARK)
    .text(escola || 'Escola', ml, 24, { width: textW, align: 'center', lineBreak: false })
    .text(diretoria || '', ml, 36, { width: textW, align: 'center', lineBreak: false })
  return GOVT_H
}

// ─── ATA de Resultado (5º Conceito) — portrait ────────────────────────────────

export function buildAtaPdf(data: AtaCsvData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const PAGE_W = 595.28, PAGE_H = 841.89, ML = 28, MR = 28, BOTTOM_M = 50
    const CONTENT_W = PAGE_W - ML - MR
    const mainDiscs = data.disciplines.filter(d => data.students.some(s => isNumeric(s.grades[d]?.media)))
    const students = data.students

    const NAME_W = 130, FREQ_W = 36, RESULT_W = 58
    const avail = CONTENT_W - (NAME_W + FREQ_W + RESULT_W)
    const DISC_W = mainDiscs.length > 0 ? Math.max(18, Math.floor(avail / mainDiscs.length)) : 24
    const ROW_H = 14, HDR1_H = 72, FONT = 6.5

    const doc = new PDFDocument({ size: 'A4', margin: 0 })
    const chunks: Buffer[] = []
    doc.on('data', c => chunks.push(c)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject)

    const cellText = (text: string, cx: number, cy: number, cw: number, ch: number, font: string, fs: number, color: string, align: 'left' | 'center' = 'center') => {
      doc.save(); doc.rect(cx, cy, cw, ch).clip()
      if (align === 'center') { const est = text.length * fs * 0.56; doc.font(font).fontSize(fs).fillColor(color).text(text, cx + Math.max(0.5, (cw - est) / 2), cy + (ch - fs) / 2, { lineBreak: false }) }
      else doc.font(font).fontSize(fs).fillColor(color).text(text, cx + 2, cy + (ch - fs) / 2, { lineBreak: false })
      doc.restore()
    }

    const drawPage = (isFirst: boolean): number => {
      if (!isFirst) doc.addPage()
      const h = govtHeader(doc, PAGE_W, ML, MR, data.meta.escola, data.meta.diretoria)
      const y = h + 10
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(DARK).text('ATA DE RESULTADO DO RENDIMENTO ESCOLAR', ML, y, { width: CONTENT_W, align: 'center', lineBreak: false })
      doc.font('Helvetica').fontSize(6.5).fillColor('#444')
        .text(`${data.meta.diretoria}  ·  ${data.meta.tipoEnsino}  ·  Turma: ${data.meta.turma}  ·  Ano Letivo: ${data.meta.anoLetivo}`, ML, y + 18, { width: CONTENT_W, align: 'center', lineBreak: false })
      doc.moveTo(ML, y + 32).lineTo(PAGE_W - MR, y + 32).strokeColor('#cccccc').lineWidth(0.5).stroke()
      return y + 38
    }

    const drawHeaders = (y: number): number => {
      let x = ML
      doc.rect(x, y, NAME_W, HDR1_H).fill(NAVY).stroke()
      doc.font('Helvetica-Bold').fontSize(7).fillColor('#fff').text('Nome do(a) Aluno(a)', x + 2, y + HDR1_H / 2 - 4, { width: NAME_W - 4, align: 'center', lineBreak: false })
      x += NAME_W
      for (let di = 0; di < mainDiscs.length; di++) {
        const fill = di % 2 === 0 ? '#2E5090' : '#3B62B0'
        doc.save(); doc.rect(x, y, DISC_W, HDR1_H).clip(); doc.rect(x, y, DISC_W, HDR1_H).fill(fill)
        const raw = mainDiscs[di]; const name = raw.length > 30 ? raw.slice(0, 29) + '…' : raw
        doc.translate(x + DISC_W / 2, y + HDR1_H - 4); doc.rotate(-90)
        doc.font('Helvetica-Bold').fontSize(5).fillColor('#fff').text(name, 3, -(DISC_W / 2 - 1), { lineBreak: false })
        doc.restore(); doc.rect(x, y, DISC_W, HDR1_H).strokeColor('#4a7acc').lineWidth(0.4).stroke()
        x += DISC_W
      }
      doc.rect(x, y, FREQ_W, HDR1_H).fill(NAVY).stroke()
      doc.save(); doc.rect(x, y, FREQ_W, HDR1_H).clip(); doc.translate(x + FREQ_W / 2, y + HDR1_H - 4); doc.rotate(-90)
      doc.font('Helvetica-Bold').fontSize(6).fillColor('#fff').text('Frequência', 3, -(FREQ_W / 2 - 1), { lineBreak: false }); doc.restore()
      x += FREQ_W
      doc.rect(x, y, RESULT_W, HDR1_H).fill(NAVY).stroke()
      doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#fff').text('Resultado\nFinal', x + 2, y + HDR1_H / 2 - 8, { width: RESULT_W - 4, align: 'center' })
      return y + HDR1_H
    }

    const drawRow = (s: AtaCsvData['students'][number], y: number, rowIdx: number) => {
      const inactive = isInactiveRow(s.situacao)
      const bg = inactive ? INACT : (rowIdx % 2 === 0 ? '#ffffff' : '#f2f6fc')
      let x = ML
      doc.rect(x, y, NAME_W, ROW_H).fill(bg).stroke(); cellText(s.name, x, y, NAME_W, ROW_H, 'Helvetica', FONT, DARK, 'left'); x += NAME_W
      for (let di = 0; di < mainDiscs.length; di++) {
        const g = s.grades[mainDiscs[di]]; const media = g?.media ?? '-'
        let cf = inactive ? INACT : bg, cc = DARK, fnt = 'Helvetica'
        if (!inactive) {
          if (String(media) === '-' || media === '' || media === null) cf = '#ffffc0'
          else if (isNumeric(media)) { if (Number(media) < 5) { cf = '#ffc7ce'; cc = '#9c0006'; fnt = 'Helvetica-Bold' } else { cc = '#0070c0'; fnt = 'Helvetica-Bold' } }
        }
        doc.rect(x, y, DISC_W, ROW_H).fill(cf).strokeColor('#cccccc').lineWidth(0.4).stroke()
        cellText(String(media), x, y, DISC_W, ROW_H, fnt, FONT, cc); x += DISC_W
      }
      const fp = parseFreq(s.freqPct); let ff = inactive ? INACT : bg
      if (!inactive) { if (fp >= 90) ff = '#c6efce'; else if (fp >= 75) ff = '#ffffc0'; else if (fp > 0) ff = '#ffc7ce' }
      doc.rect(x, y, FREQ_W, ROW_H).fill(ff).stroke(); cellText(s.freqPct, x, y, FREQ_W, ROW_H, 'Helvetica', FONT, DARK); x += FREQ_W
      const hasInsuf = mainDiscs.some(d => { const m = s.grades[d]?.media; return isNumeric(m) && Number(m) < 5 })
      const resultado = inactive ? (s.situacao || '—') : (s.situacao === 'Encerrado' || !hasInsuf ? 'Aprovado' : 'Reprovado')
      let rf = inactive ? INACT : bg, rc = DARK
      if (!inactive) { if (resultado === 'Aprovado') { rf = '#c6efce'; rc = '#1a5e1a' } else if (resultado === 'Reprovado') { rf = '#ffc7ce'; rc = '#9c0006' } else { rf = '#fff2cc'; rc = '#7f6000' } }
      doc.rect(x, y, RESULT_W, ROW_H).fill(rf).stroke(); cellText(resultado, x, y, RESULT_W, ROW_H, 'Helvetica-Bold', FONT, rc)
    }

    let y = drawPage(true); y = drawHeaders(y)
    const usableH = PAGE_H - BOTTOM_M
    for (let si = 0; si < students.length; si++) {
      if (y + ROW_H > usableH) { y = drawPage(false); y = drawHeaders(y) }
      drawRow(students[si], y, si); y += ROW_H
    }
    doc.font('Helvetica').fontSize(5.5).fillColor('#999').text(`less · Gerado em ${new Date().toLocaleDateString('pt-BR')}`, ML, PAGE_H - 24, { lineBreak: false })
    doc.end()
  })
}

// ─── Mapão (grade completa Nº/M/F/AC) — landscape ─────────────────────────────

export function buildMapaoPdf(data: AtaCsvData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const PAGE_W = 841.89, PAGE_H = 595.28, ML = 24, MR = 24, BOTTOM_M = 40
    const CONTENT_W = PAGE_W - ML - MR
    const doc = new PDFDocument({ size: 'A4', margin: 0, layout: 'landscape' })
    const chunks: Buffer[] = []
    doc.on('data', c => chunks.push(c)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject)

    const NAME_W = 110, SUB = 16, GRP = SUB * 4
    const ROW_H = 13, FONT = 5.5

    const drawPage = (isFirst: boolean): number => {
      if (!isFirst) doc.addPage()
      const h = govtHeader(doc, PAGE_W, ML, MR, data.meta.escola, data.meta.diretoria)
      const y = h + 8
      doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK).text(`MAPÃO — ${data.meta.turma}  ·  Ano Letivo ${data.meta.anoLetivo}`, ML, y, { width: CONTENT_W, align: 'center', lineBreak: false })
      return y + 18
    }
    const drawHeaders = (y: number): number => {
      let x = ML
      doc.rect(x, y, NAME_W, ROW_H * 2).fill(NAVY).stroke()
      doc.font('Helvetica-Bold').fontSize(6).fillColor('#fff').text('Aluno', x + 3, y + ROW_H - 3, { lineBreak: false }); x += NAME_W
      for (let di = 0; di < data.disciplines.length; di++) {
        const fill = di % 2 === 0 ? '#2E5090' : '#3B62B0'
        doc.rect(x, y, GRP, ROW_H).fill(fill).stroke()
        doc.save(); doc.rect(x, y, GRP, ROW_H).clip()
        doc.font('Helvetica-Bold').fontSize(5).fillColor('#fff').text(data.disciplines[di].slice(0, 24), x + 2, y + 3, { lineBreak: false }); doc.restore()
        ;['Nº', 'M', 'F', 'AC'].forEach((hh, i) => {
          doc.rect(x + i * SUB, y + ROW_H, SUB, ROW_H).fill('#dde6f5').strokeColor('#bbb').lineWidth(0.3).stroke()
          doc.font('Helvetica-Bold').fontSize(5).fillColor(DARK).text(hh, x + i * SUB, y + ROW_H + 4, { width: SUB, align: 'center', lineBreak: false })
        })
        x += GRP
      }
      return y + ROW_H * 2
    }
    const colsW = NAME_W + data.disciplines.length * GRP

    let y = drawPage(true); y = drawHeaders(y)
    const usableH = PAGE_H - BOTTOM_M
    data.students.forEach((s, si) => {
      if (y + ROW_H > usableH) { y = drawPage(false); y = drawHeaders(y) }
      const inactive = isInactiveRow(s.situacao)
      const bg = inactive ? INACT : (si % 2 === 0 ? '#ffffff' : '#f2f6fc')
      let x = ML
      doc.rect(x, y, NAME_W, ROW_H).fill(bg).strokeColor('#ccc').lineWidth(0.3).stroke()
      doc.font('Helvetica').fontSize(FONT).fillColor(DARK).text(s.name.slice(0, 32), x + 2, y + 4, { lineBreak: false }); x += NAME_W
      for (const d of data.disciplines) {
        const g = s.grades[d]; const media = g?.media ?? '-'
        let cf = bg, cc = DARK
        if (!inactive && isNumeric(media)) { if (Number(media) < 5) { cf = '#ffc7ce'; cc = '#9c0006' } else cc = '#0070c0' }
        else if (!inactive && String(media) === '-') cf = '#ffffc0'
        const vals = [String(g?.num ?? ''), String(media), String(g?.faltas ?? ''), String(g?.ac ?? '')]
        vals.forEach((v, i) => {
          doc.rect(x + i * SUB, y, SUB, ROW_H).fill(i === 1 ? cf : bg).strokeColor('#ddd').lineWidth(0.25).stroke()
          doc.font(i === 1 ? 'Helvetica-Bold' : 'Helvetica').fontSize(FONT).fillColor(i === 1 ? cc : '#555').text(v, x + i * SUB, y + 4, { width: SUB, align: 'center', lineBreak: false })
        })
        x += GRP
      }
      y += ROW_H
    })
    void colsW
    doc.font('Helvetica').fontSize(5.5).fillColor('#999').text(`less · Mapão · ${new Date().toLocaleDateString('pt-BR')}`, ML, PAGE_H - 20, { lineBreak: false })
    doc.end()
  })
}

// ─── ATA de Reunião — landscape (observações + dados compl. + tópicos + assinaturas) ──

export function buildReuniaoPdf(meta: AtaMeta, bimestre: string, notas: string, topicos: string, csvData2: GenericCsvData | null, teachers: ClassTeacher[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const PAGE_W = 841.89, PAGE_H = 595.28, ML = 28, MR = 28, BOTTOM_M = 40
    const CONTENT_W = PAGE_W - ML - MR
    const BIM_UP: Record<string, string> = { '1': '1º BIMESTRE', '2': '2º BIMESTRE', '3': '3º BIMESTRE', '4': '4º BIMESTRE', '5': '5º CONCEITO' }
    const doc = new PDFDocument({ size: 'A4', margin: 0, layout: 'landscape', bufferPages: true })
    const chunks: Buffer[] = []
    doc.on('data', c => chunks.push(c)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject)
    const usableH = PAGE_H - BOTTOM_M

    const newPage = (first: boolean): number => { if (!first) doc.addPage(); const h = govtHeader(doc, PAGE_W, ML, MR, meta.escola, meta.diretoria); return h + 8 }
    const sectionBar = (y: number, text: string): number => {
      doc.rect(ML, y, CONTENT_W, 17).fill(NAVY)
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#fff').text(text, ML + 7, y + 4.5, { width: CONTENT_W - 14, lineBreak: false })
      return y + 17
    }

    let y = newPage(true)
    const title = `ATA DE REUNIÃO DO CONSELHO — ${meta.anoLetivo} — ${meta.turma} — ${BIM_UP[bimestre] ?? bimestre}`
    doc.rect(ML, y, CONTENT_W, 26).fill('#dae3f3')
    doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY).text(title, ML + 8, y + 8, { width: CONTENT_W - 16, align: 'center', lineBreak: false })
    y += 36

    y = sectionBar(y, 'OBSERVAÇÕES')
    const notasH = notas?.trim() ? doc.heightOfString(notas.trim(), { width: CONTENT_W - 18 }) + 16 : 50
    if (y + notasH > usableH) y = newPage(false)
    doc.rect(ML, y, CONTENT_W, notasH).fill('#ffffff').strokeColor('#e0e0e0').lineWidth(0.4).stroke()
    if (notas?.trim()) doc.font('Helvetica').fontSize(8.5).fillColor(DARK).text(notas.trim(), ML + 8, y + 8, { width: CONTENT_W - 18 })
    y += notasH + 12

    if (csvData2 && csvData2.headers.length > 0) {
      if (y + 30 > usableH) y = newPage(false)
      y = sectionBar(y, 'DADOS COMPLEMENTARES')
      const FONT_DC = 6, PAD = 3
      const weights = csvData2.headers.map((h, i) => { let max = h.length; for (let r = 0; r < Math.min(csvData2.rows.length, 20); r++) max = Math.max(max, (csvData2.rows[r]?.[i] ?? '').length); return Math.max(3, Math.min(max, 40)) })
      const tw = weights.reduce((a, b) => a + b, 0)
      const colW = weights.map(w => Math.max(18, Math.floor((w / tw) * CONTENT_W)))
      colW[colW.length - 1] += CONTENT_W - colW.reduce((a, b) => a + b, 0)
      const colX = colW.map((_, i) => ML + colW.slice(0, i).reduce((a, b) => a + b, 0))
      const drawHdr = (yy: number): number => {
        const hH = 16
        csvData2.headers.forEach((h, i) => {
          doc.rect(colX[i], yy, colW[i], hH).fill('#2E5090').strokeColor('#1a3a70').lineWidth(0.3).stroke()
          doc.save(); doc.rect(colX[i], yy, colW[i], hH).clip()
          doc.font('Helvetica-Bold').fontSize(FONT_DC).fillColor('#fff').text(h, colX[i] + PAD, yy + PAD, { width: colW[i] - PAD * 2 }); doc.restore()
        })
        return yy + hH
      }
      if (y + 20 > usableH) y = newPage(false)
      y = drawHdr(y)
      csvData2.rows.forEach((row, ri) => {
        const rowH = 12
        if (y + rowH > usableH) { y = newPage(false); y = sectionBar(y, 'DADOS COMPLEMENTARES (cont.)'); y = drawHdr(y) }
        const bg = ri % 2 === 0 ? '#ffffff' : '#f2f6fc'
        row.forEach((cell, i) => {
          if (i >= colW.length) return
          doc.rect(colX[i], y, colW[i], rowH).fill(bg).strokeColor('#d0d0d0').lineWidth(0.25).stroke()
          doc.save(); doc.rect(colX[i], y, colW[i], rowH).clip()
          doc.font('Helvetica').fontSize(FONT_DC).fillColor(DARK).text(cell ?? '', colX[i] + PAD, y + 3, { width: colW[i] - PAD * 2, lineBreak: false }); doc.restore()
        })
        y += rowH
      })
      y += 12
    }

    if (topicos?.trim()) {
      if (y + 30 > usableH) y = newPage(false)
      y = sectionBar(y, 'TÓPICOS DISCUTIDOS')
      const bh = Math.max(20, doc.heightOfString(topicos.trim(), { width: CONTENT_W - 16 }) + 12)
      if (y + bh > usableH) y = newPage(false)
      doc.rect(ML, y, CONTENT_W, bh).fill('#ffffff').strokeColor('#e0e0e0').lineWidth(0.3).stroke()
      doc.font('Helvetica').fontSize(8.5).fillColor(DARK).text(topicos.trim(), ML + 8, y + 6, { width: CONTENT_W - 16 })
      y += bh + 12
    }

    const signers = teachers.map(t => ({ name: t.name, role: t.discipline }))
    const COLS = 3, ROW = 52, GAP = 14
    const colW = (CONTENT_W - GAP * (COLS - 1)) / COLS
    if (y + 30 > usableH) y = newPage(false)
    y = sectionBar(y, 'ASSINATURAS'); y += 8
    for (let i = 0; i < signers.length; i += COLS) {
      if (y + ROW > usableH) { y = newPage(false); y = sectionBar(y, 'ASSINATURAS (cont.)'); y += 8 }
      signers.slice(i, i + COLS).forEach((sg, gi) => {
        const sx = ML + gi * (colW + GAP)
        doc.font('Helvetica').fontSize(8).fillColor(DARK).text(sg.name, sx, y, { width: colW, lineBreak: false })
        doc.font('Helvetica').fontSize(6.5).fillColor('#666').text(sg.role, sx, y + 12, { width: colW, lineBreak: false })
        doc.moveTo(sx, y + 40).lineTo(sx + colW, y + 40).strokeColor('#999').lineWidth(0.7).stroke()
      })
      y += ROW
    }

    const range = doc.bufferedPageRange()
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i)
      doc.font('Helvetica').fontSize(5.5).fillColor('#aaa').text(`less · ${new Date().toLocaleDateString('pt-BR')} · ${meta.turma}`, ML, PAGE_H - 18, { lineBreak: false })
    }
    doc.end()
  })
}
