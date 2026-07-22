'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Upload, Download, FileSpreadsheet, AlertTriangle, Check, Loader2,
  Users, PenLine, BarChart3, FileText, ChevronDown, Save, Database, UserCheck,
} from 'lucide-react'
import {
  type AtaCsvData, type GenericCsvData, type ClassTeacher, type AtaStudent,
  parseAtaXlsx, calcStats, isNumeric, isEmaLetter, isActive, isInactiveRow,
  emaLetterInsuf, parseFreq, normalizeGradeInput,
} from '@/lib/ata'
import s from './ata.module.css'
import { ChipSelector } from '../../_components/Selector'
import { Button } from '../../_components/Button'
import { Input } from '../../_components/Input'
import { formatName } from '@/lib/format-name'

type Turma = { id: number; name: string; grade: string; ciclo: string; serie: string }
type Props = {
  doc: { id: number; title: string; content: Record<string, unknown> }
}

const BIMESTRES = [
  { value: '1', label: '1º Bimestre' }, { value: '2', label: '2º Bimestre' },
  { value: '3', label: '3º Bimestre' }, { value: '4', label: '4º Bimestre' },
  { value: '5', label: '5º Conceito (Anual)' },
]
const BIM_LABEL = ['', '1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre', '5º Conceito']

function gradeCls(media: string | number): string {
  if (isEmaLetter(media)) return emaLetterInsuf(media) ? s.gRed : s.gBlue
  if (!isNumeric(media)) return String(media) === '-' ? s.gYellow : ''
  return Number(media) < 5 ? s.gRed : s.gBlue
}
function freqCls(f: string): string {
  const v = parseFreq(f); return v >= 90 ? s.gGreen : v >= 75 ? s.gYellow : s.gRed
}

async function parseXlsxFile(file: File): Promise<unknown[][]> {
  const XLSX = await import('xlsx')
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null }) as unknown[][]
}

export function AtaEditor({ doc }: Props) {
  const [activeTab, setActiveTab] = useState<1 | 2 | 3 | 4>(1)
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [turmaId, setTurmaId]   = useState(String(doc.content.turmaId ?? ''))
  const [bimestre, setBimestre] = useState(String(doc.content.bimestre ?? ''))
  const [notas, setNotas]       = useState(String(doc.content.notas ?? ''))
  const [topicos, setTopicos]   = useState(String(doc.content.topicos ?? ''))
  const [csvData, setCsvData]   = useState<AtaCsvData | null>(
    doc.content.csvRaw ? (() => { try { return JSON.parse(String(doc.content.csvRaw)) } catch { return null } })() : null)
  const [csvData2, setCsvData2] = useState<GenericCsvData | null>(
    doc.content.csvRaw2 ? (() => { try { return JSON.parse(String(doc.content.csvRaw2)) } catch { return null } })() : null)
  const [teachers, setTeachers] = useState<ClassTeacher[]>([])
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [savedAt, setSavedAt]   = useState<Date | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [pdfing, setPdfing]     = useState<string | null>(null)
  const [showPdfMenu, setShowPdfMenu] = useState(false)
  const pdfMenuRef  = useRef<HTMLDivElement>(null)
  const fileRef  = useRef<HTMLInputElement>(null)
  const fileRef2 = useRef<HTMLInputElement>(null)
  const saveRef  = useRef<() => void>(() => {})

  // Atalho ⌘S / Ctrl+S
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault(); saveRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Outside-click e Escape para fechar dropdown de export
  useEffect(() => {
    if (!showPdfMenu) return
    function onDown(e: MouseEvent) {
      if (pdfMenuRef.current && !pdfMenuRef.current.contains(e.target as Node)) setShowPdfMenu(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setShowPdfMenu(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [showPdfMenu])

  useEffect(() => {
    fetch('/api/less/turmas').then(r => r.ok ? r.json() : []).then(d => { if (Array.isArray(d)) setTurmas(d) }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!turmaId) { setTeachers([]); return }
    fetch(`/api/ata/${doc.id}/teachers?classId=${turmaId}`).then(r => r.ok ? r.json() : { teachers: [] }).then(d => setTeachers(d.teachers ?? [])).catch(() => {})
  }, [turmaId, doc.id])

  async function importMapao(file: File) {
    setImportError(null)
    try {
      const rows = await parseXlsxFile(file)
      const parsed = parseAtaXlsx(rows)
      if (!parsed.students.length) throw new Error('Nenhum aluno encontrado no arquivo')
      const hasEncerrado = parsed.students.some(st => st.situacao === 'Encerrado')
      if (bimestre && bimestre !== '5' && hasEncerrado)
        throw new Error("Arquivo parece ser de 5º Conceito (contém 'Encerrado'). Selecione '5º Conceito' no Bimestre.")
      setCsvData(parsed)
      setActiveTab(2)
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Erro ao ler o arquivo')
    } finally { if (fileRef.current) fileRef.current.value = '' }
  }

  async function importComplementar(file: File) {
    try {
      let headers: string[] = [], rows: string[][] = []
      if (/\.csv$/i.test(file.name)) {
        let text = new TextDecoder('utf-8').decode(await file.arrayBuffer())
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
        const sample = text.split(/\r?\n/).slice(0, 6).join('\n')
        const sep = sample.split(';').length > sample.split(',').length ? ';' : ','
        const raw = text.split(/\r?\n/).map(line => line.split(sep).map(c => c.replace(/^"|"$/g, '').trim()))
        const hi = raw.findIndex(r => r.filter(c => c !== '').length >= 3)
        headers = raw[hi] ?? []
        rows = raw.slice(hi + 1).filter(r => r.some(c => c !== ''))
      } else {
        const raw = (await parseXlsxFile(file)).map(r => r.map(c => String(c ?? '').trim()))
        const hi = raw.findIndex(r => r.filter(c => c !== '').length >= 3)
        headers = raw[hi] ?? []
        rows = raw.slice(hi + 1).filter(r => r.some(c => c !== ''))
      }
      const valid = headers.map((h, i) => ({ h, i })).filter(x => x.h !== '')
      setCsvData2({ fileName: file.name, headers: valid.map(v => v.h), rows: rows.map(r => valid.map(v => r[v.i] ?? '')) })
    } catch { setImportError('Erro ao ler dados complementares') }
    finally { if (fileRef2.current) fileRef2.current.value = '' }
  }

  function handleGradeChange(studentName: string, disc: string, value: string | number) {
    setCsvData(prev => prev ? {
      ...prev,
      students: prev.students.map(st => st.name !== studentName ? st : { ...st, grades: { ...st.grades, [disc]: { ...st.grades[disc], media: value } } }),
    } : prev)
  }

  async function save() {
    if (saving) return
    setSaving(true)
    try {
      await fetch(`/api/documentos/${doc.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: {
          turmaId, bimestre, notas, topicos,
          csvRaw:  csvData  ? JSON.stringify(csvData)  : '',
          csvRaw2: csvData2 ? JSON.stringify(csvData2) : '',
        } }),
      })
      setSaved(true); setSavedAt(new Date()); setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }
  saveRef.current = save

  async function genPdf(tipo: 'mapao' | 'ata' | 'reuniao') {
    if (!csvData) return
    setPdfing(tipo); setShowPdfMenu(false)
    try {
      await save()
      const body: Record<string, unknown> = { csvData, teachers, bimestre }
      if (tipo === 'reuniao') { body.notas = notas; body.topicos = topicos; body.csvData2 = csvData2 }
      const res = await fetch(`/api/ata/${doc.id}/pdf/${tipo}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setImportError(d.error ?? 'Erro ao gerar PDF'); return }
      const blob = await res.blob(); const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `${tipo}_${csvData.meta.turma.replace(/\s+/g, '_')}.pdf`; a.click(); URL.revokeObjectURL(url)
    } finally { setPdfing(null) }
  }

  const [excelBusy, setExcelBusy] = useState(false)
  async function genExcel() {
    if (!csvData) return
    setExcelBusy(true)
    try {
      await save()
      const body = { csvData, teachers, bimestre, notas, topicos, csvData2 }
      const res = await fetch(`/api/ata/${doc.id}/export`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setImportError(d.error ?? 'Erro ao gerar Excel'); return }
      const blob = await res.blob(); const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `ata_${csvData.meta.turma.replace(/\s+/g, '_')}_${bimestre}.xlsx`; a.click(); URL.revokeObjectURL(url)
    } finally { setExcelBusy(false) }
  }

  const stats = useMemo(() => csvData ? calcStats(csvData) : null, [csvData])
  const setupDone = turmaId && bimestre

  return (
    <div className={s.wrap}>
      {/* Top action bar — substitui a antiga fixed bottom bar full-width.
          Só os botões, alinhados à direita com o status ao lado. */}
      <div className={s.topActionsBar}>
        <p className={s.topActionsLabel}>Ata</p>
        <div className={s.topActions}>
          {saving ? (
            <p className={s.savingMsg}><Loader2 size={11} className={s.spin} /> salvando…</p>
          ) : savedAt ? (
            <p className={s.savedMsgNew} title={savedAt.toLocaleString('pt-BR')}>
              <span className={s.savedDot} /> salvo {formatSavedAt(savedAt)}
            </p>
          ) : (
            <p className={s.savedMsgIdle}>rascunho — <kbd>⌘S</kbd> para salvar</p>
          )}
          {csvData && (
            <div className={s.pdfMenuWrap} ref={pdfMenuRef}>
              <Button
                variant="secondary"
                onClick={() => setShowPdfMenu(v => !v)}
                disabled={!!pdfing || excelBusy}
                type="button"
              >{(pdfing || excelBusy) ? (
                  <><Loader2 size={13} className={s.spin} /> gerando…</>
                ) : (
                  <><Download size={13} /> exportar <ChevronDown size={12} /></>
                )}</Button>
              {showPdfMenu && (
                <div className={`${s.pdfMenu} ${s.dropdownTopAnchor}`} role="menu">
                  <button type="button" onClick={() => { setShowPdfMenu(false); genPdf('reuniao') }}>
                    <FileText size={13} /> Ata de Reunião (PDF)
                  </button>
                  <button type="button" onClick={() => { setShowPdfMenu(false); genPdf('mapao') }}>
                    <FileText size={13} /> Mapão — grade completa (PDF)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowPdfMenu(false); genPdf('ata') }}
                    disabled={bimestre !== '5'}
                    title={bimestre !== '5' ? 'disponível apenas para 5º Conceito (Anual)' : undefined}
                  >
                    <FileText size={13} /> Ata de Resultado — 5º Conceito (PDF)
                  </button>
                  <div className={s.pdfMenuDivider} />
                  <button
                    type="button"
                    onClick={() => { setShowPdfMenu(false); genExcel() }}
                    disabled={excelBusy}
                    title="Excel oficial: Resumo · Dados · Mapão · Assinaturas · ATA (5º)"
                  >
                    <FileSpreadsheet size={13} /> Excel oficial (planilha completa)
                  </button>
                </div>
              )}
            </div>
          )}
          <Button
            variant="primary"
            onClick={save}
            disabled={saving}
            type="button"
            title="salvar (⌘S)"
          >{saving ? (
              <><Loader2 size={13} className={s.spin} /> salvando…</>
            ) : (
              <><Save size={13} /> salvar</>
            )}</Button>
        </div>
      </div>

      {/* Setup */}
      <div className={s.setup}>
        <p className={s.setupLabel}>Configuração</p>
        <div className={s.setupRow}>
          <div className={s.setupField}>
            <label className={s.flabel}>Turma</label>
            <ChipSelector
              size="sm"
              value={turmaId || null}
              onChange={v => setTurmaId(v)}
              options={turmas.map(t => ({ value: String(t.id), label: t.name, sub: t.grade }))}
              emptyLabel="Nenhuma turma disponível"
            />
          </div>
          <div className={s.setupField}>
            <label className={s.flabel}>Bimestre</label>
            <ChipSelector
              size="sm"
              value={bimestre || null}
              onChange={v => setBimestre(v)}
              options={BIMESTRES.map(b => ({ value: b.value, label: b.label }))}
            />
          </div>
        </div>
        {setupDone && (
          <div className={s.importRow}>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className={s.hidden} onChange={e => e.target.files?.[0] && importMapao(e.target.files[0])} />
            <Button
              variant="secondary"
              iconLeft={<Database size={14} />}
              onClick={() => fileRef.current?.click()}
            >Importar Mapão (SED)</Button>
            <input ref={fileRef2} type="file" accept=".xlsx,.xls,.csv" className={s.hidden} onChange={e => e.target.files?.[0] && importComplementar(e.target.files[0])} />
            <button className={s.importBtn2} onClick={() => fileRef2.current?.click()}>
              <UserCheck size={14} /> Dados Complementares
            </button>
          </div>
        )}
        {importError && <div className={s.errBox}><AlertTriangle size={14} /> {importError}</div>}
        {csvData && <p className={s.importOk}><Check size={13} /> {csvData.students.length} alunos · {csvData.disciplines.length} disciplinas{csvData2 ? ` · dados compl.: ${csvData2.rows.length}` : ''}</p>}
      </div>

      {!csvData ? (
        <div className={s.empty}>
          <FileSpreadsheet size={40} className={s.emptyIcon} />
          <p className={s.emptyTitle}>Importe o Mapão da SED para começar</p>
          <p className={s.emptySub}>Selecione turma e bimestre, depois importe a planilha de rendimento escolar.</p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className={s.tabs}>
            {([[1, 'Resumo', BarChart3], [2, 'Mapão', FileSpreadsheet], [3, 'Assinaturas', Users], [4, 'Resultado', FileText]] as const).map(([n, label, Icon]) => (
              <button key={n} className={`${s.tab} ${activeTab === n ? s.tabActive : ''}`} onClick={() => setActiveTab(n as 1|2|3|4)}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          {/* Aba 1 — Resumo */}
          {activeTab === 1 && stats && (
            <div className={s.tabBody}>
              <div className={s.metaCard}>
                <p className={s.metaEscola}>{csvData.meta.escola}</p>
                <div className={s.metaGrid}>
                  {[['Ano Letivo', csvData.meta.anoLetivo], ['Diretoria', csvData.meta.diretoria], ['Turma', csvData.meta.turma], ['Bimestre', BIM_LABEL[Number(bimestre)] ?? bimestre], ['Tipo Fechamento', csvData.meta.tipoFechamento], ['Total de Aulas', csvData.meta.totalAulas]].map(([l, v]) => (
                    <div key={l} className={s.metaItem}><span className={s.metaItemLabel}>{l}</span><span className={s.metaItemVal}>{v || '—'}</span></div>
                  ))}
                </div>
              </div>

              <div className={s.field}>
                <label className={s.flabel}><PenLine size={13} /> Anotações / Deliberações</label>
                <textarea className={s.textarea} rows={6} value={notas} placeholder="Deliberações, encaminhamentos e observações da reunião de conselho…" onChange={e => setNotas(e.target.value)} />
              </div>
              <div className={s.field}>
                <label className={s.flabel}><FileText size={13} /> Tópicos Discutidos</label>
                <textarea className={s.textarea} rows={5} value={topicos} placeholder="Tópicos discutidos na reunião…" onChange={e => setTopicos(e.target.value)} />
              </div>

              <div className={s.statGrid}>
                {[['Total', stats.total], ['Ativos', stats.ativos], ['Transferidos', stats.transferidos], ['Aprovados', stats.aprovados], ['Pontos de Atenção', stats.reprovados], ['Em alerta', stats.alertaPresenca.length + stats.riscoPresenca.length]].map(([l, v]) => (
                  <div key={l} className={s.statCard}><p className={s.statVal}>{v as number}</p><p className={s.statLabel}>{l}</p></div>
                ))}
              </div>

              <div className={s.discTable}>
                <p className={s.discTitle}>Desempenho insuficiente por disciplina</p>
                {csvData.disciplines.map(d => {
                  const info = stats.byDisc[d]
                  return (
                    <div key={d} className={s.discRow}>
                      <span className={s.discName}>{d}</span>
                      {info.semNota ? <span className={s.discTagWarn}>Sem notas</span> : <span className={info.count > 0 ? s.discTagBad : s.discTagOk}>{info.count} abaixo de 5</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Aba 2 — Mapão editável */}
          {activeTab === 2 && (
            <div className={s.tabBody}>
              <div className={s.hintBox}><PenLine size={13} /> Clique em qualquer nota (coluna <strong>M</strong>) para editar. Valores: número (0–10), ET, ES, EP ou –.</div>
              <div className={s.mapaoWrap}>
                <table className={s.mapaoTable}>
                  <thead>
                    <tr>
                      <th className={s.stickyCol}>Aluno</th><th>Situação</th>
                      {csvData.disciplines.map(d => <th key={d} colSpan={4} className={s.discHead}>{d}</th>)}
                      <th colSpan={4}>TOTAL</th>
                    </tr>
                    <tr className={s.subHead}>
                      <th className={s.stickyCol}></th><th></th>
                      {csvData.disciplines.map((d, i) => ['Nº','M','F','AC'].map(h => <th key={`${i}-${h}`} className={h === 'M' ? s.mCol : ''}>{h}</th>))}
                      {['TF','Fre%','FTAn','FreAn%'].map(h => <th key={h}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.students.map((st, si) => {
                      const inactive = isInactiveRow(st.situacao)
                      return (
                        <tr key={st.name} className={inactive ? s.rowInactive : si % 2 ? s.rowAlt : ''}>
                          <td className={s.stickyCol}>{st.name}</td>
                          <td className={s.sitCell}>{st.situacao}</td>
                          {csvData!.disciplines.map(d => {
                            const g = st.grades[d]; const media = g?.media ?? '-'
                            return [
                              <td key={`${d}-n`} className={s.numCell}>{g?.num || ''}</td>,
                              <td key={`${d}-m`} className={s.mEditCell}>
                                {inactive ? <span className={gradeCls(media)}>{String(media)}</span> : (
                                  <Input
                                    onBlur={e => { const v = normalizeGradeInput(e.target.value); if (String(v) !== String(media)) handleGradeChange(st.name, d, v) }}
                                    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                                    defaultValue={String(media)}
                                    className={`${s.gradeInput} ${gradeCls(media)}`}
                                  />
                                )}
                              </td>,
                              <td key={`${d}-f`} className={s.numCell}>{g?.faltas || ''}</td>,
                              <td key={`${d}-a`} className={s.numCell}>{g?.ac || ''}</td>,
                            ]
                          })}
                          <td className={s.numCell}>{st.totalFaltas}</td>
                          <td className={`${s.numCell} ${freqCls(st.freqPct)}`}>{st.freqPct}</td>
                          <td className={s.numCell}>{st.ftAn}</td>
                          <td className={`${s.numCell} ${freqCls(st.freqAnPct)}`}>{st.freqAnPct}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Aba 3 — Assinaturas */}
          {activeTab === 3 && (
            <div className={s.tabBody}>
              <div className={s.signCard}>
                <p className={s.signTitle}><Users size={14} /> Professores · {teachers.length}</p>
                {teachers.length === 0 ? <p className={s.empty}>Nenhum professor vinculado a esta turma.</p> : (
                  <table className={s.signTable}>
                    <thead><tr><th>Nome</th><th>Disciplina</th><th>Assinatura</th></tr></thead>
                    <tbody>
                      {teachers.map(t => (
                        <tr key={`${t.name}-${t.discipline}`}><td>{formatName(t.name)}</td><td>{t.discipline}</td><td><div className={s.signLine} /></td></tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Aba 4 — Resultado */}
          {activeTab === 4 && (
            <div className={s.tabBody}>
              <div className={s.resHeader}>
                <p className={s.resGov}>Estado de São Paulo · Secretaria da Educação</p>
                <p className={s.resEscola}>{csvData.meta.escola}</p>
                <p className={s.resTitle}>RESULTADO DO RENDIMENTO ESCOLAR</p>
                <p className={s.resSub}>Turma: {csvData.meta.turma} · {BIM_LABEL[Number(bimestre)] ?? bimestre} · Ano: {csvData.meta.anoLetivo}</p>
              </div>
              <ResultadoTable data={csvData} />
            </div>
          )}
        </>
      )}

    </div>
  )
}

// formatSavedAt — "agora", "há 12s", "há 3 min", "há 2 h" etc.
function formatSavedAt(d: Date): string {
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 5)     return 'agora'
  if (diff < 60)    return `há ${diff}s`
  if (diff < 3600)  return `há ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`
  return d.toLocaleDateString('pt-BR')
}

function ResultadoTable({ data }: { data: AtaCsvData }) {
  const mainDiscs = data.disciplines.filter(d => data.students.some(st => isNumeric(st.grades[d]?.media) || isEmaLetter(st.grades[d]?.media)))
  function resultado(st: AtaStudent): string {
    if (!isActive(st.situacao)) return st.situacao
    const insuf = mainDiscs.some(d => { const m = st.grades[d]?.media; if (isNumeric(m)) return Number(m) < 5; return isEmaLetter(m) && emaLetterInsuf(m) })
    return insuf ? 'Reprovado' : 'Aprovado'
  }
  return (
    <div className={s.mapaoWrap}>
      <table className={s.resTable}>
        <thead><tr><th className={s.stickyCol}>Aluno</th>{mainDiscs.map(d => <th key={d} className={s.vHead}><span>{d}</span></th>)}<th>Freq.</th><th>Resultado</th></tr></thead>
        <tbody>
          {data.students.map((st, si) => {
            const r = resultado(st)
            return (
              <tr key={st.name} className={si % 2 ? s.rowAlt : ''}>
                <td className={s.stickyCol}>{st.name}</td>
                {mainDiscs.map(d => { const m = st.grades[d]?.media; return <td key={d} className={gradeCls(m ?? '-')}>{String(m ?? '-')}</td> })}
                <td className={freqCls(st.freqPct)}>{st.freqPct}</td>
                <td className={r === 'Aprovado' ? s.resOk : r === 'Reprovado' ? s.resBad : s.resWarn}>{r}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
