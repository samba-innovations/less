'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  ArrowLeft, ArrowRight, Plus, Check, X, Loader2, Trash2, Download, FileBarChart2,
  Fingerprint, ListChecks, Lightbulb, Stethoscope, BookMarked, CheckCircle2, Users, Unlock, Lock, Pencil,
} from 'lucide-react'
import {
  ENABLED_BIMESTRES, NIVEIS, NIVEL_LABEL, REFERENCIAS_PADRAO, periodoLabel,
  type RsContext, type RsDisciplina, type RsAprendizagem, type RsCatalogos,
  type Nivel, type DificuldadeSel, type EstrategiaSel, type CoordProfessor, type DesbloqueioPainel,
} from '@/lib/rs-shared'
import s from './rs.module.css'
import { IconButton } from '../_components/IconButton'
import { Button } from '../_components/Button'
import { Input } from '../_components/Input'
import { formatName } from '@/lib/format-name'

type Meu = { id: number; title: string; status: string; updatedAt: string; content: any } // eslint-disable-line @typescript-eslint/no-explicit-any
type Mode = 'home' | 'wizard' | 'coord'
const STEPS = [
  { key: 'ident', label: 'Identificação', icon: Fingerprint },
  { key: 'apont', label: 'Apontamento', icon: ListChecks },
  { key: 'estrat', label: 'Estratégias', icon: Lightbulb },
  { key: 'diag', label: 'Diagnóstico', icon: Stethoscope },
  { key: 'refs', label: 'Referências', icon: BookMarked },
  { key: 'fim', label: 'Finalizar', icon: CheckCircle2 },
] as const
const ANO = new Date().getFullYear()
const aKey = (a: RsAprendizagem) => `${a.tipo}|${a.codigo}|${a.descricao}`

export function RelatorioSinteseClient({ ctx, catalogos, meus, professores, desbloqueio, canProduce, canView, canManage }: {
  ctx: RsContext | null; catalogos: RsCatalogos | null; meus: Meu[]
  professores: CoordProfessor[] | null; desbloqueio: DesbloqueioPainel | null
  canProduce: boolean; canView: boolean; canManage: boolean
}) {
  const [mode, setMode] = useState<Mode>('home')
  const [relatorios, setRelatorios] = useState<Meu[]>(meus)
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [pending, start] = useTransition()

  // ── estado do wizard ──
  const [draftId, setDraftId] = useState<number | null>(null)
  const [step, setStep] = useState(0)
  const [disc, setDisc] = useState<RsDisciplina | null>(null)
  const [gradeId, setGradeId] = useState<number | null>(null)
  const [classIds, setClassIds] = useState<number[]>([])
  const [bimestres, setBimestres] = useState<number[]>([])
  const [aprend, setAprend] = useState<RsAprendizagem[]>([])
  const [aesDisp, setAesDisp] = useState<RsAprendizagem[]>([])
  const [habsDisp, setHabsDisp] = useState<RsAprendizagem[]>([])
  const [dificuldades, setDificuldades] = useState<DificuldadeSel[]>([])
  const [difOutro, setDifOutro] = useState('')
  const [estrategias, setEstrategias] = useState<EstrategiaSel[]>([])
  const [estrOutro, setEstrOutro] = useState('')
  const [referencias, setReferencias] = useState(REFERENCIAS_PADRAO)
  const [loadingAE, setLoadingAE] = useState(false)

  const grade = disc?.grades.find(g => g.gradeId === gradeId) ?? null

  function reset() {
    setDraftId(null); setStep(0); setDisc(null); setGradeId(null); setClassIds([]); setBimestres([])
    setAprend([]); setAesDisp([]); setHabsDisp([]); setDificuldades([]); setDifOutro(''); setEstrategias([]); setEstrOutro(''); setReferencias(REFERENCIAS_PADRAO)
  }
  function novo() { reset(); setMode('wizard') }

  async function editar(m: Meu) {
    reset()
    const c = m.content ?? {}
    setDraftId(m.id)
    const d = ctx?.disciplinas.find(x => x.disciplineId === c.disciplineId) ?? null
    setDisc(d); setGradeId(c.gradeId ?? null); setClassIds(c.classIds ?? [])
    setBimestres(Array.isArray(c.bimestres) ? c.bimestres : c.bimestre ? [c.bimestre] : [])
    setAprend(Array.isArray(c.aprendizagens) ? c.aprendizagens : [])
    setDificuldades((c.dificuldades ?? []).filter((x: any) => 'descritorId' in x)) // eslint-disable-line @typescript-eslint/no-explicit-any
    setDifOutro((c.dificuldades ?? []).find((x: any) => 'outro' in x)?.outro ?? '') // eslint-disable-line @typescript-eslint/no-explicit-any
    setEstrategias((c.estrategias ?? []).filter((x: any) => 'intervencaoId' in x)) // eslint-disable-line @typescript-eslint/no-explicit-any
    setEstrOutro((c.estrategias ?? []).find((x: any) => 'outro' in x)?.outro ?? '') // eslint-disable-line @typescript-eslint/no-explicit-any
    setReferencias(c.referencias ?? REFERENCIAS_PADRAO)
    setMode('wizard')
    if (c.disciplineId && c.gradeId && (c.bimestres?.length || c.bimestre)) {
      await carregarAprend(c.disciplineId, c.gradeId, Array.isArray(c.bimestres) ? c.bimestres : [c.bimestre])
    }
  }

  async function carregarAprend(disciplineId: number, gid: number, bims: number[]) {
    setLoadingAE(true)
    const r = await fetch(`/api/rs/aprendizagens?disciplineId=${disciplineId}&gradeId=${gid}&bimestres=${bims.join(',')}`)
    setLoadingAE(false)
    if (!r.ok) { setBanner({ kind: 'err', text: (await r.json().catch(() => ({}))).error ?? 'Falha ao carregar aprendizagens.' }); return }
    const d = await r.json()
    setAesDisp(d.aes ?? []); setHabsDisp(d.habilidades ?? [])
  }

  // valência: 2 pos + 2 neg quando há descritores nas AEs escolhidas
  const valenciaOk = useMemo(() => {
    let totalDescr = 0, pos = 0, neg = 0
    for (const a of aprend) {
      if (a.tipo !== 'AE') continue
      totalDescr += a.descritores?.length ?? 0
      pos += a.descritoresPos?.length ?? 0
      neg += a.descritoresNeg?.length ?? 0
    }
    if (pos > 2 || neg > 2) return false
    if (totalDescr >= 4) return pos === 2 && neg === 2
    return true
  }, [aprend])

  const fase1Ok = !!disc && classIds.length > 0 && bimestres.length >= 1
  const fase2Ok = bimestres.length >= 1 && aprend.length >= 1 && valenciaOk

  function buildContent() {
    const difs: DificuldadeSel[] = [...dificuldades, ...(difOutro.trim() ? [{ outro: difOutro.trim() }] : [])]
    const estr: EstrategiaSel[] = [...estrategias, ...(estrOutro.trim() ? [{ outro: estrOutro.trim() }] : [])]
    return {
      disciplineId: disc?.disciplineId, disciplineNome: disc?.disciplinaNome, disciplineLabel: disc?.name,
      gradeId, gradeLabel: grade?.gradeLabel, ciclo: grade?.ciclo, serie: grade?.serie,
      classIds, classNames: grade?.turmas.filter(t => classIds.includes(t.classId)).map(t => t.name) ?? [],
      bimestre: bimestres[0] ?? null, bimestres, ano: ANO,
      aprendizagens: aprend, dificuldades: difs, estrategias: estr, referencias,
    }
  }

  function salvar(finalize = false) {
    start(async () => {
      const r = await fetch('/api/rs/relatorios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: draftId ?? undefined, content: buildContent(), finalize }) })
      const res = await r.json().catch(() => ({}))
      if (!r.ok || res.error) { setBanner({ kind: 'err', text: res.error ?? 'Erro ao salvar.' }); return }
      if (res.id) setDraftId(res.id)
      const entry: Meu = { id: res.id, title: res.title ?? 'Relatório-Síntese', status: res.status ?? (finalize ? 'FINAL' : 'DRAFT'), updatedAt: new Date().toISOString(), content: buildContent() }
      setRelatorios(prev => { const i = prev.findIndex(x => x.id === res.id); if (i < 0) return [entry, ...prev]; const n = [...prev]; n[i] = entry; return n })
      setBanner({ kind: 'ok', text: finalize ? 'Relatório finalizado.' : 'Rascunho salvo.' })
      if (finalize) setMode('home')
    })
  }

  function excluir(id: number) {
    start(async () => {
      const r = await fetch(`/api/rs/relatorios?id=${id}`, { method: 'DELETE' })
      if (r.ok) setRelatorios(prev => prev.filter(x => x.id !== id))
    })
  }

  // ── AE selection helpers ──
  function toggleAprend(a: RsAprendizagem) {
    setAprend(prev => prev.some(x => aKey(x) === aKey(a)) ? prev.filter(x => aKey(x) !== aKey(a)) : [...prev, a])
  }
  function toggleDescritor(a: RsAprendizagem, descritor: string, val: 'pos' | 'neg') {
    setAprend(prev => prev.map(x => {
      if (aKey(x) !== aKey(a)) return x
      const posArr = new Set(x.descritoresPos ?? []); const negArr = new Set(x.descritoresNeg ?? [])
      const target = val === 'pos' ? posArr : negArr; const other = val === 'pos' ? negArr : posArr
      if (target.has(descritor)) target.delete(descritor); else { target.add(descritor); other.delete(descritor) }
      return { ...x, descritoresPos: [...posArr], descritoresNeg: [...negArr] }
    }))
  }

  const banEl = banner && <div className={`${s.feedback} ${banner.kind === 'ok' ? s.ok : s.err}`} onClick={() => setBanner(null)}>{banner.text}</div>

  // ════════════════ HOME ════════════════
  if (mode === 'home') {
    return (
      <div>
        {banEl}
        <div className={s.toolbar}>
          {canProduce && <Button
            variant="primary"
            iconLeft={<Plus size={15} />}
            onClick={novo}
          >Novo relatório</Button>}
          {canView && <Button
            variant="ghost"
            iconLeft={<Users size={15} />}
            onClick={() => setMode('coord')}
          >Coordenação</Button>}
        </div>
        {relatorios.length === 0 ? (
          <div className={s.empty}><FileBarChart2 size={28} className={s.emptyIcon} /><p>Nenhum relatório ainda.</p></div>
        ) : (
          <div className={s.grid}>
            {relatorios.map(m => (
              <div key={m.id} className={s.card}>
                <div className={s.cardTop}>
                  <span className={m.status === 'FINAL' || m.status === 'final' ? s.tagFinal : s.tagDraft}>{m.status === 'FINAL' || m.status === 'final' ? 'finalizado' : 'rascunho'}</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <a className={s.iconBtn} href={`/api/rs/relatorios/${m.id}/docx`} title="Baixar DOCX"><Download size={15} /></a>
                    {canProduce && <IconButton
                      icon={<Pencil size={15} />}
                      label="Editar"
                      onClick={() => editar(m)}
                    />}
                    {canProduce && <IconButton
                      icon={<Trash2 size={15} />}
                      label="Excluir"
                      variant="danger"
                      onClick={() => excluir(m.id)}
                    />}
                  </div>
                </div>
                <p className={s.cardTitle}>{m.title}</p>
                <p className={s.cardSub}>{m.content?.classNames?.join(', ') || '—'} · {periodoLabel(m.content?.bimestres ?? [])}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ════════════════ COORDENAÇÃO + DESBLOQUEIO ════════════════
  if (mode === 'coord') {
    return (
      <div>
        {banEl}
        <div className={s.toolbar}><Button
          variant="ghost"
          iconLeft={<ArrowLeft size={15} />}
          onClick={() => setMode('home')}
        >Voltar</Button></div>
        {canManage && desbloqueio && <DesbloqueioPanel painel={desbloqueio} />}
        <div className={s.sectionTitle}><Users size={16} /> Professores e relatórios</div>
        <div className={s.coordList}>
          {(professores ?? []).map(p => (
            <div key={p.id} className={s.card}>
              <div className={s.cardTop}>
                <b>{formatName(p.name)}</b>
                {!p.temDisciplinaElegivel && <span className={s.tagMuted}>sem disciplina elegível</span>}
                <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{p.relatorios.length} relatório(s)</span>
              </div>
              {p.relatorios.length > 0 && (
                <div className={s.relList}>
                  {p.relatorios.map(r => (
                    <a key={r.id} href={`/api/rs/relatorios/${r.id}/docx`} className={s.relRow}>
                      <span className={r.status === 'FINAL' || r.status === 'final' ? s.dotFinal : s.dotDraft} />
                      <span className={s.relDisc}>{r.disciplinaLabel} · {r.serie}ª{r.bimestre ? ` · ${r.bimestre}º bim` : ''}</span>
                      <Download size={13} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ════════════════ WIZARD ════════════════
  const stepKey = STEPS[step].key
  return (
    <div>
      {banEl}
      <div className={s.timeline}>
        {STEPS.map((st, i) => {
          const Icon = st.icon
          const done = i < step
          return (
            <button key={st.key} className={`${s.tlStep} ${i === step ? s.tlActive : ''} ${done ? s.tlDone : ''}`}
              onClick={() => { if (i <= step) setStep(i) }} disabled={i > step}>
              <span className={s.tlIcon}>{done ? <Check size={13} /> : <Icon size={13} />}</span>
              <span className={s.tlLabel}>{st.label}</span>
            </button>
          )
        })}
      </div>

      <div className={s.wizardBody}>
        {stepKey === 'ident' && (
          <IdentStep ctx={ctx} disc={disc} setDisc={d => { setDisc(d); setGradeId(null); setClassIds([]) }}
            gradeId={gradeId} setGradeId={g => { setGradeId(g); setClassIds([]) }}
            classIds={classIds} setClassIds={setClassIds} bimestres={bimestres} setBimestres={setBimestres} />
        )}
        {stepKey === 'apont' && (
          <ApontStep loading={loadingAE} aes={aesDisp} habs={habsDisp} aprend={aprend}
            onLoad={() => disc && gradeId && carregarAprend(disc.disciplineId, gradeId, bimestres)}
            toggleAprend={toggleAprend} toggleDescritor={toggleDescritor} valenciaOk={valenciaOk} />
        )}
        {stepKey === 'estrat' && catalogos && (
          <EscolhaStep titulo="Estratégias que funcionaram" itens={catalogos.intervencoes.map(i => ({ id: i.id, titulo: i.titulo, sub: i.objetivo }))}
            selected={estrategias.filter(e => 'intervencaoId' in e).map(e => (e as { intervencaoId: string }).intervencaoId)}
            onToggle={id => setEstrategias(p => p.some(e => 'intervencaoId' in e && e.intervencaoId === id) ? p.filter(e => !('intervencaoId' in e && e.intervencaoId === id)) : [...p, { intervencaoId: id }])}
            outro={estrOutro} setOutro={setEstrOutro} />
        )}
        {stepKey === 'diag' && catalogos && (
          <DiagStep dificuldades={catalogos.dificuldades} sel={dificuldades} setSel={setDificuldades} outro={difOutro} setOutro={setDifOutro} />
        )}
        {stepKey === 'refs' && (
          <div className={s.card}>
            <div className={s.sectionTitle}><BookMarked size={16} /> Referências (ABNT)</div>
            <textarea className={s.refs} value={referencias} onChange={e => setReferencias(e.target.value)} rows={14} />
          </div>
        )}
        {stepKey === 'fim' && (
          <div className={s.card}>
            <div className={s.sectionTitle}><CheckCircle2 size={16} /> Revisar e finalizar</div>
            <ul className={s.review}>
              <li><b>Disciplina:</b> {disc?.name} · {grade?.gradeLabel}</li>
              <li><b>Turmas:</b> {grade?.turmas.filter(t => classIds.includes(t.classId)).map(t => t.name).join(', ') || '—'}</li>
              <li><b>Período:</b> {periodoLabel(bimestres)}</li>
              <li><b>Aprendizagens:</b> {aprend.length}</li>
              <li><b>Dificuldades:</b> {dificuldades.length + (difOutro.trim() ? 1 : 0)} · <b>Estratégias:</b> {estrategias.length + (estrOutro.trim() ? 1 : 0)}</li>
            </ul>
            {!fase2Ok && <p className={s.warn}>Complete a Identificação e o Apontamento (2 descritores ✓ e 2 ✗ quando houver) para finalizar.</p>}
            <button className={s.btnPrimary} onClick={() => salvar(true)} disabled={pending || !fase2Ok}>
              {pending ? <Loader2 size={15} className="spin" /> : <CheckCircle2 size={15} />} Finalizar relatório
            </button>
          </div>
        )}
      </div>

      <div className={s.wizardFooter}>
        <Button
          variant="ghost"
          iconLeft={<ArrowLeft size={15} />}
          onClick={() => step === 0 ? setMode('home') : setStep(step - 1)}
        >{step === 0 ? 'Sair' : 'Voltar'}</Button>
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <Button
            variant="ghost"
            onClick={() => salvar(false)}
            disabled={pending || !fase1Ok}
          >Salvar rascunho</Button>
          {step < STEPS.length - 1 && (
            <button className={s.btnPrimary} disabled={(stepKey === 'ident' && !fase1Ok) || (stepKey === 'apont' && !fase2Ok)}
              onClick={() => { if (stepKey === 'ident') carregarAprend(disc!.disciplineId, gradeId!, bimestres); setStep(step + 1) }}>
              Avançar <ArrowRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Fase 1 ──
function IdentStep({ ctx, disc, setDisc, gradeId, setGradeId, classIds, setClassIds, bimestres, setBimestres }: {
  ctx: RsContext | null; disc: RsDisciplina | null; setDisc: (d: RsDisciplina | null) => void
  gradeId: number | null; setGradeId: (g: number | null) => void
  classIds: number[]; setClassIds: (v: number[]) => void; bimestres: number[]; setBimestres: (v: number[]) => void
}) {
  const grade = disc?.grades.find(g => g.gradeId === gradeId) ?? null
  return (
    <div className={s.card}>
      <div className={s.sectionTitle}><Fingerprint size={16} /> Identificação</div>
      <p className={s.lbl}>Disciplina</p>
      <div className={s.chips}>
        {(ctx?.disciplinas ?? []).map(d => <button key={d.disciplineId} className={`${s.chip} ${disc?.disciplineId === d.disciplineId ? s.chipOn : ''}`} onClick={() => setDisc(d)}>{d.name}</button>)}
        {(!ctx || ctx.disciplinas.length === 0) && <span className={s.muted}>Nenhuma disciplina elegível atribuída a você.</span>}
      </div>
      {disc && (<>
        <p className={s.lbl}>Série</p>
        <div className={s.chips}>{disc.grades.map(g => <button key={g.gradeId} className={`${s.chip} ${gradeId === g.gradeId ? s.chipOn : ''}`} onClick={() => setGradeId(g.gradeId)}>{g.gradeLabel}</button>)}</div>
      </>)}
      {grade && (<>
        <p className={s.lbl}>Turmas</p>
        <div className={s.chips}>{grade.turmas.map(tu => <button key={tu.classId} className={`${s.chip} ${classIds.includes(tu.classId) ? s.chipOn : ''}`} onClick={() => setClassIds(classIds.includes(tu.classId) ? classIds.filter(x => x !== tu.classId) : [...classIds, tu.classId])}>{tu.name}</button>)}</div>
        <p className={s.lbl}>Bimestre(s)</p>
        <div className={s.chips}>{ENABLED_BIMESTRES.map(b => <button key={b} className={`${s.chip} ${bimestres.includes(b) ? s.chipOn : ''}`} onClick={() => setBimestres(bimestres.includes(b) ? bimestres.filter(x => x !== b) : [...bimestres, b].sort())}>{b}º bimestre</button>)}</div>
      </>)}
    </div>
  )
}

// ── Fase 2 ──
function ApontStep({ loading, aes, habs, aprend, onLoad, toggleAprend, toggleDescritor, valenciaOk }: {
  loading: boolean; aes: RsAprendizagem[]; habs: RsAprendizagem[]; aprend: RsAprendizagem[]
  onLoad: () => void; toggleAprend: (a: RsAprendizagem) => void; toggleDescritor: (a: RsAprendizagem, d: string, v: 'pos' | 'neg') => void; valenciaOk: boolean
}) {
  const sel = (a: RsAprendizagem) => aprend.find(x => aKey(x) === aKey(a))
  if (loading) return <div className={s.card}><SkeletonText lines={4} /></div>
  if (aes.length === 0 && habs.length === 0) return <div className={s.card}><p>Nenhuma aprendizagem para o filtro.</p><Button variant="ghost" onClick={onLoad}>Recarregar</Button></div>
  return (
    <div className={s.card}>
      <div className={s.sectionTitle}><ListChecks size={16} /> Aprendizagens Essenciais</div>
      {!valenciaOk && <p className={s.warn}>Classifique 2 descritores de melhor (✓) e 2 de pior (✗) desempenho.</p>}
      <div className={s.aeList}>
        {aes.map(a => {
          const chosen = sel(a)
          return (
            <div key={aKey(a)} className={`${s.aeItem} ${chosen ? s.aeOn : ''}`}>
              <button className={s.aeHead} onClick={() => toggleAprend(a)}>
                <span className={s.aeCode}>{a.codigo}</span><span className={s.aeDesc}>{a.descricao}</span>
                {chosen ? <Check size={15} style={{ color: 'var(--primary)' }} /> : <Plus size={15} />}
              </button>
              {chosen && (a.descritores?.length ?? 0) > 0 && (
                <div className={s.descrs}>
                  {a.descritores!.map(d => {
                    const isPos = chosen.descritoresPos?.includes(d); const isNeg = chosen.descritoresNeg?.includes(d)
                    return (
                      <div key={d} className={s.descrRow}>
                        <span className={s.descrTxt}>{d}</span>
                        <button className={`${s.valBtn} ${isPos ? s.valPos : ''}`} onClick={() => toggleDescritor(a, d, 'pos')}>✓</button>
                        <button className={`${s.valBtn} ${isNeg ? s.valNeg : ''}`} onClick={() => toggleDescritor(a, d, 'neg')}>✗</button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {habs.length > 0 && (<>
        <div className={s.sectionTitle} style={{ marginTop: 14 }}><ListChecks size={16} /> Habilidades</div>
        <div className={s.aeList}>
          {habs.map(a => (
            <button key={aKey(a)} className={`${s.aeItem} ${s.aeHead} ${sel(a) ? s.aeOn : ''}`} onClick={() => toggleAprend(a)}>
              <span className={s.aeCode}>{a.codigo}</span><span className={s.aeDesc}>{a.descricao}</span>
              {sel(a) ? <Check size={15} style={{ color: 'var(--primary)' }} /> : <Plus size={15} />}
            </button>
          ))}
        </div>
      </>)}
    </div>
  )
}

// ── Fases 3 (estratégias) genérica ──
function EscolhaStep({ titulo, itens, selected, onToggle, outro, setOutro }: {
  titulo: string; itens: { id: string; titulo: string; sub?: string }[]; selected: string[]; onToggle: (id: string) => void; outro: string; setOutro: (v: string) => void
}) {
  return (
    <div className={s.card}>
      <div className={s.sectionTitle}><Lightbulb size={16} /> {titulo} <span className={s.muted}>(opcional)</span></div>
      <div className={s.aeList}>
        {itens.map(i => (
          <button key={i.id} className={`${s.aeItem} ${s.aeHead} ${selected.includes(i.id) ? s.aeOn : ''}`} onClick={() => onToggle(i.id)}>
            <span className={s.aeDesc}><b>{i.titulo}</b>{i.sub ? ` — ${i.sub}` : ''}</span>
            {selected.includes(i.id) ? <Check size={15} style={{ color: 'var(--primary)' }} /> : <Plus size={15} />}
          </button>
        ))}
      </div>
      <p className={s.lbl}>Outro (texto livre)</p>
      <Input
        placeholder="Registrar outra estratégia…"
        value={outro}
        onChange={e => setOutro(e.target.value)}
        className={s.searchInput}
      />
    </div>
  )
}

// ── Fase 4 (diagnóstico = dificuldades + nível) ──
function DiagStep({ dificuldades, sel, setSel, outro, setOutro }: {
  dificuldades: RsCatalogos['dificuldades']; sel: DificuldadeSel[]; setSel: (v: DificuldadeSel[]) => void; outro: string; setOutro: (v: string) => void
}) {
  const isSel = (id: string) => sel.some(d => 'descritorId' in d && d.descritorId === id)
  const nivelOf = (id: string) => (sel.find(d => 'descritorId' in d && d.descritorId === id) as { nivel: Nivel } | undefined)?.nivel
  function toggle(id: string) { setSel(isSel(id) ? sel.filter(d => !('descritorId' in d && d.descritorId === id)) : [...sel, { descritorId: id, nivel: 'moderado' }]) }
  function setNivel(id: string, nivel: Nivel) { setSel(sel.map(d => 'descritorId' in d && d.descritorId === id ? { descritorId: id, nivel } : d)) }
  return (
    <div className={s.card}>
      <div className={s.sectionTitle}><Stethoscope size={16} /> Dificuldades observadas <span className={s.muted}>(opcional)</span></div>
      <div className={s.aeList}>
        {dificuldades.map(d => (
          <div key={d.id} className={`${s.aeItem} ${isSel(d.id) ? s.aeOn : ''}`}>
            <button className={s.aeHead} onClick={() => toggle(d.id)}>
              <span className={s.aeDesc}><b>{d.titulo}</b> — {d.descricaoCurta}</span>
              {isSel(d.id) ? <Check size={15} style={{ color: 'var(--primary)' }} /> : <Plus size={15} />}
            </button>
            {isSel(d.id) && (
              <div className={s.chips} style={{ padding: '0 12px 10px' }}>
                {NIVEIS.map(n => <button key={n} className={`${s.chip} ${nivelOf(d.id) === n ? s.chipOn : ''}`} onClick={() => setNivel(d.id, n)}>{NIVEL_LABEL[n]}</button>)}
              </div>
            )}
          </div>
        ))}
      </div>
      <p className={s.lbl}>Outra dificuldade (texto livre)</p>
      <Input
        placeholder="Registrar outra dificuldade…"
        value={outro}
        onChange={e => setOutro(e.target.value)}
        className={s.searchInput}
      />
    </div>
  )
}

// ── Desbloqueio da 4ª fase (coordenação) ──
function DesbloqueioPanel({ painel }: { painel: DesbloqueioPainel }) {
  const [unlocks, setUnlocks] = useState(painel.unlocks)
  const [pending, start] = useTransition()
  const on = (gradeId: number, b: number) => unlocks.some(u => u.gradeId === gradeId && u.bimestre === b)
  function toggle(gradeId: number, bimestre: number) {
    start(async () => {
      const r = await fetch('/api/rs/desbloqueio', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gradeId, bimestre }) })
      const res = await r.json().catch(() => ({}))
      if (r.ok) setUnlocks(prev => res.unlocked ? [...prev, { gradeId, bimestre }] : prev.filter(u => !(u.gradeId === gradeId && u.bimestre === bimestre)))
    })
  }
  return (
    <div className={s.card} style={{ marginBottom: 16 }}>
      <div className={s.sectionTitle}><Unlock size={16} /> Liberar 4ª fase (Recomposição) — por série e bimestre</div>
      <div className={s.desbGrid}>
        {painel.grades.map(g => (
          <div key={g.gradeId} className={s.desbRow}>
            <span className={s.desbLabel}>{g.label}</span>
            {ENABLED_BIMESTRES.map(b => (
              <button key={b} className={`${s.desbBtn} ${on(g.gradeId, b) ? s.desbOn : ''}`} onClick={() => toggle(g.gradeId, b)} disabled={pending}>
                {on(g.gradeId, b) ? <Unlock size={12} /> : <Lock size={12} />} {b}º
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
