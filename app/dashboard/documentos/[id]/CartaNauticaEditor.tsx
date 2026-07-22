'use client'

import { useState, useEffect } from 'react'
import { Loader2, ArrowRight, Check, Play, RotateCcw, BookOpen, Zap, Flag, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react'
import { useFetch } from '@/lib/use-fetch'
import { Select } from '../../_components/Select'
import { Skeleton } from '../../_components/Skeleton'
import s from './carta.module.css'
import { Button } from '../../_components/Button'
import { formatName } from '@/lib/format-name'

type Props = { fields: Record<string, string>; setField: (k: string, v: string) => void }
type Turma = { id: number; name: string; grade: string; ciclo: string; serie: string }
type Disciplina = { id: number; name: string; aulasNome: string }
type Aula = { id: number; aulaNum: number; titulo: string; conteudo?: string | null; objetivos?: string | null }
type SlideEntry = { slideNum: number; tipo: FarolTipo }

const FAROL_TYPES = {
  para_comecar:  { label: 'Para começar',     abbrev: 'PC', cycle: 'relembre' as const,      icon: Play },
  relembre:      { label: 'Relembre',         abbrev: 'R',  cycle: 'foco_conteudo' as const, icon: RotateCcw },
  foco_conteudo: { label: 'Foco no conteúdo', abbrev: 'FC', cycle: 'na_pratica' as const,    icon: BookOpen },
  na_pratica:    { label: 'Na prática',       abbrev: 'NP', cycle: 'encerramento' as const,  icon: Zap },
  encerramento:  { label: 'Encerramento',     abbrev: 'E',  cycle: null,                     icon: Flag },
} as const
type FarolTipo = keyof typeof FAROL_TYPES

const FAROL_HEX: Record<FarolTipo, string> = {
  para_comecar: '#10b981', relembre: '#f59e0b', foco_conteudo: '#3b82f6', na_pratica: '#8b5cf6', encerramento: '#ec4899',
}

const BIMESTRE_DATAS: Record<string, string> = { '1': '02/02 a 22/04', '2': '23/04 a 06/07', '3': '24/07 a 02/10', '4': '05/10 a 18/12' }
const PERIODO_OPTS = [{ v: 'por_aula', l: 'Por Aula' }, { v: 'semanal', l: 'Semanal' }, { v: 'quinzenal', l: 'Quinzenal' }, { v: 'bimestral', l: 'Bimestral' }]
const TOTAL_SLIDES = 40
const STEP_LABELS = ['Identificação', 'Aulas', 'Slides']

export function CartaNauticaEditor({ fields, setField }: Props) {
  const turmasRaw = useFetch<Turma[] | { needsSchool: true }>('/api/less/turmas')
  const turmas: Turma[] = Array.isArray(turmasRaw) ? turmasRaw : []
  const selectedTurmas = fields.turmas ? fields.turmas.split(', ').filter(Boolean) : []
  const primaryTurma = turmas.find(t => t.name === (selectedTurmas[0] ?? ''))
  const classId = primaryTurma?.id ?? null
  const disciplinas = useFetch<Disciplina[]>(classId ? `/api/less/disciplinas?classId=${classId}` : null) ?? []

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [aulas, setAulas] = useState<Aula[]>([])
  const [loadingAulas, setLoadingAulas] = useState(false)
  const [noAulas, setNoAulas] = useState(false)
  const [currentAulaIndex, setCurrentAulaIndex] = useState(0)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const periodo = fields.periodo ?? 'por_aula'
  const bimestre = fields.bimestre ?? ''
  const disciplina = fields.disciplina ?? ''

  const selectedAulaIds = fields.aula_ids ? fields.aula_ids.split(',').map(Number).filter(Boolean) : []

  // aulaSlides map from aulas_slides_json
  const aulaSlides: Record<number, SlideEntry[]> = (() => {
    if (!fields.aulas_slides_json) return {}
    try {
      const parsed: { aulaId: number; slides: SlideEntry[] }[] = JSON.parse(fields.aulas_slides_json)
      const m: Record<number, SlideEntry[]> = {}
      for (const a of parsed) m[a.aulaId] = a.slides
      return m
    } catch { return {} }
  })()

  useEffect(() => {
    if (step === 2 && primaryTurma && disciplina && bimestre) loadAulas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  async function loadAulas() {
    if (!primaryTurma) return
    const disc = disciplinas.find(d => d.name === disciplina)
    const aulasNome = disc?.aulasNome ?? disciplina
    setLoadingAulas(true); setNoAulas(false)
    try {
      const url = `/api/less/aulas?disciplina=${encodeURIComponent(aulasNome)}&serie=${primaryTurma.serie}&ciclo=${primaryTurma.ciclo}&bimestre=${bimestre}`
      const rows: Aula[] = await fetch(url).then(r => r.ok ? r.json() : [])
      setAulas(rows ?? [])
      if (!rows || rows.length === 0) setNoAulas(true)
      setField('_ciclo', primaryTurma.ciclo); setField('_serie', primaryTurma.serie); setField('_aulas_nome', aulasNome)
    } finally { setLoadingAulas(false) }
  }

  function toggleTurma(name: string) {
    const next = selectedTurmas.includes(name) ? selectedTurmas.filter(x => x !== name) : [...selectedTurmas, name]
    setField('turma', next[0] ?? ''); setField('turmas', next.join(', '))
  }

  const maxAulas = (() => {
    const total = aulas.length || 1
    switch (periodo) { case 'por_aula': return 1; case 'semanal': return Math.max(1, Math.floor(total / 8)); case 'quinzenal': return Math.max(1, Math.floor(total / 4)); default: return total }
  })()

  function toggleAula(id: number) {
    let next: number[]
    if (selectedAulaIds.includes(id)) next = selectedAulaIds.filter(x => x !== id)
    else if (selectedAulaIds.length >= maxAulas) return
    else next = [...selectedAulaIds, id]
    setField('aula_ids', next.join(','))
  }

  const selectedAulaObjs = aulas.filter(a => selectedAulaIds.includes(a.id))

  function saveSlides(map: Record<number, SlideEntry[]>) {
    const data = selectedAulaObjs.map(a => ({ aulaId: a.id, aulaNum: a.aulaNum, titulo: a.titulo, conteudo: a.conteudo ?? null, objetivos: a.objetivos ?? null, slides: (map[a.id] ?? []).sort((x, y) => x.slideNum - y.slideNum) }))
    setField('aulas_slides_json', JSON.stringify(data))
  }

  function handleSlideClick(aulaId: number, slideNum: number) {
    const slides = aulaSlides[aulaId] ?? []
    const existing = slides.find(x => x.slideNum === slideNum)
    let nextSlides: SlideEntry[]
    if (!existing) nextSlides = [...slides, { slideNum, tipo: 'para_comecar' }]
    else {
      const nextTipo = FAROL_TYPES[existing.tipo].cycle
      if (nextTipo === null) nextSlides = slides.filter(x => x.slideNum !== slideNum)
      else nextSlides = slides.map(x => x.slideNum === slideNum ? { ...x, tipo: nextTipo } : x)
    }
    saveSlides({ ...aulaSlides, [aulaId]: nextSlides })
  }

  const totalSelectedSlides = Object.values(aulaSlides).reduce((sum, arr) => sum + arr.length, 0)

  function NavBar() {
    const canAdv1 = !!(primaryTurma && disciplina && bimestre)
    const canAdv2 = selectedAulaIds.length > 0
    return (
      <div className={s.navbar}>
        <div className={s.steps}>
          {STEP_LABELS.map((label, i) => {
            const n = (i + 1) as 1 | 2 | 3
            return <button key={n} className={`${s.stepBtn} ${step === n ? s.stepActive : ''} ${step > n ? s.stepDone : ''}`} onClick={() => n < step && setStep(n)} disabled={n > step}>
              <span className={s.stepNum}>{step > n ? <Check size={9} /> : n}</span><span className={s.stepName}>{label}</span>
            </button>
          })}
        </div>
        <div className={s.navActions}>
          {step > 1 && <Button
            variant="ghost"
            iconLeft={<ArrowLeft size={12} />}
            onClick={() => setStep((step - 1) as 1 | 2 | 3)}
          >Voltar</Button>}
          {step === 1 && <button className={s.nextBtn} disabled={!canAdv1} onClick={() => { if (primaryTurma) { setField('_ciclo', primaryTurma.ciclo); setField('_serie', primaryTurma.serie) } setStep(2) }}>Ver aulas <ArrowRight size={12} /></button>}
          {step === 2 && <button className={s.nextBtn} disabled={!canAdv2} onClick={() => { setCurrentAulaIndex(0); setStep(3) }}>Slides <ArrowRight size={12} /></button>}
        </div>
      </div>
    )
  }

  // ── Step 1 ──
  if (step === 1) return (
    <div className={s.wrap}>
      <NavBar />
      <div className={s.field}>
        <label className={s.label}>Turma(s)</label>
        <div className={s.pillRow}>
          {turmas.map(t => <button key={t.id} className={`${s.pill} ${selectedTurmas.includes(t.name) ? s.pillOn : ''}`} onClick={() => toggleTurma(t.name)}>{formatName(t.name)}<span className={s.pillSub}>{t.grade}</span></button>)}
        </div>
      </div>
      <div className={s.grid3}>
        <div className={s.field}>
          <label className={s.label}>Disciplina</label>
          <Select
            value={disciplina}
            placeholder={classId ? 'Selecione' : 'selecione a turma'}
            options={disciplinas.map(d => ({ value: d.name, label: d.name }))}
            onChange={v => setField('disciplina', v)}
          />
        </div>
        <div className={s.field}>
          <label className={s.label}>Bimestre</label>
          <div className={s.chipRow}>{['1','2','3','4'].map(b => <button key={b} className={`${s.chip} ${bimestre === b ? s.chipOn : ''}`} onClick={() => setField('bimestre', b)}>{b}º</button>)}</div>
          {bimestre && <p className={s.bimHint}>{BIMESTRE_DATAS[bimestre]}</p>}
        </div>
        <div className={s.field}>
          <label className={s.label}>Período</label>
          <Select
            value={periodo}
            options={PERIODO_OPTS.map(o => ({ value: o.v, label: o.l }))}
            onChange={v => setField('periodo', v)}
          />
        </div>
      </div>
    </div>
  )

  // ── Step 2 ──
  if (step === 2) return (
    <div className={s.wrap}>
      <NavBar />
      <div className={s.ctxRow}><span className={s.ctxStrong}>{disciplina}</span> · {bimestre}º Bimestre · {PERIODO_OPTS.find(p => p.v === periodo)?.l} — selecione as aulas</div>
      {loadingAulas ? (
        <div className={s.aulaList} aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={s.aulaItem} style={{ pointerEvents: 'none', opacity: 0.6 }}>
              <Skeleton width={22} height={22} radius="50%" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Skeleton width="18%" height={10} />
                <Skeleton width="72%" height={12} />
              </div>
            </div>
          ))}
        </div>
      )
        : noAulas ? <div className={s.noAulas}><p>Nenhuma aula encontrada.</p><p className={s.noAulasSub}>Verifique turma, disciplina e bimestre.</p></div>
        : (
        <>
          <div className={s.selCount}>Selecione até <strong>{maxAulas}</strong> · <span className={s.selBadge}>{selectedAulaIds.length}/{maxAulas}</span></div>
          <div className={s.aulaList}>
            {aulas.map(a => {
              const sel = selectedAulaIds.includes(a.id)
              const disabled = !sel && selectedAulaIds.length >= maxAulas
              return (
                <button key={a.id} className={`${s.aulaItem} ${sel ? s.aulaOn : ''} ${disabled ? s.aulaDisabled : ''}`} disabled={disabled} onClick={() => toggleAula(a.id)}>
                  <span className={s.aulaCircle}>{sel ? <Check size={11} /> : a.aulaNum}</span>
                  <span className={s.aulaInfo}><span className={s.aulaNum}>Aula {a.aulaNum}</span><span className={s.aulaTitulo}>{a.titulo}</span>{a.objetivos && <span className={s.aulaObj}>{a.objetivos}</span>}</span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )

  // ── Step 3 ──
  const currentAula = selectedAulaObjs[currentAulaIndex]
  if (!currentAula) return <div className={s.wrap}><NavBar /><p className={s.loadingRow}>Nenhuma aula selecionada.</p></div>
  const currentSlides = aulaSlides[currentAula.id] ?? []
  const isLastAula = currentAulaIndex === selectedAulaObjs.length - 1

  return (
    <div className={s.wrap}>
      <NavBar />
      <div className={s.aulaNav}>
        <button className={s.aulaNavBtn} disabled={currentAulaIndex === 0} onClick={() => setCurrentAulaIndex(i => Math.max(0, i - 1))}><ChevronLeft size={20} /></button>
        <div className={s.aulaNavCenter}>
          <p className={s.aulaNavTop}>Aula {currentAulaIndex + 1} de {selectedAulaObjs.length}</p>
          <p className={s.aulaNavTitle}>{currentAula.aulaNum}. {currentAula.titulo}</p>
          <p className={s.aulaNavSub}>{currentSlides.length} slide{currentSlides.length !== 1 ? 's' : ''} mapeado{currentSlides.length !== 1 ? 's' : ''}</p>
        </div>
        <button className={s.aulaNavBtn} disabled={isLastAula} onClick={() => setCurrentAulaIndex(i => Math.min(selectedAulaObjs.length - 1, i + 1))}><ChevronRight size={20} /></button>
      </div>

      <div className={s.legenda}>
        {(Object.entries(FAROL_TYPES) as [FarolTipo, typeof FAROL_TYPES[FarolTipo]][]).map(([tipo, info]) => {
          const Icon = info.icon
          return <div key={tipo} className={s.legItem}><span className={s.legBox} style={{ background: FAROL_HEX[tipo] + '40', borderColor: FAROL_HEX[tipo] }} /><Icon size={11} /><span>{info.abbrev} — {info.label}</span></div>
        })}
        <div className={s.legItem}><span className={s.legBox} style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} /><span>Não mapeado</span></div>
      </div>

      <div className={s.slideGridWrap}>
        <div className={s.slideGrid}>
          {Array.from({ length: TOTAL_SLIDES }, (_, i) => {
            const slideNum = i + 1
            const entry = currentSlides.find(x => x.slideNum === slideNum)
            const hex = entry ? FAROL_HEX[entry.tipo] : null
            return (
              <button key={slideNum} className={s.slide}
                style={entry ? { background: hex! + '38', borderColor: hex!, color: hex! } : undefined}
                title={entry ? FAROL_TYPES[entry.tipo].label : `Slide ${slideNum}`}
                onClick={() => handleSlideClick(currentAula.id, slideNum)}>
                <span className={s.slideNum}>{slideNum}</span>
                {entry && <span className={s.slideAbbr}>{FAROL_TYPES[entry.tipo].abbrev}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {isLastAula && totalSelectedSlides > 0 && (
        <div className={s.concluirRow}>
          <p className={s.concluirInfo}>Total: <strong>{totalSelectedSlides} slides</strong> em <strong>{selectedAulaObjs.length} aulas</strong></p>
          <button className={s.concluirBtn} onClick={() => setConfirmOpen(true)}><Check size={14} /> Concluir Seleção</button>
        </div>
      )}

      {confirmOpen && (
        <div className={s.modalOverlay} onClick={() => setConfirmOpen(false)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <p className={s.modalTitle}>Tem certeza da escolha dos slides?</p>
            <p className={s.modalText}>{totalSelectedSlides} slides em {selectedAulaObjs.length} aulas. Verifique antes de confirmar.</p>
            <div className={s.modalActions}>
              <button className={s.modalCancel} onClick={() => { setConfirmOpen(false); setCurrentAulaIndex(0) }}>Voltar e revisar</button>
              <button className={s.modalPrimary} onClick={() => { setField('carta_nautica_confirmed', '1'); setConfirmOpen(false) }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
