'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight, CheckCircle2, Lock,
  ClipboardList, BookOpen, User, Star, Palette,
  FolderOpen, GraduationCap, FileText, FileCheck,
  Bell, Shield, AlignLeft, ToggleLeft, Calendar, Hash, List,
  Sparkles, Compass, Copy, History, X,
  Wand2, Workflow, BookMarked,
  LayoutGrid, Rows3,
  type LucideIcon,
} from 'lucide-react'
import { type DocType, type FieldType, DOC_TYPES } from '@/lib/doc-types'
import s from './novo.module.css'
import w from '../../_components/wizard.module.css'
import { PageHeader } from '../../_components/PageHeader'
import { Tabs } from '../../_components/Tabs'
import { Button } from '../../_components/Button'
import { Input } from '../../_components/Input'
import { ConfirmDialog } from '../../_components/ConfirmDialog'

type TypeMeta = {
  value:        DocType
  label:        string
  desc:         string
  icon:         LucideIcon
  color:        string
  managerOnly?: boolean
}

const TYPES: TypeMeta[] = [
  { value: 'PLANO_AULA',        label: 'Plano de Aula',        desc: 'Planejamento com conteúdos, habilidades e metodologia',     icon: ClipboardList, color: '#2563eb' },
  { value: 'GUIA_APRENDIZAGEM', label: 'Guia de Aprendizagem', desc: 'Guia bimestral com objetivos, conteúdos e avaliação',       icon: BookOpen,      color: '#0891b2' },
  { value: 'PEI',               label: 'PEI',                  desc: 'Plano Educacional Individualizado (AEE)',                   icon: User,          color: '#7c3aed' },
  { value: 'PLANO_ELETIVA',     label: 'Plano de Eletiva',     desc: 'Planejamento semestral da eletiva',                         icon: Star,          color: '#059669' },
  { value: 'PLANO_EMA',         label: 'Plano EMA',            desc: 'Esporte, Música ou Arte',                                   icon: Palette,       color: '#d97706' },
  { value: 'PROJETO',           label: 'Projeto',              desc: 'Template para projetos pedagógicos',                        icon: FolderOpen,    color: '#be185d' },
  { value: 'PDI',               label: 'PDI',                  desc: 'Plano de Desenvolvimento Individual do professor',          icon: GraduationCap, color: '#475569' },
  { value: 'CARTA_NAUTICA',     label: 'Carta Náutica',        desc: 'Mapa didático por aulas, slides e momentos pedagógicos',    icon: Compass,       color: '#0e7490' },
  { value: 'ATA',               label: 'ATA',                  desc: 'Ata de reunião ou resultado escolar',                       icon: FileText,      color: '#0f766e', managerOnly: true },
  { value: 'DECLARACAO',        label: 'Declaração',           desc: 'Declaração escolar para aluno ou responsável',              icon: FileCheck,     color: '#1d4ed8', managerOnly: true },
  { value: 'COMUNICADO',        label: 'Comunicado',           desc: 'Comunicado para pais, alunos ou comunidade',                icon: Bell,          color: '#c2410c', managerOnly: true },
  { value: 'ATESTADO',          label: 'Atestado',             desc: 'Atestado de frequência, matrícula ou outro',                icon: Shield,        color: '#15803d', managerOnly: true },
]

const FIELD_TYPE_ICON: Record<FieldType, LucideIcon> = {
  text: Hash, textarea: AlignLeft, date: Calendar, number: Hash, select: List, chips: ToggleLeft,
}
const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  text: 'texto curto', textarea: 'texto longo', date: 'data', number: 'número', select: 'seleção única', chips: 'múltipla escolha',
}

// Dicas sobre o editor especializado que abre depois — apenas onde agrega informação.
const EDITOR_FLOW: Partial<Record<DocType, { icon: LucideIcon; label: string }>> = {
  PLANO_AULA:        { icon: Workflow,   label: 'editor com seleção de turma, disciplina e aula do currículo SP' },
  GUIA_APRENDIZAGEM: { icon: Wand2,      label: 'assistente em 5 passos com aprendizagens essenciais do currículo' },
  PEI:               { icon: User,       label: 'vinculado a um aluno — diagnóstico, AEE e plano individualizado' },
  ATA:               { icon: BookMarked, label: 'editor de ATA com participantes e geração de PDF dedicada' },
  CARTA_NAUTICA:     { icon: Compass,    label: 'mapa didático por aulas, slides e momentos pedagógicos' },
  PROJETO:           { icon: FolderOpen, label: 'estrutura de projeto pedagógico com etapas e produto final' },
  PLANO_ELETIVA:     { icon: Star,       label: 'planejamento semestral com objetivos, conteúdos e cronograma' },
  PLANO_EMA:         { icon: Palette,    label: 'estrutura específica para Esporte, Música ou Arte' },
}

// Tipos onde clonar de existente faz pouco sentido (datados / pontuais)
const CLONE_BLACKLIST = new Set<DocType>(['ATA', 'DECLARACAO', 'COMUNICADO', 'ATESTADO'])

type Category = 'pedagogicos' | 'coordenacao'

function currentBimester(d = new Date()): number {
  const m = d.getMonth() + 1
  if (m <= 4)  return 1
  if (m <= 7)  return 2
  if (m <= 10) return 3
  return 4
}

function suggestTitle(type: DocType, label: string): string {
  const now = new Date()
  const yr  = now.getFullYear()
  const bim = currentBimester(now)
  const dd  = String(now.getDate()).padStart(2, '0')
  const mm  = String(now.getMonth() + 1).padStart(2, '0')
  switch (type) {
    case 'PLANO_AULA':         return `Plano de Aula — semana de ${dd}/${mm}`
    case 'GUIA_APRENDIZAGEM':  return `Guia — ${bim}º Bimestre/${yr}`
    case 'PLANO_ELETIVA':      return `Eletiva — ${yr}/${now.getMonth() < 6 ? '1' : '2'}º semestre`
    case 'PLANO_EMA':          return `EMA — ${bim}º Bimestre/${yr}`
    case 'PROJETO':            return `Projeto — ${yr}`
    case 'PEI':                return `PEI — ${yr}`
    case 'PDI':                return `PDI — ${yr}`
    case 'CARTA_NAUTICA':      return `Carta Náutica — ${bim}º Bim/${yr}`
    case 'ATA':                return `ATA — ${dd}/${mm}/${yr}`
    case 'COMUNICADO':         return `Comunicado — ${dd}/${mm}/${yr}`
    case 'DECLARACAO':         return `Declaração — ${dd}/${mm}/${yr}`
    case 'ATESTADO':           return `Atestado — ${dd}/${mm}/${yr}`
    default:                   return `${label} — ${yr}`
  }
}

type RecentDoc = { id: string; title: string; content: unknown; updatedAt: string }
type Props     = { isManager: boolean; preType?: DocType }

export function NovoClient({ isManager, preType }: Props) {
  const router = useRouter()
  const types  = TYPES.filter(t => !t.managerOnly || isManager)

  const [selectedType, setSelectedType] = useState<DocType | null>(preType ?? null)
  const [title,        setTitle]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [dupOpen,      setDupOpen]      = useState(false)
  const [cloneOpen,    setCloneOpen]    = useState(false)
  const [recents,      setRecents]      = useState<RecentDoc[] | null>(null)
  const [cloneFromId,  setCloneFromId]  = useState<string | null>(null)
  const [cloneContent, setCloneContent] = useState<unknown>(null)
  const [category,     setCategory]     = useState<Category>(
    preType && TYPES.find(t => t.value === preType)?.managerOnly ? 'coordenacao' : 'pedagogicos'
  )
  const [view, setView] = useState<'grid' | 'list'>('grid')

  const titleRef = useRef<HTMLInputElement>(null)

  const pedagogicos     = types.filter(t => !t.managerOnly)
  const administrativos = types.filter(t => t.managerOnly)
  const visibleTypes    = category === 'pedagogicos' ? pedagogicos : administrativos

  const meta    = selectedType ? types.find(t => t.value === selectedType) : null
  const docMeta = selectedType ? DOC_TYPES[selectedType] : null

  const infoFields  = useMemo(() => docMeta?.fields.filter(f => f.type !== 'textarea' && f.type !== 'chips') ?? [], [docMeta])
  const chipsFields = useMemo(() => docMeta?.fields.filter(f => f.type === 'chips') ?? [], [docMeta])
  const blockFields = useMemo(() => docMeta?.fields.filter(f => f.type === 'textarea') ?? [], [docMeta])

  function handleSelect(type: DocType) {
    if (type === selectedType) return
    setSelectedType(type)
    setTitle(''); setError(null)
    setDupOpen(false); setCloneOpen(false)
    setRecents(null); setCloneFromId(null); setCloneContent(null)
    setTimeout(() => titleRef.current?.focus(), 120)
  }

  function applySmartFill() {
    if (!selectedType || !meta) return
    setTitle(suggestTitle(selectedType, meta.label))
    titleRef.current?.focus()
  }

  async function toggleClonePanel() {
    if (!selectedType) return
    const next = !cloneOpen
    setCloneOpen(next)
    if (next && recents === null) {
      try {
        const res  = await fetch(`/api/documentos/recentes?type=${selectedType}&limit=5`)
        const data = res.ok ? await res.json() : []
        setRecents(Array.isArray(data) ? data : [])
      } catch { setRecents([]) }
    }
  }

  function selectClone(d: RecentDoc) {
    setCloneFromId(d.id)
    setCloneContent(d.content)
    if (!title.trim()) setTitle(`${d.title} (cópia)`)
    setCloneOpen(false)
    titleRef.current?.focus()
  }

  function clearClone() { setCloneFromId(null); setCloneContent(null) }

  async function doCreate() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/documentos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: selectedType, title: title.trim(), content: cloneContent ?? undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'erro ao criar.'); setLoading(false); return }
      router.push(`/dashboard/documentos/${data.id}`)
    } catch {
      setError('erro de conexão.'); setLoading(false)
    }
  }

  async function create() {
    if (!selectedType || !title.trim()) { setError('preencha o título.'); return }
    setLoading(true); setError(null)
    try {
      const res  = await fetch(`/api/documentos/check?type=${selectedType}&title=${encodeURIComponent(title.trim())}`)
      const data = res.ok ? await res.json() : { duplicate: false }
      if (data.duplicate) { setLoading(false); setDupOpen(true); return }
    } catch { /* segue e cria */ }
    await doCreate()
  }

  return (
    <div className={s.page}>
      <PageHeader
        title="novo documento"
        subtitle="escolha o tipo e defina o título para começar"
        backHref="/dashboard/documentos"
        backLabel="documentos"
      />

      {/* Stepper canônico — 2 passos */}
      <div className={w.stepper} aria-label="progresso">
        <span className={`${w.stepperItem} ${w.stepperItemActive}`}>
          <span className={w.stepperDot}>{selectedType ? <CheckCircle2 size={11} /> : 1}</span>
          <span className={s.stepLabel}>tipo</span>
        </span>
        <span className={`${w.stepperLine} ${selectedType ? w.stepperLineDone : ''}`} />
        <span className={`${w.stepperItem} ${selectedType ? w.stepperItemActive : ''}`}>
          <span className={w.stepperDot}>2</span>
          <span className={s.stepLabel}>título</span>
        </span>
      </div>

      {/* Atalho pro painel de OE */}
      <Link href="/dashboard/oe" className={s.oeBanner}>
        <span className={s.oeBannerIcon}><Compass size={13} /></span>
        <span className={s.oeBannerText}>
          procurando criar um documento de <strong>orientação de estudos</strong>? use o painel dedicado.
        </span>
        <ArrowRight size={13} className={s.oeBannerArrow} />
      </Link>

      {/* ── Passo 1: escolha do tipo ── */}
      <div className={s.typeSection}>
        <div className={s.tabsBar}>
          <Tabs<Category>
            active={category}
            onChange={setCategory}
            items={[
              { key: 'pedagogicos', label: 'pedagógicos', icon: <BookOpen size={13} />, count: pedagogicos.length },
              ...(administrativos.length > 0
                ? [{ key: 'coordenacao' as Category, label: 'coordenação', icon: <Lock size={11} />, count: administrativos.length }]
                : []),
            ]}
          />
          <div className={s.viewToggle} role="group" aria-label="modo de visualização">
            <button
              type="button"
              className={`${s.viewBtn} ${view === 'grid' ? s.viewBtnActive : ''}`}
              onClick={() => setView('grid')}
              title="grade"
              aria-pressed={view === 'grid'}
            ><LayoutGrid size={14} /></button>
            <button
              type="button"
              className={`${s.viewBtn} ${view === 'list' ? s.viewBtnActive : ''}`}
              onClick={() => setView('list')}
              title="lista"
              aria-pressed={view === 'list'}
            ><Rows3 size={14} /></button>
          </div>
        </div>

        {view === 'grid' ? (
          <div className={s.grid}>{visibleTypes.map(renderCard)}</div>
        ) : (
          <div className={s.listView}>{visibleTypes.map(renderListRow)}</div>
        )}
      </div>

      {/* ── Passo 2: título + preview ── */}
      <div className={s.body}>
        <div className={s.leftPanel}>
          <span className={s.panelLabel}>2 — título do documento</span>

          {!selectedType ? (
            <div className={s.emptyStep}>
              <ArrowRight size={13} />
              selecione um tipo acima para continuar.
            </div>
          ) : (
            <div className={s.stepCard}>
              <div className={s.titleRow}>
                <Input
                  placeholder={`ex: ${suggestTitle(selectedType, meta!.label)}`}
                  value={title}
                  onChange={e => { setTitle(e.target.value); setDupOpen(false) }}
                  onKeyDown={e => { if (e.key === 'Enter' && !loading) create() }}
                  autoFocus
                  ref={titleRef}
                />
                <button
                  type="button"
                  className={s.smartBtn}
                  onClick={applySmartFill}
                  title="preencher título automaticamente"
                  aria-label="preencher automaticamente"
                ><Sparkles size={14} /></button>
              </div>

              {!CLONE_BLACKLIST.has(selectedType) && (
                <>
                  <button
                    type="button"
                    className={`${s.cloneToggle} ${cloneFromId ? s.cloneToggleActive : ''}`}
                    onClick={toggleClonePanel}
                  >
                    <Copy size={12} />
                    {cloneFromId ? (
                      <>
                        clonando de documento anterior
                        <span
                          className={s.cloneClear}
                          onClick={e => { e.stopPropagation(); clearClone() }}
                        ><X size={11} /></span>
                      </>
                    ) : 'começar a partir de um documento existente'}
                    <span className={s.cloneToggleArrow}>{cloneOpen ? '−' : '+'}</span>
                  </button>

                  {cloneOpen && (
                    <div className={s.clonePanel}>
                      {recents === null ? (
                        <div className={s.cloneLoading}>
                          {[1, 2, 3].map(i => <div key={i} className={s.cloneSkeleton} />)}
                        </div>
                      ) : recents.length === 0 ? (
                        <div className={s.cloneEmpty}>
                          <History size={14} />
                          você ainda não tem documentos deste tipo.
                        </div>
                      ) : (
                        <div className={s.cloneList}>
                          {recents.map(d => (
                            <button
                              key={d.id}
                              type="button"
                              className={`${s.cloneItem} ${cloneFromId === d.id ? s.cloneItemActive : ''}`}
                              onClick={() => selectClone(d)}
                            >
                              <FileText size={12} className={s.cloneItemIcon} />
                              <span className={s.cloneItemTitle}>{d.title}</span>
                              <span className={s.cloneItemDate}>
                                {new Date(d.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              <Button
                variant="primary"
                iconRight={<ArrowRight size={14} />}
                onClick={create}
                disabled={loading || !title.trim()}
                fullWidth
              >
                {loading ? 'criando…' : cloneFromId ? 'criar com base na cópia' : 'criar documento'}
              </Button>

              {error && <p className={s.errMsg}>{error}</p>}
              <p className={s.hint}>
                você pode alterar o título depois no editor. pressione <kbd className={s.kbd}>enter</kbd> para criar.
              </p>
            </div>
          )}
        </div>

        {/* Preview do tipo selecionado */}
        <div className={s.rightPanel}>
          {!selectedType ? (
            <div className={s.emptyState}>
              <span className={s.emptyIcon}><Sparkles size={20} /></span>
              <p className={s.emptyTitle}>prévia do documento</p>
              <p className={s.emptyDesc}>
                selecione um tipo ao lado para ver os campos que serão preenchidos no editor.
              </p>
              <div className={s.emptyLines}>
                {[80, 55, 70, 45, 60].map((width, i) => (
                  <div key={i} className={s.emptyLine} style={{ width: `${width}%` }} />
                ))}
              </div>
            </div>
          ) : docMeta && meta ? (
            <div className={s.preview} style={{ '--card-color': meta.color } as React.CSSProperties}>
              <div className={s.previewHeader}>
                <span className={s.previewIcon}><meta.icon size={16} /></span>
                <div className={s.previewHeadText}>
                  <span className={s.previewTitle}>{docMeta.label}</span>
                  <span className={s.previewDesc}>{docMeta.description}</span>
                </div>
              </div>

              {EDITOR_FLOW[selectedType] && (
                <div className={s.flowHint}>
                  {(() => { const FlowIcon = EDITOR_FLOW[selectedType]!.icon; return <FlowIcon size={12} /> })()}
                  <span>{EDITOR_FLOW[selectedType]!.label}</span>
                </div>
              )}

              <div className={s.previewBody}>
                {infoFields.length > 0 && (
                  <FieldGroup label="identificação">
                    <div className={s.fieldChips}>
                      {infoFields.map(f => <FieldChip key={f.key} field={f} />)}
                    </div>
                  </FieldGroup>
                )}
                {chipsFields.length > 0 && (
                  <FieldGroup label="seleções múltiplas">
                    <div className={s.fieldChips}>
                      {chipsFields.map(f => <FieldChip key={f.key} field={f} />)}
                    </div>
                  </FieldGroup>
                )}
                {blockFields.length > 0 && (
                  <FieldGroup label="campos descritivos">
                    <div className={s.fieldBlocks}>
                      {blockFields.map(f => (
                        <div key={f.key} className={s.fieldBlock}>
                          <span className={s.fieldBlockDot} />
                          <span className={s.fieldBlockLabel}>
                            {f.label}{f.required && <span className={s.requiredDot} />}
                          </span>
                        </div>
                      ))}
                    </div>
                  </FieldGroup>
                )}
              </div>

              <div className={s.previewFooter}>
                <span>{docMeta.fields.length} campos</span>
                <span className={s.sep}>·</span>
                <span>{docMeta.fields.filter(f => f.required).length} obrigatórios</span>
                <span className={s.sep}>·</span>
                <span>editável após criação</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={dupOpen}
        title="já existe um documento parecido"
        description="você já tem um documento deste tipo com o mesmo título. quer criar outro mesmo assim?"
        confirmLabel="criar mesmo assim"
        isPending={loading}
        onConfirm={() => { setDupOpen(false); doCreate() }}
        onCancel={() => setDupOpen(false)}
      />
    </div>
  )

  function renderCard(t: TypeMeta) {
    const Icon       = t.icon
    const isSelected = selectedType === t.value
    return (
      <button
        key={t.value}
        type="button"
        className={`${s.card} ${isSelected ? s.cardSelected : ''}`}
        style={{ '--card-color': t.color } as React.CSSProperties}
        onClick={() => handleSelect(t.value)}
      >
        {isSelected && <span className={s.cardCheck} aria-hidden><CheckCircle2 size={14} /></span>}
        <span className={s.cardIcon}><Icon size={20} /></span>
        <span className={s.cardLabel}>{t.label}</span>
        <span className={s.cardDesc}>{t.desc}</span>
        {t.managerOnly && (
          <span className={s.cardCoordTag} aria-label="acesso de coordenação">
            <Lock size={8} /> coord
          </span>
        )}
      </button>
    )
  }

  function renderListRow(t: TypeMeta) {
    const Icon       = t.icon
    const isSelected = selectedType === t.value
    return (
      <button
        key={t.value}
        type="button"
        className={`${s.listRow} ${isSelected ? s.listRowSelected : ''}`}
        style={{ '--card-color': t.color } as React.CSSProperties}
        onClick={() => handleSelect(t.value)}
      >
        <span className={s.cardIcon}><Icon size={16} /></span>
        <span className={s.listRowText}>
          <span className={s.listRowLabel}>{t.label}</span>
          <span className={s.listRowDesc}>{t.desc}</span>
        </span>
        {t.managerOnly && <span className={s.cardCoordTag}><Lock size={8} /> coord</span>}
        {isSelected
          ? <CheckCircle2 size={16} className={s.listRowCheck} />
          : <ArrowRight size={14} className={s.listRowArrow} />}
      </button>
    )
  }
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={s.fieldGroup}>
      <span className={s.fieldGroupLabel}>{label}</span>
      {children}
    </div>
  )
}

function FieldChip({ field }: { field: { key: string; label: string; type: FieldType; required?: boolean } }) {
  const Icon = FIELD_TYPE_ICON[field.type]
  return (
    <span className={s.fieldChip} title={FIELD_TYPE_LABEL[field.type]}>
      <Icon size={9} />
      {field.label}
      {field.required && <span className={s.requiredDot} />}
    </span>
  )
}
