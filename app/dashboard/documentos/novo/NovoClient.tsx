'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ArrowRight, CheckCircle2, Lock,
  ClipboardList, BookOpen, User, Star, Palette,
  FolderOpen, GraduationCap, FileText, FileCheck,
  Bell, Shield, AlignLeft, ToggleLeft, Calendar, Hash, List,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { type DocType, type FieldType, DOC_TYPES } from '@/lib/doc-types'
import s from './novo.module.css'

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
  { value: 'ATA',               label: 'ATA',                   desc: 'Ata de reunião ou resultado escolar',                       icon: FileText,      color: '#0f766e', managerOnly: true },
  { value: 'DECLARACAO',        label: 'Declaração',            desc: 'Declaração escolar para aluno ou responsável',              icon: FileCheck,     color: '#1d4ed8', managerOnly: true },
  { value: 'COMUNICADO',        label: 'Comunicado',            desc: 'Comunicado para pais, alunos ou comunidade',                icon: Bell,          color: '#c2410c', managerOnly: true },
  { value: 'ATESTADO',          label: 'Atestado',              desc: 'Atestado de frequência, matrícula ou outro',                icon: Shield,        color: '#15803d', managerOnly: true },
]

const FIELD_TYPE_ICON: Record<FieldType, LucideIcon> = {
  text:     Hash,
  textarea: AlignLeft,
  date:     Calendar,
  number:   Hash,
  select:   List,
  chips:    ToggleLeft,
}

const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  text:     'Texto curto',
  textarea: 'Texto longo',
  date:     'Data',
  number:   'Número',
  select:   'Seleção única',
  chips:    'Múltipla escolha',
}

type Props = {
  isManager: boolean
  preType?:  DocType
}

export function NovoClient({ isManager, preType }: Props) {
  const router = useRouter()

  const types   = TYPES.filter(t => !t.managerOnly || isManager)
  const [selectedType, setSelectedType] = useState<DocType | null>(preType ?? null)
  const [title,        setTitle]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  const meta    = selectedType ? types.find(t => t.value === selectedType) : null
  const docMeta = selectedType ? DOC_TYPES[selectedType] : null

  function handleSelect(type: DocType) {
    if (type !== selectedType) { setSelectedType(type); setTitle(''); setError(null) }
  }

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
    } catch {
      setError('Erro de conexão.')
    } finally { setLoading(false) }
  }

  const infoFields  = docMeta?.fields.filter(f => f.type !== 'textarea' && f.type !== 'chips') ?? []
  const chipsFields = docMeta?.fields.filter(f => f.type === 'chips') ?? []
  const blockFields = docMeta?.fields.filter(f => f.type === 'textarea') ?? []

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
      </div>

      {/* ── Step 1: full-width card grid ── */}
      <div className={s.section}>
        <p className={s.stepLabel}>1 — Tipo de documento</p>
        <div className={s.grid}>
          {types.map(t => {
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
                <div className={s.cardTop}>
                  <div className={s.cardIcon} style={{ background: t.color + '18', color: t.color }}>
                    <Icon size={15} />
                  </div>
                  <div className={s.cardBadges}>
                    {t.managerOnly && (
                      <span className={s.coordBadge}><Lock size={7} /> coord</span>
                    )}
                    {isSelected && (
                      <span className={s.checkBadge}><CheckCircle2 size={12} /></span>
                    )}
                  </div>
                </div>
                <p className={`${s.cardLabel} ${isSelected ? s.cardLabelActive : ''}`}>{t.label}</p>
                <p className={s.cardDesc}>{t.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Bottom two-column area: fills remaining height ── */}
      <div className={s.body}>

        {/* Left: title input */}
        <div className={s.leftPanel}>
          <p className={s.stepLabel}>2 — Título do documento</p>

          {!selectedType ? (
            <p className={s.emptyStep}>Selecione um tipo acima para continuar.</p>
          ) : (
            <>
              <input
                className={s.titleInput}
                type="text"
                placeholder={`Ex: ${meta!.label} — 1º Bimestre`}
                value={title}
                autoFocus
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !loading && create()}
              />
              <button
                className={s.submitBtn}
                onClick={create}
                disabled={loading || !title.trim()}
              >
                <ArrowRight size={15} />
                {loading ? 'Criando…' : 'Criar documento'}
              </button>
              {error && <p className={s.errMsg}>{error}</p>}
              <p className={s.hint}>Você pode alterar o título depois no editor.</p>
            </>
          )}
        </div>

        {/* Right: field preview panel */}
        <div className={s.rightPanel}>
          {!selectedType ? (
            /* Empty state */
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
            /* Field preview */
            <div className={s.preview} key={selectedType} style={{ '--card-color': meta.color } as React.CSSProperties}>

              {/* Preview header */}
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

              {/* Field groups */}
              <div className={s.previewBody}>
                {infoFields.length > 0 && (
                  <div className={s.fieldGroup}>
                    <p className={s.fieldGroupLabel}>Identificação</p>
                    <div className={s.fieldChips}>
                      {infoFields.map(f => {
                        const FIcon = FIELD_TYPE_ICON[f.type]
                        return (
                          <span key={f.key} className={s.fieldChip} title={FIELD_TYPE_LABEL[f.type]}>
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
                      {chipsFields.map(f => {
                        const FIcon = FIELD_TYPE_ICON[f.type]
                        return (
                          <span key={f.key} className={s.fieldChip} title={FIELD_TYPE_LABEL[f.type]}>
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
                      {blockFields.map(f => (
                        <div key={f.key} className={s.fieldBlock}>
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
    </div>
  )
}
