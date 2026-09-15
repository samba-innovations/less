'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DOC_TYPES, type DocType } from '@/lib/doc-types'
import { FileText, Users, Plus, Trash2, X, Check, RotateCcw } from 'lucide-react'
import { useNotificationEvent } from '@/lib/useNotificationEvent'
import { useSchoolEvent } from '@/lib/useSchoolEvent'
import { PageHeader } from '../_components/PageHeader'
import { Tabs } from '../_components/Tabs'
import { Badge } from '../_components/Badge'
import { RelativeDate } from '../_components/RelativeDate'
import { ChipSelector } from '../_components/Selector'
import { Button } from '../_components/Button'
import { IconButton } from '../_components/IconButton'
import { Input } from '../_components/Input'
import s from './coordenacao.module.css'

type Doc = {
  id: number; title: string; type: string; status: string
  updatedAt: string; user: { name: string }
}
type TrashDoc = {
  id: number; title: string; type: string; status: string
  deletedAt: string; user: { name: string }
}
type PeiStudent = {
  id: number; name: string; ra: string; turma: string
  diagnostico: string | null; profColaborativo: string | null; profAee: string | null; ativo: boolean
}
type Tab = 'docs' | 'pei' | 'trash'
type Props = { docs: Doc[]; initialPeiStudents: PeiStudent[] }

const EMPTY_FORM = { name: '', ra: '', turma: '', diagnostico: '', profColaborativo: '', profAee: '' }

export function CoordenacaoClient({ docs, initialPeiStudents }: Props) {
  const [tab, setTab]             = useState<Tab>('docs')
  const [docList, setDocList]     = useState(docs)
  const [students, setStudents]   = useState(initialPeiStudents)
  const [trashList, setTrashList] = useState<TrashDoc[] | null>(null)

  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)
  const [formError, setFormError]   = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<number | null>(null)
  const [filterTurma, setFilterTurma] = useState('')

  async function refreshDocs() {
    const res = await fetch('/api/documentos?all=true')
    if (res.ok) setDocList(await res.json())
  }
  async function loadTrash() {
    const res = await fetch('/api/documentos?trash=true')
    setTrashList(res.ok ? await res.json() : [])
  }
  async function restoreDoc(id: number) {
    const res = await fetch(`/api/documentos/${id}/restore`, { method: 'POST' })
    if (res.ok) { setTrashList(prev => (prev ?? []).filter(d => d.id !== id)); refreshDocs() }
  }
  function switchTab(next: Tab) {
    setTab(next)
    if (next === 'trash' && trashList === null) loadTrash()
  }

  useNotificationEvent(['LESS_DOC_FINAL'], refreshDocs)
  useSchoolEvent(['document_created', 'document_updated'], refreshDocs)

  const activeStudents = students.filter(s => s.ativo)
  const filtered = activeStudents.filter(st => !filterTurma || st.turma === filterTurma)
  const turmas   = Array.from(new Set(activeStudents.map(s => s.turma))).sort((a, b) => {
    const na = parseInt(a), nb = parseInt(b)
    return na === nb ? a.localeCompare(b) : na - nb
  })

  async function addStudent() {
    if (!form.name.trim() || !form.ra.trim() || !form.turma.trim()) {
      setFormError('nome, RA e turma são obrigatórios'); return
    }
    setSaving(true); setFormError(null)
    try {
      const res = await fetch('/api/less/pei-students', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      if (!res.ok) { const d = await res.json(); setFormError(d.error); return }
      const created: PeiStudent = await res.json()
      setStudents(prev => [...prev, created])
      setForm(EMPTY_FORM); setShowForm(false)
    } finally { setSaving(false) }
  }

  async function deactivateStudent(id: number) {
    const res = await fetch(`/api/less/pei-students/${id}`, { method: 'DELETE' })
    if (res.ok) setStudents(prev => prev.map(s => s.id === id ? { ...s, ativo: false } : s))
    setConfirmDel(null)
  }

  return (
    <div className={s.page}>
      <PageHeader
        title="equipe"
        subtitle="documentos produzidos pela equipe · alunos PEI · lixeira"
      />

      <Tabs<Tab>
        active={tab}
        onChange={switchTab}
        items={[
          { key: 'docs',  label: 'documentos', icon: <FileText size={13} />, count: docList.length },
          { key: 'pei',   label: 'alunos PEI', icon: <Users size={13} />,    count: activeStudents.length },
          { key: 'trash', label: 'lixeira',    icon: <Trash2 size={13} /> },
        ]}
      />

      {/* ── Tab: documentos ─────────────────────────── */}
      {tab === 'docs' && (
        docList.length === 0 ? (
          <Empty icon={<FileText size={36} strokeWidth={1.2} />} text="nenhum documento criado pela equipe ainda." />
        ) : (
          <div className={s.list}>
            {docList.map(doc => {
              const meta = DOC_TYPES[doc.type as DocType]
              const color = meta?.color ?? 'var(--fg-secondary)'
              return (
                <Link key={doc.id} href={`/dashboard/documentos/${doc.id}`} className={s.card}>
                  <span className={s.accent} style={{ background: color }} aria-hidden />
                  <span className={s.docIcon} style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>
                    <FileText size={14} />
                  </span>
                  <div className={s.docInfo}>
                    <span className={s.docTitle}>{doc.title}</span>
                    <span className={s.docMeta}>{meta?.label ?? doc.type} · {doc.user.name}</span>
                  </div>
                  <div className={s.docRight}>
                    <Badge tone={doc.status === 'FINAL' ? 'success' : 'amber'} withDot>
                      {doc.status === 'FINAL' ? 'final' : 'rascunho'}
                    </Badge>
                    <span className={s.docDate}><RelativeDate date={doc.updatedAt} /></span>
                  </div>
                </Link>
              )
            })}
          </div>
        )
      )}

      {/* ── Tab: PEI ────────────────────────────────── */}
      {tab === 'pei' && (
        <div className={s.section}>
          <div className={s.filters}>
            <ChipSelector
              size="sm"
              value={filterTurma || null}
              onChange={v => setFilterTurma(v)}
              options={[{ value: '', label: 'todas' }, ...turmas.map(t => ({ value: t, label: t }))]}
            />
            <span className={s.filterCount}>{filtered.length} aluno{filtered.length !== 1 ? 's' : ''}</span>
            <div className={s.filtersRight}>
              <Button variant="primary" iconLeft={<Plus size={13} />}
                onClick={() => { setShowForm(true); setFormError(null) }}
              >adicionar</Button>
            </div>
          </div>

          {showForm && (
            <div className={s.form}>
              <div className={s.formHead}>
                <span className={s.formTitle}>novo aluno PEI</span>
                <IconButton icon={<X size={13} />} label="fechar" onClick={() => setShowForm(false)} />
              </div>
              <div className={s.formGrid}>
                <Field label="nome" required>
                  <Input placeholder="nome completo" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </Field>
                <Field label="RA" required>
                  <Input placeholder="204..." value={form.ra}
                    onChange={e => setForm(f => ({ ...f, ra: e.target.value }))} />
                </Field>
                <Field label="turma" required>
                  <Input placeholder="9A" value={form.turma}
                    onChange={e => setForm(f => ({ ...f, turma: e.target.value }))} />
                </Field>
                <Field label="diagnóstico">
                  <Input placeholder="ex: TEA, DI" value={form.diagnostico}
                    onChange={e => setForm(f => ({ ...f, diagnostico: e.target.value }))} />
                </Field>
                <Field label="prof. colaborativo">
                  <Input placeholder="nome" value={form.profColaborativo}
                    onChange={e => setForm(f => ({ ...f, profColaborativo: e.target.value }))} />
                </Field>
                <Field label="prof. AEE">
                  <Input placeholder="nome" value={form.profAee}
                    onChange={e => setForm(f => ({ ...f, profAee: e.target.value }))} />
                </Field>
              </div>
              {formError && <div className={s.formErr}>{formError}</div>}
              <div className={s.formActions}>
                <Button variant="secondary" onClick={() => setShowForm(false)}>cancelar</Button>
                <Button variant="primary" onClick={addStudent} disabled={saving}>
                  {saving ? 'salvando…' : (<><Check size={13} /> salvar</>)}
                </Button>
              </div>
            </div>
          )}

          {filtered.length === 0 ? (
            <Empty icon={<Users size={36} strokeWidth={1.2} />}
              text={`nenhum aluno PEI ativo${filterTurma ? ` na turma ${filterTurma}` : ''}.`} />
          ) : (
            <div className={s.list}>
              {filtered.map(st => (
                <div key={st.id} className={s.card}>
                  <span className={s.turmaTag}>{st.turma}</span>
                  <div className={s.docInfo}>
                    <span className={s.docTitle}>{st.name}</span>
                    <span className={s.docMeta}>
                      RA {st.ra}{st.diagnostico ? ` · ${st.diagnostico}` : ''}
                      {st.profColaborativo ? ` · colab. ${st.profColaborativo}` : ''}
                      {st.profAee ? ` · AEE ${st.profAee}` : ''}
                    </span>
                  </div>
                  {confirmDel === st.id ? (
                    <div className={s.delConfirm}>
                      <span>desativar?</span>
                      <Button variant="danger"    onClick={() => deactivateStudent(st.id)}>sim</Button>
                      <Button variant="secondary" onClick={() => setConfirmDel(null)}>não</Button>
                    </div>
                  ) : (
                    <IconButton icon={<Trash2 size={13} />} label="remover" onClick={() => setConfirmDel(st.id)} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: lixeira ────────────────────────────── */}
      {tab === 'trash' && (
        trashList === null ? (
          <Empty icon={<Trash2 size={36} strokeWidth={1.2} />} text="carregando…" />
        ) : trashList.length === 0 ? (
          <Empty icon={<Trash2 size={36} strokeWidth={1.2} />} text="nenhum documento na lixeira." />
        ) : (
          <div className={s.list}>
            {trashList.map(doc => {
              const meta = DOC_TYPES[doc.type as DocType]
              const color = meta?.color ?? 'var(--fg-secondary)'
              return (
                <div key={doc.id} className={s.card}>
                  <span className={s.accent} style={{ background: color }} aria-hidden />
                  <span className={s.docIcon} style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>
                    <FileText size={14} />
                  </span>
                  <div className={s.docInfo}>
                    <span className={s.docTitle}>{doc.title}</span>
                    <span className={s.docMeta}>
                      {meta?.label ?? doc.type} · {doc.user.name} · apagado <RelativeDate date={doc.deletedAt} />
                    </span>
                  </div>
                  <Button variant="secondary" iconLeft={<RotateCcw size={13} />} onClick={() => restoreDoc(doc.id)}>
                    restaurar
                  </Button>
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className={s.empty}>
      {icon}
      <p>{text}</p>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className={s.field}>
      <label className={s.fieldLabel}>
        {label}{required && <span className={s.req}> *</span>}
      </label>
      {children}
    </div>
  )
}
