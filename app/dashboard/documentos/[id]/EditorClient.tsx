'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DOC_TYPES, type DocType, type FieldDef } from '@/lib/doc-types'
import { Save, FileDown, Trash2, CheckCircle, Clock, ChevronDown, Check } from 'lucide-react'
import s from './editor.module.css'

// ─── Types ───────────────────────────────────────────────────────────────────

type Feedback = {
  id:          number
  text:        string
  createdAt:   string
  coordinator: { name: string }
}

type Turma      = { id: number; name: string; grade: string; ciclo: string; serie: string }
type Disciplina = { id: number; name: string; aulasNome: string }
type Bimestre   = { id: number; numero: number; label: string }
type Aula = {
  id: number; aulaNum: number; titulo: string
  eixo?: string; unidadeTematica?: string; habilidadeCodigo?: string
  habilidadeTexto?: string; objetoConhecimento?: string
  conteudo?: string; objetivos?: string; bloco?: string
}
type AE         = { id: number; codigo: string; descricao: string }
type Instrumento = { id: number; nome: string; categoria: string }
type PeiStudent = {
  id: number; name: string; ra: string; turma: string
  diagnostico?: string; profColaborativo?: string; profAee?: string
}

type Props = {
  doc: {
    id:        number
    type:      string
    title:     string
    content:   Record<string, unknown>
    status:    string
    feedbacks: Feedback[]
  }
  canFeedback: boolean
}

// ─── Curriculum-aware doc types ───────────────────────────────────────────────

const CURRICULUM_TYPES = ['PLANO_AULA', 'GUIA_APRENDIZAGEM', 'PLANO_ELETIVA', 'PLANO_EMA'] as const
const PEI_TYPES        = ['PEI'] as const

function isCurriculumType(t: string) { return CURRICULUM_TYPES.includes(t as never) }
function isPeiType(t: string)        { return PEI_TYPES.includes(t as never) }

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useFetch<T>(url: string | null) {
  const [data, setData]     = useState<T | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!url) { setData(null); return }
    setLoading(true)
    fetch(url)
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false))
  }, [url])

  return { data, loading }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EditorClient({ doc, canFeedback }: Props) {
  const router   = useRouter()
  const docType  = doc.type as DocType
  const meta     = DOC_TYPES[docType]
  const content  = doc.content as Record<string, string>

  const [title,   setTitle]   = useState(doc.title)
  const [fields,  setFields]  = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(content).map(([k, v]) => [k, String(v ?? '')]))
  )
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [pdfing,  setPdfing]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbacks, setFeedbacks]       = useState<Feedback[]>(doc.feedbacks)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Curriculum state ──────────────────────────────────────────────────────
  const [turmaId,      setTurmaId]      = useState<number | null>(Number(fields._turma_id) || null)
  const [disciplinaId, setDisciplinaId] = useState<number | null>(Number(fields._disciplina_id) || null)
  const [bimestreNum,  setBimestreNum]  = useState<number | null>(Number(fields._bimestre) || null)
  const [aulaId,       setAulaId]       = useState<number | null>(Number(fields._aula_id) || null)
  const [ciclo,        setCiclo]        = useState<string>(fields._ciclo || '')
  const [serie,        setSerie]        = useState<string>(fields._serie || '')
  const [aulasNome,    setAulasNome]    = useState<string>(fields._aulas_nome || '')
  const [selAEs,       setSelAEs]       = useState<string[]>(
    (() => { try { return JSON.parse(fields._aprendizagens || '[]') } catch { return [] } })()
  )
  const [selInstr,     setSelInstr]     = useState<string[]>(
    (() => { try { return JSON.parse(fields._instrumentos || '[]') } catch { return [] } })()
  )

  // ── PEI state ─────────────────────────────────────────────────────────────
  const [peiStudentId, setPeiStudentId] = useState<number | null>(Number(fields._pei_student_id) || null)

  // ── Fetch curriculum data ─────────────────────────────────────────────────
  const { data: turmas   } = useFetch<Turma[]>('/api/less/turmas')
  const { data: bimestres } = useFetch<Bimestre[]>('/api/less/bimestres')
  const { data: instrumentos } = useFetch<Instrumento[]>('/api/less/instrumentos')
  const { data: peiStudents }  = useFetch<PeiStudent[]>(isPeiType(docType) ? '/api/less/pei-students' : null)

  const disciplinasUrl = turmaId ? `/api/less/disciplinas?classId=${turmaId}` : null
  const { data: disciplinas } = useFetch<Disciplina[]>(disciplinasUrl)

  const aulaBase  = (turmaId && disciplinaId && bimestreNum && ciclo && serie && aulasNome)
  const aulasUrl  = aulaBase ? `/api/less/aulas?disciplina=${encodeURIComponent(aulasNome)}&serie=${serie}&ciclo=${ciclo}&bimestre=${bimestreNum}` : null
  const { data: aulas } = useFetch<Aula[]>(aulasUrl)

  const aeUrl = aulaBase ? `/api/less/aprendizagens?disciplina=${encodeURIComponent(aulasNome)}&serie=${serie}&ciclo=${ciclo}&bimestre=${bimestreNum}` : null
  const { data: aes }  = useFetch<AE[]>(aeUrl)

  // ── Field helpers ─────────────────────────────────────────────────────────

  function setField(key: string, value: string) {
    setFields(prev => ({ ...prev, [key]: value }))
    scheduleSave({ ...fields, [key]: value })
  }

  function scheduleSave(f: Record<string, string>) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => autoSave(title, buildContent(f)), 1500)
  }

  function buildContent(f: Record<string, string>): Record<string, string> {
    return {
      ...f,
      _turma_id:        String(turmaId ?? ''),
      _disciplina_id:   String(disciplinaId ?? ''),
      _bimestre:        String(bimestreNum ?? ''),
      _aula_id:         String(aulaId ?? ''),
      _ciclo:           ciclo,
      _serie:           serie,
      _aulas_nome:      aulasNome,
      _aprendizagens:   JSON.stringify(selAEs),
      _instrumentos:    JSON.stringify(selInstr),
      _pei_student_id:  String(peiStudentId ?? ''),
    }
  }

  // ── Curriculum cascade handlers ───────────────────────────────────────────

  function handleTurmaChange(id: number) {
    const t = turmas?.find(t => t.id === id)
    if (!t) return
    setTurmaId(id)
    setCiclo(t.ciclo)
    setSerie(t.serie)
    setDisciplinaId(null); setAulasNome(''); setAulaId(null)
    setField('_turma_nome', t.name)
  }

  function handleDisciplinaChange(id: number) {
    const d = disciplinas?.find(d => d.id === id)
    if (!d) return
    setDisciplinaId(id)
    setAulasNome(d.aulasNome)
    setAulaId(null)
    setField('_disciplina_nome', d.name)
  }

  function handleBimestreChange(num: number) {
    setBimestreNum(num)
    setAulaId(null)
    setField('_bimestre', String(num))
  }

  function handleAulaChange(id: number) {
    const a = aulas?.find(a => a.id === id)
    if (!a) return
    setAulaId(id)
    setFields(prev => ({
      ...prev,
      _aula_id:           String(id),
      _aula_num:          String(a.aulaNum),
      _titulo_aula:       a.titulo,
      habilidade_codigo:  a.habilidadeCodigo ?? '',
      habilidade_texto:   a.habilidadeTexto ?? '',
      unidade_tematica:   a.unidadeTematica ?? '',
      objeto_conhecimento: a.objetoConhecimento ?? '',
      conteudo_aula:      a.conteudo ?? '',
      objetivos_aula:     a.objetivos ?? '',
    }))
    scheduleSave({
      ...fields,
      _aula_id: String(id),
      _titulo_aula: a.titulo,
      habilidade_codigo: a.habilidadeCodigo ?? '',
      conteudo_aula: a.conteudo ?? '',
      objetivos_aula: a.objetivos ?? '',
    })
  }

  function handlePeiStudentChange(id: number) {
    const p = peiStudents?.find(p => p.id === id)
    if (!p) return
    setPeiStudentId(id)
    setFields(prev => ({
      ...prev,
      _pei_student_id:  String(id),
      aluno:            p.name,
      ra:               p.ra,
      turma:            p.turma,
      diagnostico_cid:  p.diagnostico ?? '',
      profissionais:    [p.profColaborativo, p.profAee].filter(Boolean).join(', '),
    }))
    scheduleSave({ ...fields, aluno: p.name, ra: p.ra, turma: p.turma })
  }

  function toggleAE(descricao: string) {
    setSelAEs(prev => {
      const next = prev.includes(descricao) ? prev.filter(x => x !== descricao) : [...prev, descricao]
      setFields(f => ({ ...f, _aprendizagens: JSON.stringify(next) }))
      scheduleSave({ ...fields, _aprendizagens: JSON.stringify(next) })
      return next
    })
  }

  function toggleInstrumento(nome: string) {
    setSelInstr(prev => {
      const next = prev.includes(nome) ? prev.filter(x => x !== nome) : [...prev, nome]
      setFields(f => ({ ...f, _instrumentos: JSON.stringify(next) }))
      scheduleSave({ ...fields, _instrumentos: JSON.stringify(next) })
      return next
    })
  }

  // ── Save / Export ─────────────────────────────────────────────────────────

  async function autoSave(t: string, c: Record<string, string>) {
    setSaving(true)
    try {
      await fetch(`/api/documentos/${doc.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title: t, content: c }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }

  async function save() {
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/documentos/${doc.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title, content: buildContent(fields) }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error); return }
      setSaved(true); setTimeout(() => setSaved(false), 2000)
      router.refresh()
    } finally { setSaving(false) }
  }

  async function generatePdf() {
    setPdfing(true); setError(null)
    try {
      await save()
      const res = await fetch(`/api/documentos/${doc.id}/pdf`, { method: 'POST' })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Erro ao gerar PDF.'); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      router.refresh()
    } finally { setPdfing(false) }
  }

  async function deletDoc() {
    setConfirmDelete(false)
    const res = await fetch(`/api/documentos/${doc.id}`, { method: 'DELETE' })
    if (res.ok) router.push('/dashboard/documentos')
    else { const d = await res.json(); setError(d.error) }
  }

  async function addFeedback() {
    if (!feedbackText.trim()) return
    const res = await fetch(`/api/documentos/${doc.id}/feedback`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text: feedbackText.trim() }),
    })
    if (res.ok) {
      const d = await res.json()
      setFeedbacks(prev => [d, ...prev])
      setFeedbackText('')
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  function renderCurriculumCascade() {
    const selectedTurma = turmas?.find(t => t.id === turmaId)
    const selectedDisc  = disciplinas?.find(d => d.id === disciplinaId)
    const selectedBim   = bimestres?.find(b => b.numero === bimestreNum)
    const selectedAula  = aulas?.find(a => a.id === aulaId)

    return (
      <div className={s.cascadeSection}>
        <p className={s.cascadeSectionTitle}>contexto curricular</p>

        <div className={s.cascadeRow}>
          {/* Turma */}
          <div className={s.cascadeField}>
            <label className={s.cascadeLabel}>turma</label>
            <div className={s.selectWrap}>
              <select
                className={s.cascadeSelect}
                value={turmaId ?? ''}
                onChange={e => handleTurmaChange(Number(e.target.value))}
              >
                <option value="">selecionar turma…</option>
                {(turmas ?? []).map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.grade})</option>
                ))}
              </select>
              <ChevronDown size={14} className={s.selectChevron} />
            </div>
          </div>

          {/* Disciplina */}
          <div className={s.cascadeField}>
            <label className={s.cascadeLabel}>disciplina</label>
            <div className={s.selectWrap}>
              <select
                className={s.cascadeSelect}
                value={disciplinaId ?? ''}
                disabled={!turmaId}
                onChange={e => handleDisciplinaChange(Number(e.target.value))}
              >
                <option value="">selecionar disciplina…</option>
                {(disciplinas ?? []).map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className={s.selectChevron} />
            </div>
          </div>

          {/* Bimestre */}
          <div className={s.cascadeField}>
            <label className={s.cascadeLabel}>bimestre</label>
            <div className={s.selectWrap}>
              <select
                className={s.cascadeSelect}
                value={bimestreNum ?? ''}
                onChange={e => handleBimestreChange(Number(e.target.value))}
              >
                <option value="">bimestre…</option>
                {(bimestres ?? []).map(b => (
                  <option key={b.id} value={b.numero}>{b.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className={s.selectChevron} />
            </div>
          </div>
        </div>

        {/* Info pills from selection */}
        {selectedTurma && (
          <div className={s.cascadePills}>
            <span className={s.pill}>
              {selectedTurma.ciclo === 'fundamental' ? 'Ensino Fundamental' : 'Ensino Médio'}
              {' · '}{selectedTurma.serie}ª série
            </span>
            {selectedDisc && <span className={s.pill}>{selectedDisc.name}</span>}
            {selectedBim  && <span className={s.pill}>{selectedBim.label}</span>}
          </div>
        )}

        {/* Aula selector (only for PLANO_AULA) */}
        {docType === 'PLANO_AULA' && aulaBase && (
          <div className={s.aulaSection}>
            <label className={s.cascadeLabel}>aula do currículo</label>
            {!aulas ? (
              <p className={s.loadingMsg}>carregando aulas…</p>
            ) : aulas.length === 0 ? (
              <p className={s.emptyMsg}>nenhuma aula encontrada para este período</p>
            ) : (
              <div className={s.aulaList}>
                {aulas.map(a => (
                  <button
                    key={a.id}
                    className={`${s.aulaItem} ${aulaId === a.id ? s.aulaItemSelected : ''}`}
                    onClick={() => handleAulaChange(a.id)}
                  >
                    <span className={s.aulaNum}>{a.aulaNum}</span>
                    <span className={s.aulaTitulo}>{a.titulo}</span>
                    {a.habilidadeCodigo && (
                      <span className={s.aulaCode}>{a.habilidadeCodigo.split(',')[0].trim()}</span>
                    )}
                    {aulaId === a.id && <Check size={13} className={s.aulaCheck} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Auto-filled curriculum info (when aula is selected) */}
        {docType === 'PLANO_AULA' && selectedAula && (
          <div className={s.aulaInfo}>
            {fields.unidade_tematica && (
              <div className={s.aulaInfoItem}>
                <span className={s.aulaInfoLabel}>unidade temática</span>
                <span className={s.aulaInfoValue}>{fields.unidade_tematica}</span>
              </div>
            )}
            {fields.habilidade_codigo && (
              <div className={s.aulaInfoItem}>
                <span className={s.aulaInfoLabel}>habilidade(s)</span>
                <span className={s.aulaInfoValue}>{fields.habilidade_codigo}</span>
              </div>
            )}
            {fields.objeto_conhecimento && (
              <div className={s.aulaInfoItem}>
                <span className={s.aulaInfoLabel}>objeto de conhecimento</span>
                <span className={s.aulaInfoValue}>{fields.objeto_conhecimento}</span>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  function renderAprendizagensChecklist() {
    if (!aes || aes.length === 0) return null
    return (
      <div className={s.checklistSection}>
        <p className={s.checklistTitle}>aprendizagens essenciais</p>
        <div className={s.checklist}>
          {aes.map(ae => {
            const selected = selAEs.includes(ae.descricao)
            return (
              <button
                key={ae.id}
                className={`${s.checkItem} ${selected ? s.checkItemOn : ''}`}
                onClick={() => toggleAE(ae.descricao)}
              >
                <span className={s.checkBox}>{selected && <Check size={10} />}</span>
                <span className={s.checkCode}>{ae.codigo}</span>
                <span className={s.checkDesc}>{ae.descricao}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  function renderInstrumentosChecklist() {
    if (!instrumentos || instrumentos.length === 0) return null
    return (
      <div className={s.checklistSection}>
        <p className={s.checklistTitle}>instrumentos avaliativos</p>
        <div className={s.checklist}>
          {instrumentos.map(inst => {
            const selected = selInstr.includes(inst.nome)
            return (
              <button
                key={inst.id}
                className={`${s.checkItem} ${selected ? s.checkItemOn : ''}`}
                onClick={() => toggleInstrumento(inst.nome)}
              >
                <span className={s.checkBox}>{selected && <Check size={10} />}</span>
                <span className={s.checkDesc}>{inst.nome}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  function renderPeiSelector() {
    const selected = peiStudents?.find(p => p.id === peiStudentId)
    return (
      <div className={s.cascadeSection}>
        <p className={s.cascadeSectionTitle}>aluno PEI</p>
        <div className={s.selectWrap}>
          <select
            className={s.cascadeSelect}
            style={{ width: '100%', maxWidth: 480 }}
            value={peiStudentId ?? ''}
            onChange={e => handlePeiStudentChange(Number(e.target.value))}
          >
            <option value="">selecionar aluno…</option>
            {(peiStudents ?? []).map(p => (
              <option key={p.id} value={p.id}>
                {p.turma} — {p.name} {p.diagnostico ? `(${p.diagnostico})` : ''}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className={s.selectChevron} />
        </div>
        {selected && (
          <div className={s.peiCard}>
            <div className={s.peiRow}><span className={s.peiLbl}>RA</span><span>{selected.ra}</span></div>
            <div className={s.peiRow}><span className={s.peiLbl}>Turma</span><span>{selected.turma}</span></div>
            {selected.diagnostico && <div className={s.peiRow}><span className={s.peiLbl}>Diagnóstico</span><span>{selected.diagnostico}</span></div>}
            {selected.profColaborativo && <div className={s.peiRow}><span className={s.peiLbl}>Prof. Colaborativo</span><span>{selected.profColaborativo}</span></div>}
            {selected.profAee && <div className={s.peiRow}><span className={s.peiLbl}>Prof. AEE</span><span>{selected.profAee}</span></div>}
          </div>
        )}
        <div className={s.peiDivider} />
      </div>
    )
  }

  function renderField(field: FieldDef) {
    const val = fields[field.key] ?? ''

    if (field.type === 'textarea') {
      return (
        <div key={field.key} className={s.field}>
          <label className={s.fieldLabel}>
            {field.label}{field.required && <span className={s.required}> *</span>}
          </label>
          <textarea
            className={s.fieldTextarea}
            value={val}
            placeholder={field.placeholder}
            rows={field.rows ?? 4}
            onChange={e => setField(field.key, e.target.value)}
          />
        </div>
      )
    }

    if (field.type === 'select' && field.options) {
      return (
        <div key={field.key} className={s.field}>
          <label className={s.fieldLabel}>
            {field.label}{field.required && <span className={s.required}> *</span>}
          </label>
          <div className={s.selectWrap}>
            <select
              className={s.fieldSelect}
              value={val}
              onChange={e => setField(field.key, e.target.value)}
            >
              <option value="">selecionar…</option>
              {field.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={14} className={s.selectChevron} />
          </div>
        </div>
      )
    }

    return (
      <div key={field.key} className={s.field}>
        <label className={s.fieldLabel}>
          {field.label}{field.required && <span className={s.required}> *</span>}
        </label>
        <input
          className={s.fieldInput}
          type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
          value={val}
          placeholder={field.placeholder}
          onChange={e => setField(field.key, e.target.value)}
        />
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={s.layout}>
      {/* ── Form area ── */}
      <div className={s.formArea}>
        {/* Doc type badge + title */}
        <div className={s.docHeader}>
          <div
            className={s.typeBadge}
            style={{ background: (meta?.color ?? '#6b7280') + '20', color: meta?.color ?? '#6b7280' }}
          >
            {meta?.label ?? doc.type}
          </div>
          <input
            className={s.titleInput}
            value={title}
            placeholder="Título do documento"
            onChange={e => {
              setTitle(e.target.value)
              if (saveTimer.current) clearTimeout(saveTimer.current)
              saveTimer.current = setTimeout(() => autoSave(e.target.value, buildContent(fields)), 1500)
            }}
          />
        </div>

        {error && <p className={s.errMsg}>{error}</p>}

        {/* ── PEI student picker ── */}
        {isPeiType(docType) && renderPeiSelector()}

        {/* ── Curriculum cascade ── */}
        {isCurriculumType(docType) && renderCurriculumCascade()}

        {/* ── Aprendizagens Essenciais checklist (GUIA_APRENDIZAGEM) ── */}
        {docType === 'GUIA_APRENDIZAGEM' && aulaBase && (
          <div className={s.fieldsGroup}>
            {renderAprendizagensChecklist()}
            {renderInstrumentosChecklist()}
          </div>
        )}

        {/* ── PLANO_AULA: show curriculum content read-only then editable dev fields ── */}
        {docType === 'PLANO_AULA' && aulaId && (
          <div className={s.fieldsGroup}>
            {fields.conteudo_aula && (
              <div className={s.autoField}>
                <p className={s.autoFieldLabel}>conteúdos da aula <span className={s.autoTag}>currículo</span></p>
                <div className={s.autoFieldText}>{fields.conteudo_aula}</div>
              </div>
            )}
            {fields.objetivos_aula && (
              <div className={s.autoField}>
                <p className={s.autoFieldLabel}>objetivos da aula <span className={s.autoTag}>currículo</span></p>
                <div className={s.autoFieldText}>{fields.objetivos_aula}</div>
              </div>
            )}
          </div>
        )}

        {/* ── Regular fields (filtered: skip internal _keys and auto-filled keys for curriculum types) ── */}
        <div className={s.fields}>
          {meta?.fields
            .filter(f => {
              if (isCurriculumType(docType)) {
                // Skip fields that are replaced by the curriculum cascade
                const skipKeys = ['turmas','disciplina','bimestre','habilidades','objeto_conhecimento','conteudos']
                if (skipKeys.includes(f.key)) return false
              }
              if (isPeiType(docType)) {
                // Skip fields auto-filled from PEI student picker
                const skipKeys = ['aluno','ra','turma']
                if (skipKeys.includes(f.key)) return false
              }
              return true
            })
            .map(f => renderField(f))
          }
        </div>

        {/* ── PLANO_AULA: extra development fields ── */}
        {docType === 'PLANO_AULA' && (
          <div className={s.fieldsGroup}>
            <p className={s.groupTitle}>desenvolvimento da aula</p>
            {[
              { key: 'desenvolvimento_inicial',    label: 'Início', rows: 4 },
              { key: 'desenvolvimento_principal',  label: 'Desenvolvimento', rows: 6 },
              { key: 'desenvolvimento_fechamento', label: 'Fechamento', rows: 3 },
            ].map(f => (
              <div key={f.key} className={s.field}>
                <label className={s.fieldLabel}>{f.label}</label>
                <textarea
                  className={s.fieldTextarea}
                  value={fields[f.key] ?? ''}
                  rows={f.rows}
                  onChange={e => setField(f.key, e.target.value)}
                />
              </div>
            ))}
            <div className={s.field}>
              <label className={s.fieldLabel}>instrumentos avaliativos</label>
              {renderInstrumentosChecklist()}
            </div>
          </div>
        )}
      </div>

      {/* ── Side panel ── */}
      <div className={s.sidePanel}>
        {/* Status */}
        <div className={s.sidePanelSection}>
          <p className={s.sidePanelTitle}>status</p>
          <span className={`${s.statusBadge} ${doc.status === 'FINAL' ? s.statusFinal : s.statusDraft}`}>
            {doc.status === 'FINAL' ? <><CheckCircle size={10} /> finalizado</> : <><Clock size={10} /> rascunho</>}
          </span>
          <p className={`${s.savedMsg} ${saved ? s.savedMsgVisible : ''}`}>✓ salvo</p>
        </div>

        {/* Actions */}
        <div className={s.sidePanelSection}>
          <p className={s.sidePanelTitle}>ações</p>
          <button className={`${s.actionBtn} ${s.savBtn}`} onClick={save} disabled={saving}>
            <Save size={13} /> {saving ? 'salvando…' : 'salvar'}
          </button>
          <button className={`${s.actionBtn} ${s.pdfBtn}`} onClick={generatePdf} disabled={pdfing}>
            <FileDown size={13} /> {pdfing ? 'gerando…' : 'baixar PDF'}
          </button>
          {confirmDelete ? (
            <div className={s.deleteConfirm}>
              <p className={s.deleteConfirmMsg}>apagar permanentemente?</p>
              <div className={s.deleteConfirmBtns}>
                <button className={`${s.actionBtn} ${s.cancelBtn}`} onClick={() => setConfirmDelete(false)}>não</button>
                <button className={`${s.actionBtn} ${s.delBtnFull}`} onClick={deletDoc}>sim</button>
              </div>
            </div>
          ) : (
            <button className={`${s.actionBtn} ${s.delBtn}`} onClick={() => setConfirmDelete(true)}>
              <Trash2 size={13} /> apagar
            </button>
          )}
        </div>

        {/* Feedbacks */}
        <div className={s.sidePanelSection} style={{ flex: 1 }}>
          <p className={s.sidePanelTitle}>devolutivas</p>
          {canFeedback && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <textarea
                className={s.fieldTextarea}
                value={feedbackText}
                placeholder="Escreva uma devolutiva…"
                rows={3}
                onChange={e => setFeedbackText(e.target.value)}
                style={{ fontSize: '0.8125rem' }}
              />
              <button
                className={`${s.actionBtn} ${s.savBtn}`}
                onClick={addFeedback}
                disabled={!feedbackText.trim()}
              >
                enviar
              </button>
            </div>
          )}
          <div className={s.feedbackList}>
            {feedbacks.length === 0 ? (
              <p className={s.noFeedback}>nenhuma devolutiva ainda.</p>
            ) : feedbacks.map(fb => (
              <div key={fb.id} className={s.feedbackItem}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className={s.feedbackAuthor}>{fb.coordinator.name}</span>
                  <span className={s.feedbackDate}>{new Date(fb.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
                <p className={s.feedbackText}>{fb.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
