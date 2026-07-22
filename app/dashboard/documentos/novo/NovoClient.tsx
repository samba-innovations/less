'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ArrowRight, CheckCircle2, Lock,
  ClipboardList, BookOpen, User, Star, Palette,
  FolderOpen, GraduationCap, FileText, FileCheck,
  Bell, Shield, AlignLeft, ToggleLeft, Calendar, Hash, List,
  Sparkles, Compass, Copy, History, AlertTriangle, X,
  Wand2, Workflow, BookMarked,
  LayoutGrid, Rows3,
  type LucideIcon,
} from 'lucide-react'
import { type DocType, type FieldType, DOC_TYPES } from '@/lib/doc-types'
import s from './novo.module.css'
import { Button } from '../../_components/Button'
import { Input } from '../../_components/Input'

type TypeMeta = {
  value:       DocType
  label:       string
  desc:        string
  icon:        LucideIcon
  color:       string
  managerOnly?: boolean
}

const TYPES: TypeMeta[] = [
  { value: 'PLANO_AULA',        label: 'Plano de Aula',        desc: 'Planejamento com conteúdos, habilidades e metodologia',     icon: ClipboardList, color: '#2563eb' },
  { value: 'GUIA_APRENDIZAGEM', label: 'Guia de Aprendizagem', desc: 'Guia bimestral com objetivos, conteúdos e avaliação',       icon: BookOpen,      color: '#0891b2' },
  { value: 'PEI',               label: 'PEI',                   desc: 'Plano Educacional Individualizado (AEE)',                   icon: User,          color: '#7c3aed' },
  { value: 'PLANO_ELETIVA',     label: 'Plano de Eletiva',     desc: 'Planejamento semestral da eletiva',                         icon: Star,          color: '#059669' },
  { value: 'PLANO_EMA',         label: 'Plano EMA',             desc: 'Esporte, Música ou Arte',                                   icon: Palette,       color: '#d97706' },
  { value: 'PROJETO',           label: 'Projeto',               desc: 'Template para projetos pedagógicos',                        icon: FolderOpen,    color: '#be185d' },
  { value: 'PDI',               label: 'PDI',                   desc: 'Plano de Desenvolvimento Individual do professor',          icon: GraduationCap, color: '#475569' },
  { value: 'CARTA_NAUTICA',     label: 'Carta Náutica',         desc: 'Mapa didático por aulas, slides e momentos pedagógicos',     icon: Compass,       color: '#0e7490' },
  { value: 'ATA',               label: 'ATA',                   desc: 'Ata de reunião ou resultado escolar',                       icon: FileText,      color: '#0f766e', managerOnly: true },
  { value: 'DECLARACAO',        label: 'Declaração',            desc: 'Declaração escolar para aluno ou responsável',              icon: FileCheck,     color: '#1d4ed8', managerOnly: true },
  { value: 'COMUNICADO',        label: 'Comunicado',            desc: 'Comunicado para pais, alunos ou comunidade',                icon: Bell,          color: '#c2410c', managerOnly: true },
  { value: 'ATESTADO',          label: 'Atestado',              desc: 'Atestado de frequência, matrícula ou outro',                icon: Shield,        color: '#15803d', managerOnly: true },
]

const FIELD_TYPE_ICON: Record<FieldType, LucideIcon> = {
  text: Hash, textarea: AlignLeft, date: Calendar, number: Hash, select: List, chips: ToggleLeft,
}
const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  text: 'Texto curto', textarea: 'Texto longo', date: 'Data', number: 'Número', select: 'Seleção única', chips: 'Múltipla escolha',
}

// Dicas sobre o editor especializado que abre depois — apenas onde agrega informação.
const EDITOR_FLOW: Partial<Record<DocType, { icon: LucideIcon; label: string }>> = {
  PLANO_AULA:        { icon: Workflow,    label: 'Editor com seleção de turma, disciplina e aula do currículo SP' },
  GUIA_APRENDIZAGEM: { icon: Wand2,       label: 'Assistente em 5 passos com aprendizagens essenciais do currículo' },
  PEI:               { icon: User,        label: 'Vinculado a um aluno — diagnóstico, AEE e plano individualizado' },
  ATA:               { icon: BookMarked,  label: 'Editor de ATA com participantes e geração de PDF dedicada' },
  CARTA_NAUTICA:     { icon: Compass,     label: 'Mapa didático por aulas, slides e momentos pedagógicos' },
  PROJETO:           { icon: FolderOpen,  label: 'Estrutura de projeto pedagógico com etapas e produto final' },
  PLANO_ELETIVA:     { icon: Star,        label: 'Planejamento semestral com objetivos, conteúdos e cronograma' },
  PLANO_EMA:         { icon: Palette,     label: 'Estrutura específica para Esporte, Música ou Arte' },
}

// Tipos onde clonar de existente faz pouco sentido (datados / pontuais)
const CLONE_BLACKLIST = new Set<DocType>(['ATA', 'DECLARACAO', 'COMUNICADO', 'ATESTADO'])

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

type Props = { isManager: boolean; preType?: DocType }

export function NovoClient({ isManager, preType }: Props) {
  const router = useRouter()

  const types = TYPES.filter(t => !t.managerOnly || isManager)

  const [selectedType, setSelectedType] = useState<DocType | null>(preType ?? null)
  const [title,        setTitle]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [dupOpen,      setDupOpen]      = useState(false)
  const [cloneOpen,    setCloneOpen]    = useState(false)
  const [recents,      setRecents]      = useState<RecentDoc[] | null>(null)
  const [cloneFromId,  setCloneFromId]  = useState<string | null>(null)
  const [cloneContent, setCloneContent] = useState<unknown>(null)
  const [smartPulse,   setSmartPulse]   = useState(false)
  const [category,     setCategory]     = useState<'pedagogicos' | 'coordenacao'>(
    preType && TYPES.find(t => t.value === preType)?.managerOnly ? 'coordenacao' : 'pedagogicos'
  )
  const [view,         setView]         = useState<'grid' | 'list'>('grid')

  const titleRef = useRef<HTMLInputElement>(null)

  const pedagogicos = types.filter(t => !t.managerOnly)
  const administrativos = types.filter(t => t.managerOnly)
  const visibleTypes = category === 'pedagogicos' ? pedagogicos : administrativos

  const meta    = selectedType ? types.find(t => t.value === selectedType) : null
  const docMeta = selectedType ? DOC_TYPES[selectedType] : null

  const infoFields  = useMemo(() => docMeta?.fields.filter(f => f.type !== 'textarea' && f.type !== 'chips') ?? [], [docMeta])
  const chipsFields = useMemo(() => docMeta?.fields.filter(f => f.type === 'chips') ?? [], [docMeta])
  const blockFields = useMemo(() => docMeta?.fields.filter(f => f.type === 'textarea') ?? [], [docMeta])

  function handleSelect(type: DocType) {
    if (type === selectedType) return
    setSelectedType(type)
    setTitle('')
    setError(null)
    setDupOpen(false)
    setCloneOpen(false)
    setRecents(null)
    setCloneFromId(null)
    setCloneContent(null)
    setTimeout(() => titleRef.current?.focus(), 250)
  }

  function applySmartFill() {
    if (!selectedType || !meta) return
    setTitle(suggestTitle(selectedType, meta.label))
    setSmartPulse(true)
    setTimeout(() => setSmartPulse(false), 600)
    titleRef.current?.focus()
  }

  async function toggleClonePanel() {
    if (!selectedType) return
    const next = !cloneOpen
    setCloneOpen(next)
    if (next && recents === null) {
      try {
        const res = await fetch(`/api/documentos/recentes?type=${selectedType}&limit=5`)
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

  function clearClone() {
    setCloneFromId(null)
    setCloneContent(null)
  }

  async function doCreate() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/documentos', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          type:    selectedType,
          title:   title.trim(),
          content: cloneContent ?? undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao criar.'); setLoading(false); return }
      router.push(`/dashboard/documentos/${data.id}`)
    } catch {
      setError('Erro de conexão.'); setLoading(false)
    }
  }

  async function create() {
    if (!selectedType || !title.trim()) { setError('Preencha o título.'); return }
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/documentos/check?type=${selectedType}&title=${encodeURIComponent(title.trim())}`)
      const data = res.ok ? await res.json() : { duplicate: false }
      if (data.duplicate) {
        setLoading(false)
        setDupOpen(true)
        return
      }
    } catch { /* segue e cria */ }
    await doCreate()
  }

  return (
    <div className={s.page}>

      {/* ── Header ── */}
      <div className={s.header}>
        <Link href="/dashboard/documentos" className={s.backBtn}>
          <ArrowLeft size={15} />
        </Link>
        <div>
          <h1 className={s.heading}>Novo Documento</h1>
          <p className={s.headingSub}>Escolha o tipo e defina o título para começar</p>
        </div>
        <div className={s.stepperWrap}>
          <div className={`${s.stepDot} ${s.stepDotActive}`}>1</div>
          <div className={`${s.stepLine} ${selectedType ? s.stepLineFilled : ''}`} />
          <div className={`${s.stepDot} ${selectedType ? s.stepDotActive : ''}`}>2</div>
        </div>
      </div>

      {/* ── OE link banner ── */}
      <Link href="/dashboard/oe" className={s.oeBanner}>
        <span className={s.oeBannerIcon}><Compass size={14} /></span>
        <span className={s.oeBannerText}>
          Procurando criar um documento de <strong>Orientação de Estudos</strong>? Use o painel dedicado.
        </span>
        <ArrowRight size={13} className={s.oeBannerArrow} />
      </Link>

      {/* ── Step 1: tabs (categoria) + view toggle + cards ── */}
      <div className={s.section}>
        <div className={s.tabsBar}>
          <div className={s.tabs} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={category === 'pedagogicos'}
              className={`${s.tab} ${category === 'pedagogicos' ? s.tabActive : ''}`}
              onClick={() => setCategory('pedagogicos')}
            >
              <BookOpen size={13} />
              Pedagógicos
              <span className={s.tabCount}>{pedagogicos.length}</span>
            </button>
            {administrativos.length > 0 && (
              <button
                type="button"
                role="tab"
                aria-selected={category === 'coordenacao'}
                className={`${s.tab} ${category === 'coordenacao' ? s.tabActive : ''}`}
                onClick={() => setCategory('coordenacao')}
              >
                <Lock size={11} />
                Coordenação
                <span className={s.tabCount}>{administrativos.length}</span>
              </button>
            )}
          </div>
          <div className={s.viewToggle} role="group" aria-label="Modo de visualização">
            <button
              type="button"
              className={`${s.viewBtn} ${view === 'grid' ? s.viewBtnActive : ''}`}
              onClick={() => setView('grid')}
              title="Grade"
              aria-pressed={view === 'grid'}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              type="button"
              className={`${s.viewBtn} ${view === 'list' ? s.viewBtnActive : ''}`}
              onClick={() => setView('list')}
              title="Lista"
              aria-pressed={view === 'list'}
            >
              <Rows3 size={14} />
            </button>
          </div>
        </div>

        {view === 'grid' ? (
          <div className={s.grid} key={category}>
            {visibleTypes.map((t, i) => renderCard(t, i))}
          </div>
        ) : (
          <div className={s.listView} key={`list-${category}`}>
            {visibleTypes.map((t, i) => renderListRow(t, i))}
          </div>
        )}
      </div>

      {/* ── Bottom two-column area ── */}
      <div className={s.body}>

        {/* Left: title input + clone-from */}
        <div className={s.leftPanel}>
          <p className={s.stepLabel}>2 — Título do documento</p>

          {!selectedType ? (
            <div className={s.emptyStep}>
              <ArrowRight size={13} className={s.emptyStepArrow} />
              Selecione um tipo acima para continuar.
            </div>
          ) : (
            <div className={s.stepCard} key={selectedType}>
              <div className={s.titleRow}>
                <Input
                  placeholder={`Ex: ${suggestTitle(selectedType, meta!.label)}`}
                  value={title}
                  onChange={e => { setTitle(e.target.value); setDupOpen(false) }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !loading) create()
                    if (e.ctrlKey && e.key === 'Enter' && !loading) create()
                  }}
                  autoFocus
                  className={s.titleInput}
                  ref={titleRef}
                />
                <button
                  type="button"
                  className={`${s.smartBtn} ${smartPulse ? s.smartBtnPulse : ''}`}
                  onClick={applySmartFill}
                  title="Preencher título automaticamente"
                  aria-label="Preencher automaticamente"
                >
                  <Sparkles size={14} />
                </button>
              </div>

              {/* Clone-from row — escondido em tipos pontuais/datados */}
              {!CLONE_BLACKLIST.has(selectedType) && (
              <button
                type="button"
                className={`${s.cloneToggle} ${cloneOpen ? s.cloneToggleOpen : ''} ${cloneFromId ? s.cloneToggleActive : ''}`}
                onClick={toggleClonePanel}
              >
                <Copy size={12} />
                {cloneFromId
                  ? <>Clonando de documento anterior <span className={s.cloneClear} onClick={e => { e.stopPropagation(); clearClone() }}><X size={11} /></span></>
                  : <>Começar a partir de um documento existente</>
                }
                <span className={s.cloneToggleArrow}>{cloneOpen ? '−' : '+'}</span>
              </button>

              )}
              {!CLONE_BLACKLIST.has(selectedType) && cloneOpen && (
                <div className={s.clonePanel}>
                  {recents === null ? (
                    <div className={s.cloneLoading}>
                      {[1, 2, 3].map(i => <div key={i} className={s.cloneSkeleton} style={{ animationDelay: `${i * 0.08}s` }} />)}
                    </div>
                  ) : recents.length === 0 ? (
                    <div className={s.cloneEmpty}>
                      <History size={14} />
                      Você ainda não tem documentos deste tipo.
                    </div>
                  ) : (
                    <div className={s.cloneList}>
                      {recents.map((d, i) => (
                        <button
                          key={d.id}
                          type="button"
                          className={`${s.cloneItem} ${cloneFromId === d.id ? s.cloneItemActive : ''}`}
                          style={{ animationDelay: `${i * 0.04}s` }}
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

              <Button
                variant="primary"
                iconLeft={<ArrowRight size={15} />}
                onClick={create}
                disabled={loading || !title.trim()}
              >{loading ? 'Criando…' : (cloneFromId ? 'Criar com base na cópia' : 'Criar documento')}</Button>

              {error && <p className={s.errMsg}>{error}</p>}
              <p className={s.hint}>Você pode alterar o título depois no editor. Pressione <kbd className={s.kbd}>Enter</kbd> para criar.</p>
            </div>
          )}
        </div>

        {/* Right: preview */}
        <div className={s.rightPanel}>
          {!selectedType ? (
            <div className={s.emptyState}>
              <div className={s.emptyIcon}>
                <Sparkles size={22} />
              </div>
              <p className={s.emptyTitle}>Prévia do documento</p>
              <p className={s.emptyDesc}>
                Selecione um tipo ao lado para ver os campos que serão preenchidos no editor.
              </p>
              <div className={s.emptyLines}>
                {[80, 55, 70, 45, 60].map((w, i) => (
                  <div key={i} className={s.emptyLine} style={{ width: `${w}%`, animationDelay: `${i * 0.07}s` }} />
                ))}
              </div>
            </div>
          ) : docMeta && meta ? (
            <div className={s.preview} key={selectedType} style={{ '--card-color': meta.color } as React.CSSProperties}>
              <div className={s.previewHeader}>
                <div className={s.previewIcon} style={{ background: meta.color + '18', color: meta.color }}>
                  <meta.icon size={16} />
                </div>
                <div>
                  <p className={s.previewTitle}>{docMeta.label}</p>
                  <p className={s.previewDesc}>{docMeta.description}</p>
                </div>
              </div>

              <div className={s.previewDivider} />

              {EDITOR_FLOW[selectedType] && (
                <div className={s.flowHint} style={{ '--card-color': meta.color } as React.CSSProperties}>
                  {(() => { const FlowIcon = EDITOR_FLOW[selectedType]!.icon; return <FlowIcon size={12} /> })()}
                  <span>{EDITOR_FLOW[selectedType]!.label}</span>
                </div>
              )}

              <div className={s.previewBody}>
                {infoFields.length > 0 && (
                  <div className={s.fieldGroup}>
                    <p className={s.fieldGroupLabel}>Identificação</p>
                    <div className={s.fieldChips}>
                      {infoFields.map((f, i) => {
                        const FIcon = FIELD_TYPE_ICON[f.type]
                        return (
                          <span key={f.key} className={s.fieldChip} style={{ animationDelay: `${i * 0.025}s` }} title={FIELD_TYPE_LABEL[f.type]}>
                            <FIcon size={9} />
                            {f.label}
                            {f.required && <span className={s.requiredDot} />}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}

                {chipsFields.length > 0 && (
                  <div className={s.fieldGroup}>
                    <p className={s.fieldGroupLabel}>Seleções múltiplas</p>
                    <div className={s.fieldChips}>
                      {chipsFields.map((f, i) => {
                        const FIcon = FIELD_TYPE_ICON[f.type]
                        return (
                          <span key={f.key} className={s.fieldChip} style={{ animationDelay: `${i * 0.025}s` }} title={FIELD_TYPE_LABEL[f.type]}>
                            <FIcon size={9} />
                            {f.label}
                            {f.required && <span className={s.requiredDot} />}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}

                {blockFields.length > 0 && (
                  <div className={s.fieldGroup}>
                    <p className={s.fieldGroupLabel}>Campos descritivos</p>
                    <div className={s.fieldBlocks}>
                      {blockFields.map((f, i) => (
                        <div key={f.key} className={s.fieldBlock} style={{ animationDelay: `${i * 0.04}s` }}>
                          <div className={s.fieldBlockDot} style={{ background: meta.color }} />
                          <span className={s.fieldBlockLabel}>
                            {f.label}
                            {f.required && <span className={s.requiredDot} />}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className={s.previewFooter}>
                <span className={s.fieldStat}>{docMeta.fields.length} campos</span>
                <span className={s.fieldStatSep}>·</span>
                <span className={s.fieldStat}>{docMeta.fields.filter(f => f.required).length} obrigatórios</span>
                <span className={s.fieldStatSep}>·</span>
                <span className={s.fieldStat}>editável após criação</span>
              </div>
            </div>
          ) : null}
        </div>

      </div>

      {/* ── Custom modal: confirm duplicate ── */}
      {dupOpen && (
        <div className={s.modalOverlay} onClick={() => setDupOpen(false)}>
          <div className={s.modalCard} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className={s.modalIcon}>
              <AlertTriangle size={22} />
            </div>
            <p className={s.modalTitle}>Já existe um documento parecido</p>
            <p className={s.modalDesc}>
              Você já tem um documento deste tipo com o mesmo título.
              Quer criar outro mesmo assim?
            </p>
            <div className={s.modalActions}>
              <button className={s.modalBtnSec} onClick={() => setDupOpen(false)}>Voltar</button>
              <button className={s.modalBtnPri} onClick={() => { setDupOpen(false); doCreate() }} disabled={loading}>
                {loading ? 'Criando…' : 'Criar mesmo assim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  function renderCard(t: TypeMeta, idx: number) {
    const Icon       = t.icon
    const isSelected = selectedType === t.value
    return (
      <button
        key={t.value}
        type="button"
        className={`${s.card} ${isSelected ? s.cardSelected : ''}`}
        style={{ '--card-color': t.color, '--stagger-delay': `${idx * 0.025}s` } as React.CSSProperties}
        onClick={() => handleSelect(t.value)}
      >
        {/* check no canto superior direito (substitui badge "selecionado") */}
        {isSelected && (
          <span className={s.cardCheck} aria-hidden>
            <CheckCircle2 size={14} />
          </span>
        )}

        <div className={s.cardIcon} style={{ background: t.color + '18', color: t.color }}>
          <Icon size={20} />
        </div>

        <p className={`${s.cardLabel} ${isSelected ? s.cardLabelActive : ''}`}>{t.label}</p>
        <p className={s.cardDesc}>{t.desc}</p>

        {/* COORD discreto no canto inferior direito */}
        {t.managerOnly && (
          <span className={s.cardCoordTag} aria-label="Acesso de coordenação">
            <Lock size={8} />
            coord
          </span>
        )}

        {isSelected && <span className={s.cardGlow} aria-hidden />}
      </button>
    )
  }

  function renderListRow(t: TypeMeta, idx: number) {
    const Icon       = t.icon
    const isSelected = selectedType === t.value
    return (
      <button
        key={t.value}
        type="button"
        className={`${s.listRow} ${isSelected ? s.listRowSelected : ''}`}
        style={{ '--card-color': t.color, '--stagger-delay': `${idx * 0.02}s` } as React.CSSProperties}
        onClick={() => handleSelect(t.value)}
      >
        <div className={s.listRowIcon} style={{ background: t.color + '18', color: t.color }}>
          <Icon size={16} />
        </div>
        <div className={s.listRowText}>
          <span className={`${s.listRowLabel} ${isSelected ? s.cardLabelActive : ''}`}>{t.label}</span>
          <span className={s.listRowDesc}>{t.desc}</span>
        </div>
        {t.managerOnly && (
          <span className={s.cardCoordTag}>
            <Lock size={8} />
            coord
          </span>
        )}
        {isSelected
          ? <CheckCircle2 size={16} className={s.listRowCheck} />
          : <ArrowRight size={14} className={s.listRowArrow} />
        }
      </button>
    )
  }
}
