'use client'

import { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2, ChevronDown, ArrowUpDown } from 'lucide-react'
import type { ConsideracoesInput, StudentRow, AreaData } from '@/lib/docx-consideracoes'
import s from './consideracoes.module.css'
import { PageHeader } from '../_components/PageHeader'
import { ChipSelector } from '../_components/Selector'
import { Input } from '../_components/Input'
import { Button } from '../_components/Button'

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
      <div className={s.areaTags}>
        {des > 0 && <span className={s.tagGood}>{des} destaque</span>}
        {pon > 0 && <span className={s.tagWarn}>{pon} atenção</span>}
        {des === 0 && pon === 0 && <span className={s.tagEmpty}>sem registros</span>}
      </div>
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
  const [dragOver,  setDragOver]  = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function processFile(file: File) {
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
      setError('erro ao processar o arquivo. verifique se é um Excel (.xlsx) ou CSV válido.')
      console.error(err)
    } finally {
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) await processFile(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
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
      if (!res.ok) { setError('erro ao gerar o DOCX.'); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `consideracoes_${(turma || 'turma').replace(/\s+/g, '_')}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('falha ao gerar o documento.')
    } finally { setGen(false) }
  }

  const totalAlunos = parsed
    ? new Set([...parsed.lgg.students, ...parsed.chs.students, ...parsed.cnt.students].map(s => s.ra)).size
    : 0

  return (
    <div className={s.page}>
      <PageHeader
        title="considerações"
        subtitle="upload da planilha → DOCX por turma com destaques e pontos de atenção"
      />

      {error && (
        <div className={s.errorBox}><AlertCircle size={14} /> {error}</div>
      )}

      <div className={s.grid}>
        {/* ── Coluna esquerda: upload + config ── */}
        <div className={s.gridLeft}>
          <div
            className={`${s.uploadZone} ${dragOver ? s.uploadZoneOver : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <input ref={fileRef} type="file" accept=".xlsx,.csv" className={s.hiddenInput} onChange={handleFile} />
            <div className={s.uploadIcon}>
              {loading ? <div className={s.spinner} /> : <Upload size={22} />}
            </div>
            <p className={s.uploadTitle}>
              {loading ? 'processando…' : 'clique ou arraste a planilha'}
            </p>
            <p className={s.uploadSub}>Excel (.xlsx) com múltiplas abas ou CSV (.csv)</p>
            {sheets.length > 0 && !loading && (
              <div className={s.uploadOk}>
                <CheckCircle2 size={13} /> {sheets.length} aba{sheets.length > 1 ? 's' : ''} carregada{sheets.length > 1 ? 's' : ''}
              </div>
            )}
          </div>

          {parsed && sheets.length > 1 && (
            <div className={s.card}>
              <span className={s.cardLabel}>turma / aba</span>
              <ChipSelector
                size="sm"
                value={String(selected)}
                onChange={v => selectSheet(Number(v))}
                options={sheets.map((sh, i) => ({ value: String(i), label: sh.name }))}
              />
            </div>
          )}

          {parsed && (
            <div className={s.card}>
              <span className={s.cardLabel}>nome da turma no documento</span>
              <Input
                placeholder="ex: 6ºA — tarde"
                value={turma}
                onChange={e => setTurma(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* ── Coluna direita: preview + gerar ── */}
        <div className={s.gridRight}>
          {!parsed && !loading && (
            <div className={s.empty}>
              <FileSpreadsheet size={36} strokeWidth={1.2} />
              <p>envie a planilha para começar. o DOCX incluirá apenas alunos com comentários registrados.</p>
            </div>
          )}

          {parsed && (
            <>
              <div className={s.card}>
                <span className={s.cardLabel}>
                  registros encontrados — {totalAlunos} aluno{totalAlunos !== 1 ? 's' : ''} com comentários
                </span>
                <div className={s.areaGrid}>
                  <AreaChip label="LGG"     data={parsed.lgg} />
                  <AreaChip label="CHS"     data={parsed.chs} />
                  <AreaChip label="CNT/MAT" data={parsed.cnt} />
                </div>
                {totalAlunos === 0 && (
                  <div className={s.warnBox}>
                    <AlertCircle size={13} /> nenhum comentário encontrado. verifique o formato do arquivo.
                  </div>
                )}
              </div>

              {(parsed.lgg.geral || parsed.chs.geral || parsed.cnt.geral) && (
                <div className={s.card}>
                  <span className={s.cardLabel}>considerações gerais</span>
                  <div className={s.geralList}>
                    {[
                      { label: 'LGG',     text: parsed.lgg.geral },
                      { label: 'CHS',     text: parsed.chs.geral },
                      { label: 'CNT/MAT', text: parsed.cnt.geral },
                    ].filter(a => a.text).map(a => (
                      <div key={a.label} className={s.geralRow}>
                        <span className={s.geralLabel}>{a.label}</span>
                        <p className={s.geralText}>{a.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={s.generateWrap}>
                <div className={s.generateRow}>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => handleGenerate('original')}
                    disabled={generating || totalAlunos === 0}
                    iconLeft={generating ? <div className={s.spinnerSm} /> : <Download size={14} />}
                    className={s.generateBtn}
                  >
                    {generating ? 'gerando DOCX…' : `gerar DOCX — ${turma || 'turma'}`}
                  </Button>
                  <button
                    className={s.generateChevron}
                    onClick={() => setShowDrop(v => !v)}
                    disabled={generating || totalAlunos === 0}
                    aria-label="opções de ordenação"
                  >
                    <ChevronDown size={14} className={showDrop ? s.chevronUp : ''} />
                  </button>
                </div>

                {showDrop && (
                  <div className={s.dropdown}>
                    <button className={s.dropItem} onClick={() => handleGenerate('original')}>
                      <Download size={14} />
                      <div>
                        <p className={s.dropItemTitle}>ordem da planilha</p>
                        <p className={s.dropItemSub}>mesmo formato do arquivo</p>
                      </div>
                    </button>
                    <button className={s.dropItem} onClick={() => handleGenerate('destaques-primeiro')}>
                      <ArrowUpDown size={14} />
                      <div>
                        <p className={s.dropItemTitle}>destaques primeiro</p>
                        <p className={s.dropItemSub}>alunos com destaque antes dos com atenção</p>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
