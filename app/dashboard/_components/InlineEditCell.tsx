'use client'

import { useState, useEffect, useRef } from 'react'
import { Check, X, Loader2, Pencil } from 'lucide-react'
import s from './inline-edit-cell.module.css'

type Props<T extends string | number> = {
  value:      T
  onSave:     (next: T) => Promise<void> | void
  type?:      'text' | 'number'
  placeholder?: string
  disabled?:  boolean
  align?:     'left' | 'center' | 'right'
}

// InlineEditCell — click na célula → vira input → Enter salva, Esc cancela.
// Loading spinner durante save. Notion-style productivity.
export function InlineEditCell<T extends string | number>({
  value, onSave, type = 'text', placeholder, disabled, align = 'left',
}: Props<T>) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState<string>(String(value))
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const inputRef              = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  useEffect(() => {
    if (editing) {
      setTimeout(() => inputRef.current?.select(), 30)
    }
  }, [editing])

  async function commit() {
    if (draft === String(value)) { setEditing(false); return }
    setSaving(true)
    setError(null)
    try {
      const parsed = (type === 'number' ? Number(draft) : draft) as T
      await onSave(parsed)
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  function cancel() {
    setDraft(String(value))
    setEditing(false)
    setError(null)
  }

  if (!editing) {
    return (
      <button
        className={`${s.viewCell} ${s[`align-${align}`]} ${disabled ? s.disabled : ''}`}
        onClick={() => !disabled && setEditing(true)}
        disabled={disabled}
        title={disabled ? undefined : 'clique pra editar'}
      >
        <span className={s.value}>{String(value) || <span className={s.placeholder}>{placeholder ?? '—'}</span>}</span>
        {!disabled && <Pencil size={10} className={s.editIcon}/>}
      </button>
    )
  }

  return (
    <div className={`${s.editCell} ${error ? s.errorState : ''}`}>
      <input
        ref={inputRef}
        type={type}
        className={s.input}
        value={draft}
        placeholder={placeholder}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter')  { e.preventDefault(); void commit() }
          if (e.key === 'Escape') { e.preventDefault(); cancel() }
        }}
        onBlur={() => !saving && commit()}
        disabled={saving}
      />
      <div className={s.actions}>
        {saving ? (
          <Loader2 size={12} className={s.spin}/>
        ) : (
          <>
            <button onMouseDown={e => { e.preventDefault(); void commit() }} className={s.commit} aria-label="Salvar"><Check size={11}/></button>
            <button onMouseDown={e => { e.preventDefault(); cancel() }} className={s.cancel} aria-label="Cancelar"><X size={11}/></button>
          </>
        )}
      </div>
      {error && <span className={s.errorMsg}>{error}</span>}
    </div>
  )
}
