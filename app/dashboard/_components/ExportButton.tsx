'use client'

import { useState, useEffect, useRef } from 'react'
import { Download, FileText, FileSpreadsheet, ChevronDown, Check } from 'lucide-react'
import s from './export-button.module.css'

type Format = 'csv' | 'json'

type Props<T extends Record<string, unknown>> = {
  data:      T[]
  filename:  string  // sem extensão
  columns?:  Array<{ key: keyof T; label: string } | string>
  label?:    string
  disabled?: boolean
}

// ExportButton — dropdown com opções CSV/JSON. Escola pode baixar qualquer
// lista. Dá pra restringir colunas via prop `columns`.
export function ExportButton<T extends Record<string, unknown>>({
  data, filename, columns, label = 'exportar', disabled,
}: Props<T>) {
  const [open, setOpen]     = useState(false)
  const [done, setDone]     = useState<Format | null>(null)
  const wrapRef             = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function normalizeColumns(): Array<{ key: string; label: string }> {
    if (!columns) {
      if (data.length === 0) return []
      return Object.keys(data[0]).map(k => ({ key: k, label: k }))
    }
    return columns.map(c => typeof c === 'string' ? { key: c, label: c } : { key: c.key as string, label: c.label })
  }

  function escapeCsv(v: unknown): string {
    if (v === null || v === undefined) return ''
    const s = String(v).replace(/"/g, '""')
    return /[",\n\r]/.test(s) ? `"${s}"` : s
  }

  function toCsv(): string {
    const cols = normalizeColumns()
    const header = cols.map(c => escapeCsv(c.label)).join(',')
    const rows = data.map(row => cols.map(c => escapeCsv(row[c.key])).join(','))
    return [header, ...rows].join('\r\n')
  }

  function downloadBlob(content: string, ext: string, mime: string) {
    const blob = new Blob(['﻿' + content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function exportAs(format: Format) {
    if (format === 'csv')  downloadBlob(toCsv(), 'csv', 'text/csv;charset=utf-8')
    if (format === 'json') downloadBlob(JSON.stringify(data, null, 2), 'json', 'application/json')
    setDone(format)
    setTimeout(() => { setDone(null); setOpen(false) }, 900)
  }

  return (
    <div ref={wrapRef} className={s.wrap}>
      <button
        className={s.trigger}
        onClick={() => setOpen(v => !v)}
        disabled={disabled || data.length === 0}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download size={13}/>
        <span>{label}</span>
        <ChevronDown size={11} className={`${s.chevron} ${open ? s.chevronOpen : ''}`}/>
      </button>
      {open && (
        <div className={s.menu} role="menu">
          <button className={s.item} onClick={() => exportAs('csv')}>
            <FileSpreadsheet size={14}/>
            <span>CSV (Excel/Sheets)</span>
            {done === 'csv' && <Check size={11} className={s.checkIcon}/>}
          </button>
          <button className={s.item} onClick={() => exportAs('json')}>
            <FileText size={14}/>
            <span>JSON</span>
            {done === 'json' && <Check size={11} className={s.checkIcon}/>}
          </button>
        </div>
      )}
    </div>
  )
}
