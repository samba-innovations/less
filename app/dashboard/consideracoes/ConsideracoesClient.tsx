'use client'

import { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2, Layers, ChevronDown, ArrowUpDown } from 'lucide-react'
import type { ConsideracoesInput, StudentRow, AreaData } from '@/lib/docx-consideracoes'
import s from './consideracoes.module.css'

// ── CSV parser ────────────────────────────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const raw = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  return raw.split('\n').map(line => {
    const cells: string[] = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"' && !inQ) { inQ = true; continue }
      if (c === '"' && inQ) { if (line[i + 1] === '"') { cur += '"'; i++ } else inQ = false; continue }
      if (c === ';' && !inQ) { cells.push(cur); cur = ''; continue }
      cur += c
    }
    cells.push(cur)
    return cells
  })
}

interface SheetData { name: string; rows: string[][] }

async function parseXlsx(file: File): Promise<SheetData[]> {
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  return wb.SheetNames.map(name => {
    const ws  = wb.Sheets[name]
    const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' }) as string[][]
    return { name, rows: rows.map(r => r.map(c => String(c ?? ''))) }
  })
}

function parseRows(rows: string[][]): ConsideracoesInput {
  const geral: Record<string, string> = {}
  for (let i = 1; i < 5 && i < rows.length; i++) {
    const key = String(rows[i][0] ?? '').trim().toUpperCase()
    if (['LGG', 'CHS', 'CNT/MAT'].includes(key)) geral[key] = String(rows[i][2] ?? '').trim()
  }

  let dataStart = 6
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some(c => String(c).toUpperCase().includes('DESTAQUE'))) { dataStart = i + 1; break }
  }

  const students = rows.slice(dataStart)
    .filter(r => String(r[1] ?? '').trim().length > 2)
    .map(r => ({
      num:     String(r[0] ?? '').trim(),
      nome:    String(r[1] ?? '').trim(),
      ra:      String(r[2] ?? '').trim(),
      lgg_des: String(r[8]  ?? '').trim(),
      lgg_pon: String(r[9]  ?? '').trim(),
      chs_des: String(r[11] ?? '').trim(),
      chs_pon: String(r[12] ?? '').trim(),
      cnt_des: String(r[14] ?? '').trim(),
      cnt_pon: String(r[15] ?? '').trim(),
    }))
    .filter(s => s.nome.length > 2)

  function areaStudents(des: 'lgg_des'|'chs_des'|'cnt_des', pon: 'lgg_pon'|'chs_pon'|'cnt_pon'): StudentRow[] {
    return students.filter(s => s[des] || s[pon]).map(s => ({ num: s.num, nome: s.nome, ra: s.ra, destaque: s[des], ponto: s[pon] }))
  }

  return {
    turma: '',
    lgg: { geral: geral['LGG'] ?? '', students: areaStudents('lgg_des', 'lgg_pon') },
    chs: { geral: geral['CHS'] ?? '', students: areaStudents('chs_des', 'chs_pon') },
    cnt: { geral: geral['CNT/MAT'] ?? '', students: areaStudents('cnt_des', 'cnt_pon') },
  }
}

// ── Area chip ─────────────────────────────────────────────────────────────────

function AreaChip({ label, data }: { label: string; data: AreaData }) {
  const des = data.students.filter(s => s.destaque).length
  const pon = data.students.filter(s => s.ponto).length
  return (
    <div className={s.areaChip}>
      <span className={s.areaLabel}>{label}</span>
      {des > 0 && <span className={s.tagGreen}>{des} destaque</span>}
      {pon > 0 && <span className={s.tagRed}>{pon} atenção</span>}
      {des === 0 && pon === 0 && <span className={s.tagEmpty}>sem registros</span>}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ConsideracoesClient() {
  const [sheets,    setSheets]    = useState<SheetData[]>([])
  const [selected,  setSelected]  = useState(0)
  const [turma,     setTurma]     = useState('')
  const [parsed,    setParsed]    = useState<ConsideracoesInput | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [generating, setGen]      = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [showDrop,  setShowDrop]  = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true); setParsed(null); setError(null)
    try {
      let loaded: SheetData[]
      if (file.name.endsWith('.csv')) {
        loaded = [{ name: file.name.replace('.csv', ''), rows: parseCSV(await file.text()) }]
      } else {
        loaded = await parseXlsx(file)
      }
      setSheets(loaded); setSelected(0)
      const p = parseRows(loaded[0].rows)
      p.turma = loaded[0].name
      setTurma(loaded[0].name)
      setParsed(p)
    } catch (err) {
      setError('Erro ao processar o arquivo. Verifique se é um Excel (.xlsx) ou CSV válido.')
      console.error(err)
    } finally {
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function selectSheet(idx: number) {
    setSelected(idx)
    const p = parseRows(sheets[idx].rows)
    p.turma = sheets[idx].name
    setTurma(sheets[idx].name)
    setParsed(p)
  }

  async function handleGenerate(sortMode: 'original' | 'destaques-primeiro' = 'original') {
    if (!parsed) return
    setGen(true); setShowDrop(false); setError(null)
    try {
      const body: ConsideracoesInput = {
        ...parsed,
        turma: turma.trim() || parsed.turma,
        ...(sortMode === 'destaques-primeiro' ? { sortMode: 'destaques-primeiro' as const } : {}),
      }
      const res = await fetch('/api/consideracoes/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { setError('Erro ao gerar o DOCX.'); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `consideracoes_${(turma || 'turma').replace(/\s+/g, '_')}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Falha ao gerar o documento.')
    } finally { setGen(false) }
  }

  const totalAlunos = parsed
    ? new Set([...parsed.lgg.students, ...parsed.chs.students, ...parsed.cnt.students].map(s => s.ra)).size
    : 0

  return (
    <div className={s.page}>

      <div className={s.pageHeader}>
        <div className={s.pageHeaderIcon}><Layers size={18} /></div>
        <div>
          <h1 className={s.pageTitle}>Considerações de Desempenho</h1>
          <p className={s.pageSub}>Upload da planilha → DOCX por turma</p>
        </div>
      </div>

      {/* Upload zone */}
      <div className={s.uploadZone} onClick={() => fileRef.current?.click()}>
        <input ref={fileRef} type="file" accept=".xlsx,.csv" className={s.hiddenInput} onChange={handleFile} />
        <div className={s.uploadIcon}>
          {loading
            ? <div className={s.spinner} />
            : <FileSpreadsheet size={26} />
          }
        </div>
        <p className={s.uploadTitle}>{loading ? 'Processando…' : 'Clique para enviar a planilha'}</p>
        <p className={s.uploadSub}>Excel (.xlsx) com múltiplas abas ou arquivo CSV (.csv)</p>
        {sheets.length > 0 && !loading && (
          <div className={s.uploadSuccess}>
            <CheckCircle2 size={13} /> {sheets.length} aba{sheets.length > 1 ? 's' : ''} carregada{sheets.length > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {error && (
        <div className={s.errorBox}><AlertCircle size={14} /> {error}</div>
      )}

      {parsed && (
        <div className={s.formSection}>

          {/* Sheet selector */}
          {sheets.length > 1 && (
            <div className={s.card}>
              <p className={s.cardLabel}>Turma / Aba</p>
              <div className={s.selectWrap}>
                <select className={s.select} value={selected} onChange={e => selectSheet(Number(e.target.value))}>
                  {sheets.map((sh, i) => <option key={i} value={i}>{sh.name}</option>)}
                </select>
                <ChevronDown size={14} className={s.selectChevron} />
              </div>
            </div>
          )}

          {/* Turma name */}
          <div className={s.card}>
            <p className={s.cardLabel}>Nome da Turma no Documento</p>
            <input
              className={s.input}
              value={turma}
              onChange={e => setTurma(e.target.value)}
              placeholder="Ex: 6ºA — Tarde"
            />
          </div>

          {/* Summary */}
          <div className={s.card}>
            <p className={s.cardLabel}>Registros encontrados — {totalAlunos} aluno{totalAlunos !== 1 ? 's' : ''} com comentários</p>
            <div className={s.areaGrid}>
              <AreaChip label="LGG" data={parsed.lgg} />
              <AreaChip label="CHS" data={parsed.chs} />
              <AreaChip label="CNT/MAT" data={parsed.cnt} />
            </div>
            {totalAlunos === 0 && (
              <div className={s.warnBox}><AlertCircle size={13} /> Nenhum comentário encontrado. Verifique o formato do arquivo.</div>
            )}
          </div>

          {/* General considerations preview */}
          {(parsed.lgg.geral || parsed.chs.geral || parsed.cnt.geral) && (
            <div className={s.card}>
              <p className={s.cardLabel}>Considerações Gerais</p>
              {[
                { label: 'LGG', text: parsed.lgg.geral },
                { label: 'CHS', text: parsed.chs.geral },
                { label: 'CNT/MAT', text: parsed.cnt.geral },
              ].filter(a => a.text).map(a => (
                <div key={a.label} className={s.geralRow}>
                  <span className={s.geralLabel}>{a.label}</span>
                  <p className={s.geralText}>{a.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* Generate */}
          <div className={s.generateWrap}>
            <div className={`${s.generateRow} ${(generating || totalAlunos === 0) ? s.generateDisabled : ''}`}>
              <button
                className={s.generateBtn}
                onClick={() => handleGenerate('original')}
                disabled={generating || totalAlunos === 0}
              >
                {generating ? <><div className={s.spinnerSm} /> Gerando DOCX…</> : <><Download size={16} /> Gerar DOCX — {turma || 'Turma'}</>}
              </button>
              <button
                className={s.generateChevron}
                onClick={() => setShowDrop(v => !v)}
                disabled={generating || totalAlunos === 0}
              >
                <ChevronDown size={14} className={showDrop ? s.chevronUp : ''} />
              </button>
            </div>

            {showDrop && (
              <div className={s.dropdown}>
                <button className={s.dropItem} onClick={() => handleGenerate('original')}>
                  <Download size={13} />
                  <div>
                    <p className={s.dropItemTitle}>Ordem da planilha</p>
                    <p className={s.dropItemSub}>Mesmo formato do arquivo</p>
                  </div>
                </button>
                <button className={s.dropItem} onClick={() => handleGenerate('destaques-primeiro')}>
                  <ArrowUpDown size={13} />
                  <div>
                    <p className={s.dropItemTitle}>Destaques primeiro</p>
                    <p className={s.dropItemSub}>Alunos com destaque antes dos com ponto de atenção</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {!parsed && !loading && (
        <div className={s.emptyState}>
          <FileSpreadsheet size={40} className={s.emptyIcon} />
          <p className={s.emptyTitle}>Envie a planilha para começar</p>
          <p className={s.emptySub}>O DOCX incluirá somente alunos com comentários registrados</p>
        </div>
      )}
    </div>
  )
}
