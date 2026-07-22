'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, Check, FileSpreadsheet, ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import s from './import-dialog.module.css'

type ColumnDef = {
  key:      string   // campo interno
  label:    string   // rótulo humano
  required?: boolean
}

type Props = {
  open:     boolean
  columns:  ColumnDef[]     // colunas destino do sistema
  onImport: (rows: Array<Record<string, string>>) => Promise<{ imported: number; errors: number }>
  onClose:  () => void
}

// ImportDialog — dropzone → parse CSV → preview em tabela → column mapping →
// confirmar → callback com rows normalizados.
export function ImportDialog({ open, columns, onImport, onClose }: Props) {
  const [file, setFile]         = useState<File | null>(null)
  const [headers, setHeaders]   = useState<string[]>([])
  const [rows, setRows]         = useState<string[][]>([])
  const [mapping, setMapping]   = useState<Record<string, string>>({})
  const [step, setStep]         = useState<'upload' | 'map' | 'importing' | 'done'>('upload')
  const [error, setError]       = useState<string | null>(null)
  const [result, setResult]     = useState<{ imported: number; errors: number } | null>(null)
  const dragRef                 = useRef<HTMLDivElement>(null)
  const inputRef                = useRef<HTMLInputElement>(null)

  const parseFile = useCallback(async (f: File) => {
    setError(null)
    if (f.size > 5 * 1024 * 1024) { setError('arquivo muito grande (máx 5MB)'); return }
    const text = await f.text()
    // Parse CSV bem simples (não trata quotes escaped complexos)
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    if (lines.length < 2) { setError('arquivo precisa ter header + ao menos 1 linha'); return }
    const parsedHeaders = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    const parsedRows    = lines.slice(1).map(l => l.split(',').map(c => c.trim().replace(/^"|"$/g, '')))
    setFile(f)
    setHeaders(parsedHeaders)
    setRows(parsedRows)
    // Auto-map: pra cada column, tenta achar header que match label (fuzzy simples)
    const auto: Record<string, string> = {}
    for (const col of columns) {
      const match = parsedHeaders.find(h =>
        h.toLowerCase().replace(/[^a-z0-9]/g, '') ===
        col.label.toLowerCase().replace(/[^a-z0-9]/g, ''),
      )
      if (match) auto[col.key] = match
    }
    setMapping(auto)
    setStep('map')
  }, [columns])

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) void parseFile(f)
  }

  async function confirmImport() {
    setStep('importing')
    const normalized = rows.map(row => {
      const out: Record<string, string> = {}
      for (const col of columns) {
        const sourceHeader = mapping[col.key]
        if (sourceHeader) {
          const idx = headers.indexOf(sourceHeader)
          out[col.key] = row[idx] ?? ''
        }
      }
      return out
    })
    try {
      const r = await onImport(normalized)
      setResult(r)
      setStep('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'erro ao importar')
      setStep('map')
    }
  }

  function reset() {
    setFile(null); setHeaders([]); setRows([]); setMapping({}); setStep('upload')
    setError(null); setResult(null)
  }

  if (!open) return null

  const missingRequired = columns.filter(c => c.required && !mapping[c.key])

  return (
    <div className={s.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div className={s.dialog} onClick={e => e.stopPropagation()}>
        <div className={s.head}>
          <span className={s.title}>importar planilha</span>
          <button className={s.close} onClick={() => { onClose(); reset() }} aria-label="Fechar">
            <X size={13}/>
          </button>
        </div>

        {error && <div className={s.error}><AlertCircle size={13}/> {error}</div>}

        {step === 'upload' && (
          <div
            ref={dragRef}
            className={s.dropzone}
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); dragRef.current?.classList.add(s.dropOver) }}
            onDragLeave={() => dragRef.current?.classList.remove(s.dropOver)}
            onDrop={e => { dragRef.current?.classList.remove(s.dropOver); onDrop(e) }}
          >
            <Upload size={24}/>
            <span className={s.dzTitle}>arraste um CSV aqui ou clique pra selecionar</span>
            <span className={s.dzSub}>formatos aceitos: CSV (5MB máx)</span>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={e => { const f = e.target.files?.[0]; if (f) void parseFile(f) }}
              style={{ display: 'none' }}
            />
          </div>
        )}

        {step === 'map' && (
          <div className={s.mapWrap}>
            <p className={s.hint}>
              associe as colunas do arquivo <strong>{file?.name}</strong> aos campos do sistema:
            </p>
            <div className={s.mappings}>
              {columns.map(col => (
                <div key={col.key} className={s.mapRow}>
                  <span className={s.colLabel}>
                    {col.label} {col.required && <span className={s.required}>*</span>}
                  </span>
                  <ArrowRight size={12} className={s.mapArrow}/>
                  <select
                    className={s.mapSelect}
                    value={mapping[col.key] ?? ''}
                    onChange={e => setMapping(prev => ({ ...prev, [col.key]: e.target.value }))}
                  >
                    <option value="">(ignorar)</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className={s.preview}>
              <p className={s.previewLabel}>preview: {rows.length} linhas</p>
              <div className={s.previewTable}>
                <table>
                  <thead>
                    <tr>{headers.map(h => <th key={h}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 3).map((row, i) => (
                      <tr key={i}>{row.map((c, j) => <td key={j}>{c}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className={s.actions}>
              <button className="samba-btn-ghost" onClick={reset}>trocar arquivo</button>
              <button
                className="samba-btn-primary"
                onClick={confirmImport}
                disabled={missingRequired.length > 0}
              >
                {missingRequired.length > 0
                  ? `mapeie: ${missingRequired.map(c => c.label).join(', ')}`
                  : `importar ${rows.length} linhas`}
              </button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className={s.centered}>
            <Loader2 size={32} className={s.spin}/>
            <p>importando {rows.length} linhas...</p>
          </div>
        )}

        {step === 'done' && result && (
          <div className={s.centered}>
            <div className={s.doneIcon}><Check size={28}/></div>
            <p className={s.doneTitle}>importação concluída</p>
            <p className={s.doneSub}>
              {result.imported} importadas · {result.errors > 0 ? `${result.errors} com erro` : 'sem erros'}
            </p>
            <button className="samba-btn-primary" onClick={() => { onClose(); reset() }}>fechar</button>
          </div>
        )}
      </div>
    </div>
  )
}
