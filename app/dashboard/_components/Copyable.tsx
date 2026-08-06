'use client'

import { useState, type ReactNode } from 'react'
import { Copy, Check } from 'lucide-react'
import { useToast } from './ToastProvider'
import s from './copyable.module.css'

// Copia com fallback: navigator.clipboard só funciona em contexto seguro
// (https/localhost); em domínios .local sob HTTP usamos execCommand.
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch { /* cai no fallback */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.top = '-9999px'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

// Copyable — torna um valor clicável para copiar, com ícone no hover + toast.
// Uso:  <Copyable value={ra} label="RA">{formatRa(ra)}</Copyable>
export function Copyable({ value, label, children }: {
  value:    string
  label?:   string
  children?: ReactNode
}) {
  const toast = useToast()
  const [done, setDone] = useState(false)

  async function copy(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    const ok = await copyToClipboard(value)
    if (ok) {
      setDone(true)
      toast.success(`${label ?? 'Valor'} copiado`, value)
      setTimeout(() => setDone(false), 1200)
    } else {
      toast.error('Não foi possível copiar')
    }
  }

  return (
    <button type="button" className={s.copyable} onClick={copy} title={`copiar ${label ?? ''}`.trim()}>
      <span>{children ?? value}</span>
      {done ? <Check size={12} className={`${s.icon} ${s.iconDone}`} /> : <Copy size={12} className={s.icon} />}
    </button>
  )
}
