// ATA — tipos, parser de planilha SED e estatísticas (ported from samba-paper v1)

export interface StudentGrade { num: number; media: string | number; faltas: number; ac: number }

export interface AtaStudent {
  name: string; situacao: string
  grades: Record<string, StudentGrade>
  totalFaltas: number; freqPct: string; ftAn: number; freqAnPct: string
}

export interface AtaMeta {
  anoLetivo: string; diretoria: string; escola: string; tipoEnsino: string
  turma: string; tipoFechamento: string; totalAulas: string; totalAulasEletiva: string
}

export interface AtaCsvData { meta: AtaMeta; disciplines: string[]; students: AtaStudent[] }
export interface ClassTeacher { name: string; discipline: string }
export interface GenericCsvData { fileName: string; headers: string[]; rows: string[][] }

export function parseFreq(s: string): number {
  return parseInt(String(s ?? '0').replace('%', ''), 10) || 0
}
export function isNumeric(m: string | number): boolean {
  if (m === null || m === undefined || m === '' || m === '-') return false
  const s = String(m).trim()
  return !isNaN(Number(s)) && s !== ''
}
export function isEmaLetter(m: string | number): boolean {
  const s = String(m ?? '').trim().toUpperCase()
  return s === 'ET' || s === 'ES' || s === 'EP'
}
export function emaLetterInsuf(m: string | number): boolean {
  return String(m ?? '').trim().toUpperCase() === 'EP'
}
export function isActive(situacao: string) {
  return !['Transferido', 'Baixa - Transferência'].includes(situacao)
}
export function isInactiveRow(situacao: string): boolean {
  return !['Ativo', 'Encerrado', ''].includes(situacao)
}

export function parseAtaXlsx(rows: unknown[][]): AtaCsvData {
  const str = (r: number, c: number) => String(rows[r]?.[c] ?? '').trim()

  const meta: AtaMeta = {
    anoLetivo:         str(1, 1),
    diretoria:         str(2, 1),
    escola:            str(3, 1),
    tipoEnsino:        str(4, 1),
    turma:             str(5, 1),
    tipoFechamento:    str(6, 1),
    totalAulas:        str(7, 1),
    totalAulasEletiva: str(8, 1),
  }

  const discRow = (rows[10] ?? []) as unknown[]
  const disciplines: { name: string; startCol: number }[] = []
  let totalCol = -1

  for (let col = 2; col < discRow.length; col++) {
    if (discRow[col] == null) continue
    const raw = String(discRow[col]).trim()
    if (raw === 'TOTAL') { totalCol = col; break }
    if (raw !== '') disciplines.push({ name: raw.split('\n')[0].trim(), startCol: col })
  }

  const students: AtaStudent[] = []
  for (let r = 12; r < rows.length; r++) {
    const row = rows[r] as unknown[]
    const name = String(row?.[0] ?? '').trim()
    if (!name || name === 'Legenda') break
    const situacao = String(row[1] ?? '').trim()

    const grades: Record<string, StudentGrade> = {}
    for (const disc of disciplines) {
      const c = disc.startCol
      const rawMedia = row[c + 1]
      grades[disc.name] = {
        num:    Number(row[c]) || 0,
        media:  (rawMedia === null || rawMedia === undefined) ? '-' : (typeof rawMedia === 'string' || typeof rawMedia === 'number' ? rawMedia : String(rawMedia)),
        faltas: Number(row[c + 2]) || 0,
        ac:     Number(row[c + 3]) || 0,
      }
    }

    const tc = totalCol >= 0 ? totalCol : (disciplines[disciplines.length - 1]?.startCol ?? 2) + 4
    students.push({
      name, situacao, grades,
      totalFaltas: Number(row[tc])     || 0,
      freqPct:     String(row[tc + 1] ?? ''),
      ftAn:        Number(row[tc + 2]) || 0,
      freqAnPct:   String(row[tc + 3] ?? ''),
    })
  }

  return { meta, disciplines: disciplines.map(d => d.name), students }
}

export function calcStats(data: AtaCsvData) {
  const ativos       = data.students.filter(s => isActive(s.situacao))
  const transferidos = data.students.filter(s => !isActive(s.situacao))
  const aprovados = ativos.filter(s => data.disciplines.every(d => {
    const m = s.grades[d]?.media
    if (isNumeric(m)) return Number(m) >= 5
    if (isEmaLetter(m)) return !emaLetterInsuf(m)
    return true
  }))
  const reprovados = ativos.filter(s => data.disciplines.some(d => {
    const m = s.grades[d]?.media
    if (isNumeric(m)) return Number(m) < 5
    return isEmaLetter(m) && emaLetterInsuf(m)
  }))
  const alertaPresenca = ativos.filter(s => { const f = parseFreq(s.freqPct); return f >= 75 && f < 90 })
  const riscoPresenca  = ativos.filter(s => parseFreq(s.freqPct) < 75)

  const byDisc: Record<string, { count: number; semNota: boolean }> = {}
  for (const d of data.disciplines) {
    const insuf = ativos.filter(s => {
      const m = s.grades[d]?.media
      if (isNumeric(m)) return Number(m) < 5
      return isEmaLetter(m) && emaLetterInsuf(m)
    }).length
    const semNota = ativos.every(s => { const m = s.grades[d]?.media; return !isNumeric(m) && !isEmaLetter(m) })
    byDisc[d] = { count: insuf, semNota }
  }

  return {
    total: data.students.length,
    ativos: ativos.length,
    transferidos: transferidos.length,
    aprovados: aprovados.length,
    reprovados: reprovados.length,
    alertaPresenca, riscoPresenca, byDisc,
  }
}

export function normalizeGradeInput(raw: string): string | number {
  const t = raw.trim().toUpperCase()
  if (t === '' || t === '-') return '-'
  if (['ET', 'ES', 'EP'].includes(t)) return t
  const n = parseFloat(t.replace(',', '.'))
  if (!isNaN(n) && n >= 0 && n <= 10) return n
  return raw.trim()
}
