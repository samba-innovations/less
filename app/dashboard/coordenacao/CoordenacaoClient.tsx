'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DOC_TYPES, type DocType } from '@/lib/doc-types'
import { FileText, Users, Plus, Trash2, ChevronDown, X, Check, RotateCcw } from 'lucide-react'
import { useNotificationEvent } from '@/lib/useNotificationEvent'
import { useSchoolEvent } from '@/lib/useSchoolEvent'
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

type Props = { docs: Doc[]; initialPeiStudents: PeiStudent[] }

const EMPTY_FORM = { name: '', ra: '', turma: '', diagnostico: '', profColaborativo: '', profAee: '' }

export function CoordenacaoClient({ docs, initialPeiStudents }: Props) {
  const [tab, setTab]           = useState<'docs' | 'pei' | 'trash'>('docs')
  const [docList, setDocList]   = useState<Doc[]>(docs)
  const [students, setStudents] = useState<PeiStudent[]>(initialPeiStudents)
  const [showForm, setShowForm] = useState(false)
  const [trashList, setTrashList] = useState<TrashDoc[] | null>(null)

  async function refreshDocs() {
    const res = await fetch('/api/documentos?all=true')
    if (!res.ok) return
    const data: Doc[] = await res.json()
    setDocList(data)
  }

  async function loadTrash() {
    const res = await fetch('/api/documentos?trash=true')
    setTrashList(res.ok ? await res.json() : [])
  }

  async function restoreDoc(id: number) {
    const res = await fetch(`/api/documentos/${id}/restore`, { method: 'POST' })
    if (res.ok) { setTrashList(prev => (prev ?? []).filter(d => d.id !== id)); refreshDocs() }
  }

  function openTrash() { setTab('trash'); if (trashList === null) loadTrash() }

  useNotificationEvent(['LESS_DOC_FINAL'], refreshDocs)
  useSchoolEvent(['document_created', 'document_updated'], refreshDocs)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<number | null>(null)
  const [filterTurma, setFilterTurma] = useState('')

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const turmas = Array.from(new Set(students.map(s => s.turma))).sort((a, b) => {
    // Sort by series number first, then letter
    const numA = parseInt(a), numB = parseInt(b)
    if (numA !== numB) return numA - numB
    return a.localeCompare(b)
  })

  const filtered = students.filter(st => st.ativo && (!filterTurma || st.turma === filterTurma))

  async function addStudent() {
    if (!form.name.trim() || !form.ra.trim() || !form.turma.trim()) {
      setFormError('Nome, RA e turma são obrigatórios.'); return
    }
    setSaving(true); setFormError(null)
    try {
      const res = await fetch('/api/less/pei-students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) { const d = await res.json(); setFormError(d.error); return }
      const created: PeiStudent = await res.json()
      setStudents(prev => [...prev, created])
      setForm(EMPTY_FORM)
      setShowForm(false)
    } finally { setSaving(false) }
  }

  async function deactivateStudent(id: number) {
    const res = await fetch(`/api/less/pei-students/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setStudents(prev => prev.map(s => s.id === id ? { ...s, ativo: false } : s))
    }
    setConfirmDel(null)
  }

  return (
    <div className={s.wrap}>
      {/* Tabs */}
      <div className={s.tabs}>
        <button className={`${s.tab} ${tab === 'docs' ? s.tabActive : ''}`} onClick={() => setTab('docs')}>
          <FileText size={14} /> Documentos
        </button>
        <button className={`${s.tab} ${tab === 'pei' ? s.tabActive : ''}`} onClick={() => setTab('pei')}>
          <Users size={14} /> Alunos PEI
          <span className={s.tabCount}>{students.filter(s => s.ativo).length}</span>
        </button>
        <button className={`${s.tab} ${tab === 'trash' ? s.tabActive : ''}`} onClick={openTrash}>
          <Trash2 size={14} /> Apagados
        </button>
      </div>

      {/* Trash tab */}
      {tab === 'trash' && (
        trashList === null ? (
          <div className={s.empty}><p>Carregando…</p></div>
        ) : trashList.length === 0 ? (
          <div className={s.empty}>
            <Trash2 size={36} strokeWidth={1.2} />
            <p>Nenhum documento na lixeira.</p>
          </div>
        ) : (
          <div className={s.list}>
            {trashList.map(doc => {
              const meta = DOC_TYPES[doc.type as DocType]
              return (
                <div key={doc.id} className={s.docCard}>
                  <div className={s.docCardAccent} style={{ background: meta?.color ?? '#6b7280' }} />
                  <div className={s.docIcon} style={{ background: (meta?.color ?? '#6b7280') + '18' }}>
                    <FileText size={16} color={meta?.color ?? '#6b7280'} />
                  </div>
                  <div className={s.docInfo}>
                    <p className={s.docTitle}>{doc.title}</p>
                    <div className={s.docMeta}>
                      <span>{meta?.label ?? doc.type}</span>
                      <span className={s.separator}>·</span>
                      <span>{doc.user.name}</span>
                      <span className={s.separator}>·</span>
                      <span>apagado em {fmtDate(doc.deletedAt)}</span>
                    </div>
                  </div>
                  <button className={s.restoreBtn} onClick={() => restoreDoc(doc.id)}>
                    <RotateCcw size={13} /> Restaurar
                  </button>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Documents tab */}
      {tab === 'docs' && (
        docList.length === 0 ? (
          <div className={s.empty}>
            <FileText size={36} strokeWidth={1.2} />
            <p>Nenhum documento criado pela equipe ainda.</p>
          </div>
        ) : (
          <div className={s.list}>
            {docList.map(doc => {
              const meta = DOC_TYPES[doc.type as DocType]
              return (
                <Link key={doc.id} href={`/dashboard/documentos/${doc.id}`} className={s.docCard}>
                  <div className={s.docCardAccent} style={{ background: meta?.color ?? '#6b7280' }} />
                  <div className={s.docIcon} style={{ background: (meta?.color ?? '#6b7280') + '18' }}>
                    <FileText size={16} color={meta?.color ?? '#6b7280'} />
                  </div>
                  <div className={s.docInfo}>
                    <p className={s.docTitle}>{doc.title}</p>
                    <div className={s.docMeta}>
                      <span>{meta?.label ?? doc.type}</span>
                      <span className={s.separator}>·</span>
                      <span>{doc.user.name}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                    <span className={`${s.badge} ${doc.status === 'FINAL' ? s.badgeFinal : s.badgeDraft}`}>
                      {doc.status === 'FINAL' ? 'final' : 'rascunho'}
                    </span>
                    <span className={s.docDate}>{fmtDate(doc.updatedAt)}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )
      )}

      {/* PEI tab */}
      {tab === 'pei' && (
        <div className={s.peiSection}>
          <div className={s.peiHeader}>
            <div className={s.peiFilters}>
              <div className={s.selectWrap}>
                <select className={s.filterSelect} value={filterTurma} onChange={e => setFilterTurma(e.target.value)}>
                  <option value="">Todas as turmas</option>
                  {turmas.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown size={13} className={s.selectChevron} />
              </div>
              <span className={s.peiCount}>{filtered.length} aluno{filtered.length !== 1 ? 's' : ''}</span>
            </div>
            <button className={s.addBtn} onClick={() => { setShowForm(true); setFormError(null) }}>
              <Plus size={14} /> Adicionar
            </button>
          </div>

          {/* Add form */}
          {showForm && (
            <div className={s.addForm}>
              <div className={s.addFormHeader}>
                <p className={s.addFormTitle}>Novo aluno PEI</p>
                <button className={s.closeBtn} onClick={() => setShowForm(false)}><X size={14} /></button>
              </div>
              <div className={s.formGrid}>
                <div className={s.formField}>
                  <label className={s.formLabel}>Nome <span className={s.req}>*</span></label>
                  <input className={s.formInput} value={form.name} placeholder="Nome completo" onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className={s.formField}>
                  <label className={s.formLabel}>RA <span className={s.req}>*</span></label>
                  <input className={s.formInput} value={form.ra} placeholder="RA" onChange={e => setForm(f => ({ ...f, ra: e.target.value }))} />
                </div>
                <div className={s.formField}>
                  <label className={s.formLabel}>Turma <span className={s.req}>*</span></label>
                  <input className={s.formInput} value={form.turma} placeholder="Ex: 9A" onChange={e => setForm(f => ({ ...f, turma: e.target.value }))} />
                </div>
                <div className={s.formField}>
                  <label className={s.formLabel}>Diagnóstico</label>
                  <input className={s.formInput} value={form.diagnostico} placeholder="Ex: TEA, D.I" onChange={e => setForm(f => ({ ...f, diagnostico: e.target.value }))} />
                </div>
                <div className={s.formField}>
                  <label className={s.formLabel}>Prof. Colaborativo</label>
                  <input className={s.formInput} value={form.profColaborativo} placeholder="Nome" onChange={e => setForm(f => ({ ...f, profColaborativo: e.target.value }))} />
                </div>
                <div className={s.formField}>
                  <label className={s.formLabel}>Prof. AEE</label>
                  <input className={s.formInput} value={form.profAee} placeholder="Nome" onChange={e => setForm(f => ({ ...f, profAee: e.target.value }))} />
                </div>
              </div>
              {formError && <p className={s.formError}>{formError}</p>}
              <div className={s.formActions}>
                <button className={s.cancelBtn} onClick={() => setShowForm(false)}>Cancelar</button>
                <button className={s.saveBtn} onClick={addStudent} disabled={saving}>
                  {saving ? 'Salvando…' : <><Check size={13} /> Salvar</>}
                </button>
              </div>
            </div>
          )}

          {/* Student list */}
          {filtered.length === 0 ? (
            <div className={s.empty}>
              <Users size={36} strokeWidth={1.2} />
              <p>Nenhum aluno PEI ativo{filterTurma ? ` na turma ${filterTurma}` : ''}.</p>
            </div>
          ) : (
            <div className={s.peiList}>
              {filtered.map(st => (
                <div key={st.id} className={s.peiCard}>
                  <div className={s.peiCardLeft}>
                    <div className={s.peiTurma}>{st.turma}</div>
                    <div className={s.peiInfo}>
                      <p className={s.peiName}>{st.name}</p>
                      <p className={s.peiMeta}>
                        RA {st.ra}
                        {st.diagnostico && <><span className={s.dot}>·</span>{st.diagnostico}</>}
                      </p>
                      {(st.profColaborativo || st.profAee) && (
                        <p className={s.peiProfs}>
                          {st.profColaborativo && <>Colab: <strong>{st.profColaborativo}</strong></>}
                          {st.profColaborativo && st.profAee && '  '}
                          {st.profAee && <>AEE: <strong>{st.profAee}</strong></>}
                        </p>
                      )}
                    </div>
                  </div>
                  {confirmDel === st.id ? (
                    <div className={s.delConfirm}>
                      <span className={s.delMsg}>Desativar?</span>
                      <button className={s.delYes} onClick={() => deactivateStudent(st.id)}>Sim</button>
                      <button className={s.delNo} onClick={() => setConfirmDel(null)}>Não</button>
                    </div>
                  ) : (
                    <button className={s.delBtn} onClick={() => setConfirmDel(st.id)}><Trash2 size={13} /></button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
