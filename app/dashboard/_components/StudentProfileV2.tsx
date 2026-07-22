'use client'

import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { createPortal } from 'react-dom'
import {
  User, IdCard, Calendar, GraduationCap, BookOpen, Shield, UsersRound,
  ScanLine, AlertTriangle, Pencil, ToggleLeft, ToggleRight, Trash2,
  Plus, Check, X, Phone, ShieldCheck, Sparkles, ZoomIn,
} from 'lucide-react'
import s from './student-profile-v2.module.css'
import { Select } from '../_components/Select'
import { DatePicker } from '../_components/DatePicker'
import { Button } from '../_components/Button'
import { IconButton } from '../_components/IconButton'
import { formatName } from '@/lib/format-name'

// ── Types ────────────────────────────────────────────────────────────────────
export type V2Responsible = {
  id:         number
  name:       string
  relation:   string
  phone:      string | null
  phoneType?: 'CELULAR' | 'FIXO'
}

export type V2Student = {
  id:        number
  name:      string
  ra:        string | null
  birthDate: string | null
  photoUrl:  string | null
  isActive:  boolean
  source?:   string | null
  guardian?: string | null
  tutor?:    string | null
  elective?: { name: string; concept?: string | null } | null
  club?:     { name: string; isLeader?: boolean } | null
  enrollments: { class: { name: string; grade: { name: string } } }[]
  responsibles: V2Responsible[]
}

export type V2Occurrence = {
  id:          number
  date:        string
  description: string
  location:    string | null
  severity:    'LEVE' | 'MODERADA' | 'GRAVE'
  category?:   { name: string } | null
  categoryName?: string
}

export type V2OcrCategory = { id: number; name: string }

// ── View definitions ─────────────────────────────────────────────────────────
type ViewId = 'dados' | 'responsaveis' | 'raiox' | 'ocorrencias' | string

export type V2ExtraView = {
  id:    string
  label: string
  icon:  React.ElementType
  badge?: number | null
  content: React.ReactNode
}

export type V2Props = {
  student:    V2Student
  schoolType: 'PUBLIC' | 'PRIVATE' | string
  canWrite:   boolean
  onClose:    () => void
  onEdit?:    () => void
  onToggle?:  () => void
  onDelete?:  () => void
  // System-specific extra views appear after the universal ones
  extraViews?: V2ExtraView[]
  // Ocorrências (optional — if not provided, the OCORRÊNCIAS view is hidden)
  ocrFetcher?: () => Promise<{ items: V2Occurrence[]; categories: V2OcrCategory[] }>
  ocrCreator?: (input: { categoryId: number; severity: 'LEVE'|'MODERADA'|'GRAVE'; date: string; description: string; location: string | null }) => Promise<V2Occurrence>
  // Responsibles (optional)
  respCreator?: (input: { name: string; relation: string; phoneType: 'CELULAR'|'FIXO'; phone: string }) => Promise<V2Responsible>
  respRemover?: (id: number) => Promise<void>
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatRa(ra: string | null | undefined): string {
  if (!ra) return ''
  const [num, digit] = String(ra).replace(/\s/g, '').split('-')
  const padded = (num ?? '').padStart(12, '0')
  return digit !== undefined ? `${padded}-${digit}` : padded
}

function fmtIsoDate(iso: string | null): string {
  if (!iso) return '—'
  const dt = new Date(iso)
  return `${String(dt.getUTCDate()).padStart(2,'0')}/${String(dt.getUTCMonth()+1).padStart(2,'0')}/${dt.getUTCFullYear()}`
}

function ageFromBirth(iso: string | null): number | null {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / (365.25 * 24 * 3600 * 1000))
}

// ── Subforms isolados (state próprio pra não re-renderizar o modal inteiro)─
type AddRespProps = {
  onAdd:      (input: { name: string; relation: string; phoneType: 'CELULAR'|'FIXO'; phone: string }) => Promise<V2Responsible>
  onClose:    () => void
}

const AddResponsibleForm = memo(function AddResponsibleFormImpl({ onAdd, onClose }: AddRespProps) {
  const [form, setForm]       = useState({ name: '', relation: '', phone: '', phoneType: 'CELULAR' as 'CELULAR'|'FIXO' })
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErr(null)
    try {
      await onAdd(form)
      onClose()
    } catch (er: any) {
      setErr(er?.message ?? 'erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className={s.qForm} onSubmit={handleSubmit}>
      {err && <span className={s.qFormError}>{err}</span>}
      <div className={s.qFormRow}>
        <input className={s.qFormInput} placeholder="nome *" required autoFocus
          value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
        <input className={s.qFormInput} placeholder="parentesco *" required
          value={form.relation} onChange={e => setForm(p => ({ ...p, relation: e.target.value }))} />
      </div>
      <div className={s.qFormRow}>
        <Select
          value={form.phoneType}
          onChange={v => setForm(p => ({ ...p, phoneType: v as 'CELULAR' | 'FIXO' }))}
          options={[{ value: 'CELULAR', label: 'Celular' }, { value: 'FIXO', label: 'Fixo' }]}
        />
        <input className={s.qFormInput} placeholder="telefone" value={form.phone}
          onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
      </div>
      <div className={s.qFormActions}>
        <button type="button" className={s.qCancel} onClick={onClose}>cancelar</button>
        <button type="submit" className={s.qSubmit} disabled={loading}>
          <Check size={11} /> {loading ? 'salvando…' : 'salvar'}
        </button>
      </div>
    </form>
  )
})

type AddOcrProps = {
  onAdd:     (input: { categoryId: number; severity: 'LEVE'|'MODERADA'|'GRAVE'; date: string; description: string; location: string | null }) => Promise<V2Occurrence>
  onClose:   () => void
  categories: V2OcrCategory[]
}

const AddOccurrenceForm = memo(function AddOccurrenceFormImpl({ onAdd, onClose, categories }: AddOcrProps) {
  const [form, setForm] = useState({
    categoryId: '',
    severity:   'LEVE' as 'LEVE'|'MODERADA'|'GRAVE',
    date:       new Date().toISOString().slice(0,10),
    description:'',
    location:   '',
  })
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState<string | null>(null)

  const catOpts = useMemo(
    () => categories.map(c => ({ value: String(c.id), label: c.name })),
    [categories],
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.categoryId) return
    setLoading(true); setErr(null)
    try {
      await onAdd({
        categoryId:  Number(form.categoryId),
        severity:    form.severity,
        date:        form.date,
        description: form.description.trim(),
        location:    form.location.trim() || null,
      })
      onClose()
    } catch (er: any) {
      setErr(er?.message ?? 'erro ao registrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className={s.qForm} onSubmit={handleSubmit}>
      {err && <span className={s.qFormError}>{err}</span>}
      <div className={s.qFormRow}>
        <Select
          value={form.categoryId}
          onChange={v => setForm(p => ({ ...p, categoryId: v }))}
          placeholder="categoria *"
          options={catOpts}
        />
        <Select
          value={form.severity}
          onChange={v => setForm(p => ({ ...p, severity: v as 'LEVE'|'MODERADA'|'GRAVE' }))}
          options={[
            { value: 'LEVE', label: 'Leve' },
            { value: 'MODERADA', label: 'Moderada' },
            { value: 'GRAVE', label: 'Grave' },
          ]}
        />
      </div>
      <DatePicker
        value={form.date ?? null}
        onChange={v => setForm(p => ({ ...p, date: v }))}
      />
      <textarea className={s.qFormTextarea} placeholder="descrição *" required
        value={form.description}
        onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
      <input className={s.qFormInput} placeholder="local (opcional)"
        value={form.location}
        onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
      <div className={s.qFormActions}>
        <button type="button" className={s.qCancel} onClick={onClose}>cancelar</button>
        <button type="submit" className={s.qSubmit}
          disabled={loading || !form.description.trim() || !form.categoryId}>
          <Check size={11} /> {loading ? 'registrando…' : 'registrar'}
        </button>
      </div>
    </form>
  )
})

// ── Component ────────────────────────────────────────────────────────────────
function StudentProfileV2Impl({
  student, schoolType, canWrite,
  onClose, onEdit, onToggle, onDelete,
  extraViews = [],
  ocrFetcher, ocrCreator, respCreator, respRemover,
}: V2Props) {
  // ── Valores derivados memoizados (evitam recompute a cada render) ──────
  const displayName = useMemo(() => formatName(student.name), [student.name])
  const initials    = useMemo(
    () => student.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join(''),
    [student.name]
  )
  const age = useMemo(() => ageFromBirth(student.birthDate), [student.birthDate])
  const turmasLabel = useMemo(
    () => student.enrollments.length > 0
      ? student.enrollments.map(e => `${e.class.grade.name} ${e.class.name}`).join(', ')
      : '—',
    [student.enrollments],
  )

  const [view, setView] = useState<ViewId>('dados')
  const [photoOpen, setPhotoOpen] = useState(false)

  // Responsibles state
  const [resps, setResps]         = useState<V2Responsible[]>(student.responsibles ?? [])
  const [showResp, setShowResp]   = useState(false)

  // Ocorrências state
  const [ocrs, setOcrs]           = useState<V2Occurrence[]>([])
  const [ocrCats, setOcrCats]     = useState<V2OcrCategory[]>([])
  const [ocrLoaded, setOcrLoaded] = useState(false)
  const [ocrFetching, setOcrFetching] = useState(false)
  const [showOcr, setShowOcr]     = useState(false)

  // Esc to close (lightbox first, then modal)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (photoOpen) { setPhotoOpen(false); return }
      onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, photoOpen])

  // Lock body scroll (roda uma vez só)
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Auto-load ocorrências when tab opens
  useEffect(() => {
    if (view !== 'ocorrencias' || ocrLoaded || !ocrFetcher || ocrFetching) return
    setOcrFetching(true)
    ocrFetcher()
      .then(r => { setOcrs(r.items); setOcrCats(r.categories); setOcrLoaded(true) })
      .catch(() => {})
      .finally(() => setOcrFetching(false))
  }, [view, ocrLoaded, ocrFetcher, ocrFetching])

  // Callbacks estáveis para os subforms (evitam re-render dos memos)
  const addResp = useCallback(async (input: Parameters<NonNullable<typeof respCreator>>[0]) => {
    if (!respCreator) throw new Error('Not available')
    const r = await respCreator(input)
    setResps(prev => [...prev, r])
    return r
  }, [respCreator])

  const removeResp = useCallback(async (id: number) => {
    if (!respRemover) return
    try {
      await respRemover(id)
      setResps(prev => prev.filter(r => r.id !== id))
    } catch { /* ignore */ }
  }, [respRemover])

  const addOcr = useCallback(async (input: Parameters<NonNullable<typeof ocrCreator>>[0]) => {
    if (!ocrCreator) throw new Error('Not available')
    const o = await ocrCreator(input)
    setOcrs(prev => [o, ...prev])
    return o
  }, [ocrCreator])

  const closeRespForm = useCallback(() => setShowResp(false), [])
  const closeOcrForm  = useCallback(() => setShowOcr(false), [])

  // ── Views memoizadas ─────────────────────────────────────────
  const showOcrTab  = !!ocrFetcher
  const showRespTab = resps.length > 0 || !!respCreator

  const views = useMemo(() => {
    const list: { id: ViewId; label: string; icon: React.ElementType; badge?: number | null }[] = [
      { id: 'dados', label: 'dados', icon: User },
    ]
    if (showRespTab) list.push({ id: 'responsaveis', label: 'responsáveis', icon: UsersRound, badge: resps.length || null })
    list.push({ id: 'raiox', label: 'raio-x', icon: ScanLine })
    if (showOcrTab)  list.push({ id: 'ocorrencias', label: 'ocorrências', icon: AlertTriangle, badge: ocrs.length || null })
    extraViews.forEach(v => list.push({ id: v.id, label: v.label, icon: v.icon, badge: v.badge ?? null }))
    return list
  }, [showRespTab, showOcrTab, resps.length, ocrs.length, extraViews])

  const currentView = useMemo(
    () => views.find(v => v.id === view) ?? views[0],
    [views, view],
  )

  const extraContent = useMemo(
    () => extraViews.find(v => v.id === view)?.content ?? null,
    [extraViews, view],
  )

  return createPortal(
    <div className={s.overlay} onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={s.panel}>

        {/* ── Sidebar (left) ── */}
        <aside className={s.sidebar}>
          {/* Identity header */}
          <div className={s.sidebarHead}>
            <div
              className={s.avatarBox}
              onClick={() => { if (student.photoUrl) setPhotoOpen(true) }}
              role={student.photoUrl ? 'button' : undefined}
              tabIndex={student.photoUrl ? 0 : undefined}
              onKeyDown={e => { if (student.photoUrl && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setPhotoOpen(true) } }}
              title={student.photoUrl ? 'ampliar foto' : undefined}
            >
              {student.photoUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={student.photoUrl} alt={displayName} className={`${s.avatar} ${s.avatarClickable}`} />
                  <span className={s.avatarZoomHint}><ZoomIn size={20} /></span>
                </>
              ) : (
                <div className={s.avatarFb}>{initials}</div>
              )}
              <span className={`${s.statusDot} ${student.isActive ? s.statusDotActive : s.statusDotInactive}`} />
            </div>
            <h2 className={s.name}>{displayName}</h2>
            {student.ra && <span className={s.ra}>{formatRa(student.ra)}</span>}
            <div className={s.badges}>
              <span className={`${s.badge} ${student.isActive ? s.badgeActive : s.badgeInactive}`}>
                {student.isActive ? 'ativo' : 'inativo'}
              </span>
              {student.source === 'sed' && <span className={`${s.badge} ${s.badgeSed}`}>SED</span>}
            </div>
          </div>

          {/* Views menu */}
          <div className={s.viewsMenu}>
            <span className={s.viewsLabel}>visão</span>
            {views.map(v => {
              const Icon = v.icon
              const isActive = view === v.id
              return (
                <button
                  key={v.id}
                  className={`${s.viewItem} ${isActive ? s.viewItemActive : ''}`}
                  onClick={() => setView(v.id)}
                >
                  <Icon size={15} />
                  <span>{v.label}</span>
                  {v.badge != null && v.badge > 0 && <span className={s.viewBadge}>{v.badge}</span>}
                </button>
              )
            })}
          </div>

          {/* Actions */}
          {canWrite && (onEdit || onToggle || onDelete) && (
            <div className={s.actions}>
              <span className={s.actionsLabel}>ações</span>
              {onEdit && (
                <button className={`${s.actionBtn} ${s.actionBtnPrimary}`} onClick={onEdit}>
                  <Pencil size={14} /> editar dados
                </button>
              )}
              {onToggle && (
                <Button variant="primary" onClick={onToggle}>
                  {student.isActive
                    ? <><ToggleRight size={15} /> desativar</>
                    : <><ToggleLeft  size={15} /> ativar</>}
                </Button>
              )}
              {onDelete && (
                <button className={`${s.actionBtn} ${s.actionBtnDanger}`} onClick={onDelete}>
                  <Trash2 size={14} /> excluir
                </button>
              )}
            </div>
          )}
        </aside>

        {/* ── Main (right) ── */}
        <div className={s.main}>
          <div className={s.mainHead}>
            <div className={s.mainHeadLeft}>
              <span className={s.viewTitle}>{currentView.label}</span>
              <span className={s.viewSubtitle}>
                {view === 'dados'         && 'informações básicas do aluno'}
                {view === 'responsaveis'  && `${resps.length} responsável${resps.length !== 1 ? 'eis' : ''} cadastrado${resps.length !== 1 ? 's' : ''}`}
                {view === 'raiox'         && 'visão geral e indicadores'}
                {view === 'ocorrencias'   && `${ocrs.length} ocorrência${ocrs.length !== 1 ? 's' : ''} registrada${ocrs.length !== 1 ? 's' : ''}`}
              </span>
            </div>
            <IconButton
              icon={<X size={16} />}
              label="Fechar"
              onClick={onClose}
            />
          </div>

          <div className={s.mainBody}>

            {/* ── DADOS ── */}
            {view === 'dados' && (
              <div className={s.infoGrid}>
                <div className={s.infoCard}>
                  <span className={s.infoLabel}><GraduationCap size={11} /> turma(s)</span>
                  <span className={s.infoValue}>{turmasLabel}</span>
                </div>
                {schoolType === 'PUBLIC' && (
                  <div className={s.infoCard}>
                    <span className={s.infoLabel}><IdCard size={11} /> RA</span>
                    <span className={s.infoValue}>{student.ra ? formatRa(student.ra) : '—'}</span>
                  </div>
                )}
                <div className={s.infoCard}>
                  <span className={s.infoLabel}><Calendar size={11} /> nascimento</span>
                  <span className={s.infoValue}>
                    {fmtIsoDate(student.birthDate)}
                    {age !== null && <span className={s.ageSub}>{age} anos</span>}
                  </span>
                </div>
                <div className={s.infoCard}>
                  <span className={s.infoLabel}><User size={11} /> responsável principal</span>
                  <span className={s.infoValue}>{student.guardian ? formatName(student.guardian) : '—'}</span>
                </div>
              </div>
            )}

            {/* ── RESPONSÁVEIS ── */}
            {view === 'responsaveis' && (
              <>
                {canWrite && respCreator && !showResp && (
                  <Button
                    variant="primary"
                    iconLeft={<Plus size={12} />}
                    onClick={() => setShowResp(true)}
                  >adicionar responsável</Button>
                )}

                {showResp && respCreator && (
                  <AddResponsibleForm
                    onAdd={addResp}
                    onClose={closeRespForm}
                  />
                )}

                {resps.length === 0 && !showResp && (
                  <div className={s.empty}>
                    <UsersRound size={32} className={s.emptyIcon} />
                    <span className={s.emptyText}>nenhum responsável cadastrado</span>
                    {canWrite && <span className={s.emptyHint}>clique em &quot;adicionar responsável&quot;</span>}
                  </div>
                )}

                <div className={s.respList} style={{ marginTop: resps.length > 0 ? '0.625rem' : 0 }}>
                  {resps.map(r => (
                    <div key={r.id} className={s.respCard}>
                      <div className={s.respIcon}><User size={16} /></div>
                      <div className={s.respInfo}>
                        <span className={s.respName}>{formatName(r.name)}</span>
                        <span className={s.respMeta}>
                          {r.relation}
                          {r.phone && (
                            <>
                              {' · '}
                              <Phone size={9} style={{ display: 'inline', verticalAlign: 'middle' }} />
                              {' '}{r.phoneType === 'FIXO' ? 'fixo ' : ''}{r.phone}
                            </>
                          )}
                        </span>
                      </div>
                      {canWrite && respRemover && (
                        <button className={s.respDelete} onClick={() => removeResp(r.id)} title="remover">
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── RAIO-X ── */}
            {view === 'raiox' && (
              <>
                <div className={s.statsGrid}>
                  <div className={s.statCard}>
                    <span className={s.statValue}>{resps.length}</span>
                    <span className={s.statLabel}>responsáveis</span>
                  </div>
                  {ocrFetcher && (
                    <div className={s.statCard}>
                      <span className={s.statValue}>{ocrs.length}</span>
                      <span className={s.statLabel}>ocorrências</span>
                    </div>
                  )}
                  <div className={s.statCard}>
                    <span className={s.statValue}>{student.enrollments.length}</span>
                    <span className={s.statLabel}>turma{student.enrollments.length !== 1 ? 's' : ''}</span>
                  </div>
                  {age !== null && (
                    <div className={s.statCard}>
                      <span className={s.statValue}>{age}</span>
                      <span className={s.statLabel}>anos</span>
                    </div>
                  )}
                </div>

                <div className={s.section}>
                  <div className={s.sectionTitle}><Sparkles size={11} /> atividades</div>
                  <div className={s.infoGrid}>
                    <div className={s.infoCard}>
                      <span className={s.infoLabel}><User size={11} /> tutor</span>
                      <span className={s.infoValue}>{student.tutor ? formatName(student.tutor) : '—'}</span>
                    </div>
                    <div className={s.infoCard}>
                      <span className={s.infoLabel}><BookOpen size={11} /> eletiva</span>
                      <span className={s.infoValue}>
                        {student.elective ? student.elective.name : '—'}
                      </span>
                    </div>
                    <div className={s.infoCard}>
                      <span className={s.infoLabel}><Shield size={11} /> clube</span>
                      <span className={s.infoValue}>
                        {student.club ? (
                          <>
                            {student.club.name}
                            {student.club.isLeader && <span className={s.ageSub}>líder</span>}
                          </>
                        ) : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── OCORRÊNCIAS ── */}
            {view === 'ocorrencias' && ocrFetcher && (
              <>
                {canWrite && ocrCreator && !showOcr && (
                  <Button
                    variant="primary"
                    iconLeft={<Plus size={12} />}
                    onClick={() => setShowOcr(true)}
                  >registrar ocorrência</Button>
                )}

                {showOcr && ocrCreator && (
                  <AddOccurrenceForm
                    onAdd={addOcr}
                    onClose={closeOcrForm}
                    categories={ocrCats}
                  />
                )}

                {ocrFetching && !ocrLoaded && <div className={s.empty}><span className={s.emptyText}>carregando…</span></div>}

                {ocrLoaded && ocrs.length === 0 && !showOcr && (
                  <div className={s.empty}>
                    <ShieldCheck size={32} className={s.emptyIcon} />
                    <span className={s.emptyText}>nenhuma ocorrência registrada</span>
                  </div>
                )}

                <div className={s.ocrList} style={{ marginTop: ocrs.length > 0 ? '0.625rem' : 0 }}>
                  {ocrs.map(o => (
                    <div key={o.id} className={s.ocrCard}>
                      <div className={s.ocrHead}>
                        <span className={s.ocrCategory}>{o.category?.name ?? o.categoryName ?? '—'}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className={`${s.ocrSeverity} ${s[`ocrSev${o.severity}`]}`}>{o.severity.toLowerCase()}</span>
                          <span className={s.ocrDate}>{fmtIsoDate(o.date)}</span>
                        </div>
                      </div>
                      <p className={s.ocrBody}>{o.description}</p>
                      {o.location && <span className={s.ocrLocation}>local: {o.location}</span>}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── Extra system-specific views ── */}
            {extraContent}

          </div>
        </div>

        {/* ── Photo lightbox ── */}
        {photoOpen && student.photoUrl && (
          <div className={s.lightbox} onClick={() => setPhotoOpen(false)}>
            <button className={s.lightboxClose} onClick={e => { e.stopPropagation(); setPhotoOpen(false) }} aria-label="Fechar foto">
              <X size={18} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={student.photoUrl}
              alt={displayName}
              className={s.lightboxImg}
              onClick={e => e.stopPropagation()}
            />
            <span className={s.lightboxCaption}>{displayName}</span>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

// memo: evita re-render quando pai muda mas props do modal não mudaram
export const StudentProfileV2 = memo(StudentProfileV2Impl)
