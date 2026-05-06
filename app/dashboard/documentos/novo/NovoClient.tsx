'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DOC_TYPES, ALL_DOC_TYPES, type DocType } from '@/lib/doc-types'
import { ArrowRight, FileText } from 'lucide-react'
import s from './novo.module.css'

type Props = {
  isManager: boolean
  preType?:  DocType
}

export function NovoClient({ isManager, preType }: Props) {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState<DocType | null>(preType ?? null)
  const [title, setTitle]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const availableTypes = ALL_DOC_TYPES.filter(t =>
    !DOC_TYPES[t].managerOnly || isManager
  )

  async function create() {
    if (!selectedType || !title.trim()) { setError('Preencha o título.'); return }
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/documentos', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type: selectedType, title: title.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao criar.'); return }
      router.push(`/dashboard/documentos/${data.id}`)
    } catch { setError('Erro de conexão.')
    } finally { setLoading(false) }
  }

  const meta = selectedType ? DOC_TYPES[selectedType] : null

  return (
    <div className={s.wrap}>
      {/* Left: type selection */}
      <div className={s.left}>
        <div className={s.leftHeader}>
          <p className={s.leftTitle}>tipo de documento</p>
          <p className={s.leftSub}>selecione para continuar</p>
        </div>
        <div className={s.typeList}>
          {availableTypes.map(type => {
            const m = DOC_TYPES[type]
            const isSelected = selectedType === type
            return (
              <button
                key={type}
                className={`${s.typeItem} ${isSelected ? s.typeItemSelected : ''}`}
                onClick={() => { setSelectedType(type); setError(null) }}
              >
                <div className={s.typeItemDot} style={{ background: m.color }} />
                <div className={s.typeItemInfo}>
                  <span className={s.typeItemName}>{m.label}</span>
                  <span className={s.typeItemDesc}>{m.description}</span>
                </div>
                {m.managerOnly && <span className={s.typeItemBadge}>coord.</span>}
                {isSelected && <div className={s.typeItemCheck} />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Right: form panel */}
      <div className={s.right}>
        {!selectedType ? (
          <div className={s.rightEmpty}>
            <FileText size={36} strokeWidth={1.2} />
            <p>selecione um tipo à esquerda</p>
          </div>
        ) : (
          <div className={s.form}>
            <div className={s.formHeader}>
              <div
                className={s.formTypePill}
                style={{ background: meta!.color + '20', color: meta!.color }}
              >
                <div className={s.formTypeDot} style={{ background: meta!.color }} />
                {meta!.label}
              </div>
              <p className={s.formDesc}>{meta!.description}</p>
            </div>

            {error && <p className={s.errMsg}>{error}</p>}

            <div className={s.field}>
              <label className={s.label}>título *</label>
              <input
                className={s.input}
                type="text"
                placeholder={`Ex: ${meta!.label} — Turma 1A`}
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && create()}
                autoFocus
              />
            </div>

            <button
              className={s.submitBtn}
              onClick={create}
              disabled={loading || !title.trim()}
            >
              {loading ? 'criando…' : <><ArrowRight size={16} /> criar e editar</>}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
