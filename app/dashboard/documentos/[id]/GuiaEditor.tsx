'use client'

import { useState, useEffect, useRef } from 'react'
import { Check, ChevronDown, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react'
import {
  BNCC_COMPETENCIAS, DESENVOLVIMENTO_OPTS, RECURSOS_GRUPOS, AVALIACAO_GRUPOS,
  RECURSO_OBRIGATORIO, COMPOSICAO_MODELS, BLOCO_LABELS, BLOCO_ACCENT,
  BIMESTRE_DATAS, REFERENCIAS_PADRAO, modelToText, type Tecnica, type Grupo,
} from '@/lib/guia-data'
import { useFetch } from '@/lib/use-fetch'
import s from './guia.module.css'

type Turma = { id: number; name: string; grade: string; ciclo: string; serie: string }
type Disciplina = { id: number; name: string; aulasNome: string }
type Aula = { id: number; aulaNum: number; titulo: string; conteudo?: string; objetivos?: string; habilidadeCodigo?: string; habilidadeTexto?: string; unidadeTematica?: string }
type AE = { id: number; codigo: string; descricao: string }

type Props = {
  fields:   Record<string, string>
  setField: (key: string, value: string) => void
  isAdmin?: boolean
}

const MAX_ESTRATEGIAS = 5
const STEP_LABELS = ['Identificação', 'Currículo', 'Objetivos', 'Metodologia', 'Finalização']

function currentBimestre() {
  const m = new Date().getMonth() + 1
  return m <= 4 ? '1' : m <= 7 ? '2' : m <= 9 ? '3' : '4'
}

// ─── Tecnica badge (com tooltip de descritor) ─────────────────────────────────
function TecnicaBadge({ item, selected, disabled, onToggle }: {
  item: Tecnica; selected: boolean; disabled?: boolean; onToggle: () => void
}) {
  return (
    <button type="button" disabled={disabled} onClick={onToggle}
      className={`${s.tecnica} ${selected ? s.tecnicaOn : ''} ${disabled ? s.tecnicaDisabled : ''}`}
      title={item.descritor}>
      <span className={s.tecnicaNum}>{String(item.id).padStart(2, '0')}</span>
      <span className={s.tecnicaNome}>{item.nome}</span>
    </button>
  )
}

// ─── Grupo checkbox (recursos / avaliação) ────────────────────────────────────
function GrupoCheckbox({ grupos, value, onChange, lockedItems }: {
  grupos: Grupo[]; value: string; onChange: (v: string) => void; lockedItems?: string[]
}) {
  const [open, setOpen] = useState<Set<string>>(new Set(grupos.filter(g => g.defaultOpen).map(g => g.id)))
  const selected = new Set(value ? value.split(', ').map(x => x.trim()).filter(Boolean) : [])
  const locked = new Set(lockedItems ?? [])

  function toggle(item: string) {
    if (locked.has(item)) return
    const nx = new Set(selected)
    nx.has(item) ? nx.delete(item) : nx.add(item)
    onChange([...nx].join(', '))
  }
  function toggleGrupo(id: string) {
    setOpen(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  return (
    <div className={s.grupoList}>
      {grupos.map(g => {
        const count = g.items.filter(i => selected.has(i)).length
        const isOpen = open.has(g.id)
        return (
          <div key={g.id} className={s.grupo}>
            <button type="button" className={s.grupoHead} onClick={() => toggleGrupo(g.id)}>
              <span className={s.grupoLabel}>{g.label}</span>
              {count > 0 && <span className={s.grupoCount}>{count}</span>}
              <ChevronDown size={12} className={`${s.grupoChevron} ${isOpen ? s.grupoChevronOpen : ''}`} />
            </button>
            {isOpen && (
              <div className={s.grupoBody}>
                {g.items.map(item => {
                  const on = selected.has(item) || locked.has(item)
                  return (
                    <label key={item} className={`${s.grupoItem} ${on ? s.grupoItemOn : ''} ${locked.has(item) ? s.grupoItemLocked : ''}`}>
                      <input type="checkbox" checked={on} disabled={locked.has(item)} onChange={() => toggle(item)} />
                      <span>{item}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function GuiaEditor({ fields, setField, isAdmin }: Props) {
  const turmasRaw = useFetch<Turma[] | { needsSchool: true }>('/api/less/turmas')
  const turmas: Turma[] = Array.isArray(turmasRaw) ? turmasRaw : []

  const selectedTurmas = fields.turmas ? fields.turmas.split(', ').filter(Boolean) : fields.turma ? [fields.turma] : []
  const primaryTurma = turmas.find(t => t.name === (selectedTurmas[0] ?? ''))
  const classId = primaryTurma?.id ?? null

  const disciplinas = useFetch<Disciplina[]>(classId ? `/api/less/disciplinas?classId=${classId}` : null) ?? []

  const hasId = !!(fields.turma && fields.disciplina && fields.bimestre)
  const [step, setStep] = useState<number>(hasId ? 3 : 1)
  const [aulas, setAulas] = useState<Aula[]>([])
  const [aes, setAes] = useState<AE[]>([])
  const [loadingAulas, setLoadingAulas] = useState(false)
  const initRef = useRef(false)

  const estrategiaIds = (fields.estrategia_ids ?? '').split(',').map(Number).filter(Boolean)

  useEffect(() => {
    if (!fields.bimestre)   setField('bimestre', currentBimestre())
    if (!fields.referencias) setField('referencias', REFERENCIAS_PADRAO)
    if (!fields.ano_letivo) setField('ano_letivo', String(new Date().getFullYear()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // On open with existing identification, load curriculum once
  useEffect(() => {
    if (hasId && !initRef.current && primaryTurma && disciplinas.length > 0) {
      initRef.current = true
      loadCurriculo(primaryTurma, fields.disciplina, fields.bimestre, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasId, primaryTurma?.id, disciplinas.length])

  function toggleTurma(t: Turma) {
    const prev = selectedTurmas
    const next = prev.includes(t.name) ? prev.filter(x => x !== t.name) : [...prev, t.name]
    setField('turma', next[0] ?? '')
    setField('turmas', next.join(', '))
    if (next[0] && next[0] !== prev[0]) {
      const np = turmas.find(x => x.name === next[0])
      if (np) { setField('_ciclo', np.ciclo); setField('_serie', np.serie) }
    }
  }

  async function loadCurriculo(turma: Turma, disciplina: string, bimStr: string, autofill = true) {
    if (!turma || !disciplina || !bimStr) return
    const disc = disciplinas.find(d => d.name === disciplina)
    const aulasNome = disc?.aulasNome ?? disciplina
    setLoadingAulas(true)
    setField('_ciclo', turma.ciclo)
    setField('_serie', turma.serie)
    setField('_aulas_nome', aulasNome)
    try {
      const base = `disciplina=${encodeURIComponent(aulasNome)}&serie=${turma.serie}&ciclo=${turma.ciclo}&bimestre=${bimStr}`
      const [rows, aeRows] = await Promise.all([
        fetch(`/api/less/aulas?${base}`).then(r => r.ok ? r.json() : []),
        fetch(`/api/less/aprendizagens?${base}`).then(r => r.ok ? r.json() : []),
      ])
      setAulas(rows ?? [])
      setAes(aeRows ?? [])
      if (autofill && rows && rows.length > 0) {
        const habs  = rows.map((a: Aula) => [a.habilidadeCodigo, a.habilidadeTexto].filter(Boolean).join(' ')).filter(Boolean).join('\n')
        const conts = rows.map((a: Aula) => a.conteudo).filter(Boolean).join('\n')
        if (habs)  setField('habilidades', habs)
        if (conts) setField('conteudos', conts)
        if (rows[0].unidadeTematica && !fields.tema) setField('tema', rows[0].unidadeTematica)
      }
    } finally { setLoadingAulas(false) }
  }

  function buildEstrategias(ids: number[]) {
    return DESENVOLVIMENTO_OPTS.filter(x => ids.includes(x.id)).map(x => `${x.nome} — ${x.descritor}`).join('\n')
  }
  function toggleEstrategia(id: number) {
    const next = estrategiaIds.includes(id)
      ? estrategiaIds.filter(x => x !== id)
      : estrategiaIds.length < MAX_ESTRATEGIAS ? [...estrategiaIds, id] : estrategiaIds
    setField('estrategia_ids', next.join(','))
    setField('estrategias', buildEstrategias(next))
  }

  // ── Competências BNCC ──
  const compIds = new Set((fields.competencias ?? '').split('\n').map(l => { const m = l.match(/^(\d+)\./); return m ? Number(m[1]) : null }).filter((x): x is number => x != null))
  function toggleComp(id: number) {
    const sset = new Set(compIds)
    sset.has(id) ? sset.delete(id) : sset.add(id)
    setField('competencias', BNCC_COMPETENCIAS.filter(c => sset.has(c.id)).map(c => `${c.id}. ${c.nome}`).join('\n'))
  }

  // ── Habilidades badge selector ──
  const habLines = (fields.habilidades ?? '').split('\n').map(l => l.trim()).filter(Boolean)
  const codeMap = new Map<string, string>()
  for (const line of habLines) {
    const m = line.match(/^\(?([A-Z]{2,4}\d+[A-Z]+\d+)\)?\s*(.*)/)
    if (m && !codeMap.has(m[1])) codeMap.set(m[1], line)
  }
  const habCodes = [...codeMap.keys()]
  const selHabCodes = new Set(habCodes) // all selected by default (whatever's in fields.habilidades)
  function toggleHab(code: string) {
    const sset = new Set(selHabCodes)
    sset.has(code) ? sset.delete(code) : sset.add(code)
    setField('habilidades', habCodes.filter(c => sset.has(c)).map(c => codeMap.get(c)!).join('\n'))
  }

  // ── Composição de média ──
  const selectedModel = COMPOSICAO_MODELS.find(m => (fields.composicao_media ?? '').startsWith(m.nome))
  const blocos = ['A', 'B', 'C', 'D', 'E']

  const canStep1 = !!(selectedTurmas[0] && fields.disciplina && fields.bimestre)

  function NavBar() {
    return (
      <div className={s.navbar}>
        <div className={s.steps}>
          {STEP_LABELS.map((label, i) => {
            const n = i + 1
            const active = step === n
            const done = step > n
            return (
              <button key={n} className={`${s.stepBtn} ${active ? s.stepActive : ''} ${done ? s.stepDone : ''}`}
                onClick={() => n < step && setStep(n)} disabled={n > step}>
                <span className={s.stepNum}>{done ? <Check size={9} /> : n}</span>
                <span className={s.stepName}>{label}</span>
              </button>
            )
          })}
        </div>
        <div className={s.navActions}>
          {step > 1 && <button className={s.backBtn} onClick={() => setStep(step - 1)}><ArrowLeft size={12} /> Voltar</button>}
          {step < 5 && (
            <button className={s.nextBtn} disabled={step === 1 && !canStep1}
              onClick={() => {
                if (step === 1 && primaryTurma) loadCurriculo(primaryTurma, fields.disciplina, fields.bimestre)
                setStep(step + 1)
              }}>
              Avançar <ArrowRight size={12} />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={s.wrap}>
      <NavBar />

      {/* ── Step 1: Identificação ── */}
      {step === 1 && (
        <section className={s.section}>
          <div className={s.sectionHead}><span className={s.dot} />Identificação</div>
          <div className={s.field}>
            <label className={s.label}>Turma(s) <span className={s.hint}>selecione uma ou mais</span></label>
            <div className={s.pillRow}>
              {turmas.map(t => (
                <button key={t.id} className={`${s.pill} ${selectedTurmas.includes(t.name) ? s.pillOn : ''}`}
                  onClick={() => toggleTurma(t)}>
                  {selectedTurmas.includes(t.name) && <Check size={10} />}{t.name}
                  <span className={s.pillSub}>{t.grade}</span>
                </button>
              ))}
            </div>
          </div>
          <div className={s.idGrid}>
            <div className={s.field}>
              <label className={s.label}>Disciplina</label>
              <div className={s.selectWrap}>
                <select className={s.select} value={fields.disciplina ?? ''} disabled={!classId}
                  onChange={e => setField('disciplina', e.target.value)}>
                  <option value="">{classId ? 'selecionar…' : 'selecione a turma'}</option>
                  {disciplinas.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
                <ChevronDown size={14} className={s.selectChevron} />
              </div>
            </div>
            <div className={s.field}>
              <label className={s.label}>Bimestre</label>
              <div className={s.chipRow}>
                {['1','2','3','4'].map(b => (
                  <button key={b} className={`${s.chip} ${fields.bimestre === b ? s.chipOn : ''}`}
                    onClick={() => setField('bimestre', b)}>{b}º</button>
                ))}
              </div>
            </div>
            <div className={s.field}>
              <label className={s.label}>Ano letivo</label>
              <input className={s.input} value={fields.ano_letivo ?? ''} onChange={e => setField('ano_letivo', e.target.value)} />
            </div>
            <div className={s.field}>
              <label className={s.label}>Período do bimestre</label>
              <div className={s.periodBox}>{fields.bimestre ? `${fields.bimestre}º Bimestre: ${BIMESTRE_DATAS[fields.bimestre] ?? '—'}` : 'Selecione o bimestre'}</div>
            </div>
          </div>
          {loadingAulas && <p className={s.loadingRow}><Loader2 size={14} className={s.spin} /> Carregando dados do currículo…</p>}
        </section>
      )}

      {/* ── Step 2: Currículo ── */}
      {step === 2 && (
        <section className={s.section}>
          <div className={s.sectionHead}><span className={s.dot} />Aulas do {fields.bimestre}º Bimestre — {fields.disciplina}
            {aulas.length > 0 && <span className={s.badge}>{aulas.length} aulas</span>}</div>
          {loadingAulas ? <p className={s.loadingRow}><Loader2 size={14} className={s.spin} /> Carregando…</p>
            : aulas.length > 0 ? (
            <div className={s.aulaList}>
              {aulas.map(a => (
                <div key={a.id} className={s.aulaRow}>
                  <span className={s.aulaNum}>Aula {a.aulaNum}</span>
                  <div className={s.aulaInfo}>
                    <p className={s.aulaTitulo}>{a.titulo}</p>
                    {a.conteudo && <p className={s.aulaConteudo}>{a.conteudo}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : <p className={s.empty}>Nenhuma aula encontrada para esta disciplina e bimestre.</p>}
          {aes.length > 0 && (
            <div className={s.aesBlock}>
              <p className={s.aesLabel}>Aprendizagens Essenciais do Bimestre</p>
              {aes.map(ae => (
                <div key={ae.id} className={s.aeRow}><span className={s.aeCode}>{ae.codigo}</span><span className={s.aeDesc}>{ae.descricao}</span></div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Step 3: Objetivos e Conteúdo ── */}
      {step === 3 && (
        <section className={s.section}>
          <div className={s.sectionHead}><span className={s.dot} />Objetivos e Conteúdo</div>
          <div className={s.field}>
            <label className={s.label}>Tema / Título do Guia</label>
            <input className={s.input} value={fields.tema ?? ''} placeholder="Ex: Funções Afim e Quadrática" onChange={e => setField('tema', e.target.value)} />
          </div>
          <div className={s.field}>
            <label className={s.label}>Competências gerais (BNCC) <span className={s.hint}>passe o mouse para o descritor</span></label>
            <div className={s.compGrid}>
              {BNCC_COMPETENCIAS.map(comp => {
                const sel = compIds.has(comp.id)
                return (
                  <button key={comp.id} className={`${s.compCard} ${sel ? s.compOn : ''}`} onClick={() => toggleComp(comp.id)} title={comp.descritor}>
                    <span className={s.cardCheck}>{sel && <Check size={9} strokeWidth={3.5} />}</span>
                    <span className={s.compBody}>
                      <span className={s.compNome}><span className={s.compId}>{comp.id}.</span> {comp.nome}</span>
                      <span className={s.compDesc}>{comp.descritor}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className={s.field}>
            <label className={s.label}>Habilidades específicas <span className={s.hint}>clique para incluir/excluir</span></label>
            {habCodes.length > 0 ? (
              <div className={s.habBadges}>
                {habCodes.map(code => {
                  const sel = selHabCodes.has(code)
                  const desc = codeMap.get(code)!.replace(/^\(?[A-Z]{2,4}\d+[A-Z]+\d+\)?\s*/, '')
                  return (
                    <button key={code} className={`${s.habBadge} ${sel ? s.habOn : s.habOff}`} onClick={() => toggleHab(code)} title={desc}>{code}</button>
                  )
                })}
              </div>
            ) : <p className={s.hint}>Selecione turma, disciplina e bimestre para carregar as habilidades automaticamente.</p>}
          </div>
          <div className={s.field}>
            <label className={s.label}>Conteúdos programáticos <span className={s.hint}>preenchido automaticamente</span></label>
            <textarea className={s.textarea} rows={4} value={fields.conteudos ?? ''} placeholder="Conteúdos do bimestre" onChange={e => setField('conteudos', e.target.value)} />
          </div>
          {aes.length > 0 && (
            <div className={s.aesBlock}>
              <p className={s.aesLabel}>Aprendizagens Essenciais do Bimestre</p>
              {aes.map(ae => <div key={ae.id} className={s.aeRow}><span className={s.aeCode}>{ae.codigo}</span><span className={s.aeDesc}>{ae.descricao}</span></div>)}
            </div>
          )}
        </section>
      )}

      {/* ── Step 4: Metodologia e Avaliação ── */}
      {step === 4 && (
        <section className={s.section}>
          <div className={s.sectionHead}><span className={s.dot} />Metodologia e Avaliação</div>
          <div className={s.field}>
            <label className={s.label}>Estratégias didáticas <span className={s.hint}>máx. {MAX_ESTRATEGIAS} ({estrategiaIds.length}/{MAX_ESTRATEGIAS})</span></label>
            <div className={s.tecnicaGrid}>
              {DESENVOLVIMENTO_OPTS.map(m => {
                const sel = estrategiaIds.includes(m.id)
                const disabled = !sel && estrategiaIds.length >= MAX_ESTRATEGIAS
                return <TecnicaBadge key={m.id} item={m} selected={sel} disabled={disabled} onToggle={() => toggleEstrategia(m.id)} />
              })}
            </div>
          </div>
          <div className={s.field}>
            <label className={s.label}>Ajuste(s) por demanda</label>
            <textarea className={s.textarea} rows={3} value={fields.ajustes_demanda ?? ''} placeholder="Registre ajustes por demanda da coordenação..." onChange={e => setField('ajustes_demanda', e.target.value)} />
          </div>
          <div className={s.field}>
            <label className={s.label}>Recursos e materiais</label>
            <GrupoCheckbox grupos={RECURSOS_GRUPOS} value={fields.recursos ?? RECURSO_OBRIGATORIO} onChange={v => setField('recursos', v)} lockedItems={[RECURSO_OBRIGATORIO]} />
          </div>
          <div className={s.field}>
            <label className={s.label}>Avaliação bimestral</label>
            <GrupoCheckbox grupos={AVALIACAO_GRUPOS} value={fields.avaliacao ?? ''} onChange={v => setField('avaliacao', v)} />
          </div>
        </section>
      )}

      {/* ── Step 5: Composição e Referências ── */}
      {step === 5 && (
        <section className={s.section}>
          <div className={s.sectionHead}><span className={s.dot} />Referências e Composição</div>
          <div className={s.field}>
            <label className={s.label}>Composição de média <span className={s.hint}>selecione um modelo</span></label>
            <div className={s.compModelList}>
              {blocos.map(bloco => {
                const models = COMPOSICAO_MODELS.filter(m => m.bloco === bloco)
                const accent = BLOCO_ACCENT[bloco]
                return (
                  <div key={bloco} className={s.blocoGroup} style={{ borderColor: accent + '40' }}>
                    <div className={s.blocoHead}><span className={s.blocoBar} style={{ background: accent }} /><span className={s.blocoLabel} style={{ color: accent }}>Bloco {bloco} — Prova Paulista {BLOCO_LABELS[bloco]}</span></div>
                    <div className={s.blocoModels}>
                      {models.map(m => {
                        const sel = selectedModel?.id === m.id
                        return (
                          <button key={m.id} className={`${s.modelCard} ${sel ? s.modelOn : ''}`}
                            style={sel ? { borderColor: accent, background: accent + '12' } : undefined}
                            onClick={() => setField('composicao_media', sel ? '' : modelToText(m))}>
                            <p className={s.modelNome}>{m.nome}</p>
                            {m.desc && <p className={s.modelDesc}>{m.desc}</p>}
                            <div className={s.modelItens}>
                              {m.itens.map((it, idx) => (
                                <span key={idx} className={s.modelTag} style={it.nome === 'Prova Paulista' ? { background: accent, color: '#fff' } : undefined}>
                                  {it.pct}% {it.nome === 'Prova Paulista' ? 'PP' : it.nome}
                                </span>
                              ))}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className={s.field}>
            <label className={s.label}>Referências bibliográficas</label>
            <textarea className={s.textarea} rows={10} value={fields.referencias ?? ''} onChange={e => setField('referencias', e.target.value)} />
          </div>
        </section>
      )}
    </div>
  )
}
