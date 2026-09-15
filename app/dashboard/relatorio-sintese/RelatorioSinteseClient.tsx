'use client'

import { Fragment, useMemo, useState, useTransition } from 'react'
import {
  ArrowLeft, ArrowRight, Plus, Check, Loader2, Trash2, Download, FileBarChart2,
  Fingerprint, ListChecks, Lightbulb, Stethoscope, BookMarked, CheckCircle2, Users, Unlock, Lock, Pencil,
} from 'lucide-react'
import {
  ENABLED_BIMESTRES, NIVEIS, NIVEL_LABEL, REFERENCIAS_PADRAO, periodoLabel,
  type RsContext, type RsDisciplina, type RsAprendizagem, type RsCatalogos,
  type Nivel, type DificuldadeSel, type EstrategiaSel, type CoordProfessor, type DesbloqueioPainel,
} from '@/lib/rs-shared'
import s from './rs.module.css'
import w from '../_components/wizard.module.css'
import { PageHeader } from '../_components/PageHeader'
import { Tabs } from '../_components/Tabs'
import { IconButton } from '../_components/IconButton'
import { Button } from '../_components/Button'
import { Input } from '../_components/Input'
import { Badge } from '../_components/Badge'
import { RelativeDate } from '../_components/RelativeDate'
import { SkeletonText } from '../_components/Skeleton'
import { formatName } from '@/lib/format-name'

type Meu     = { id: number; title: string; status: string; updatedAt: string; content: any } // eslint-disable-line @typescript-eslint/no-explicit-any
type Mode    = 'home' | 'wizard'
type HomeTab = 'meus' | 'coord'

const STEPS = [
  { key: 'ident',  label: 'identificação', icon: Fingerprint },
  { key: 'apont',  label: 'apontamento',   icon: ListChecks },
  { key: 'estrat', label: 'estratégias',   icon: Lightbulb },
  { key: 'diag',   label: 'diagnóstico',   icon: Stethoscope },
  { key: 'refs',   label: 'referências',   icon: BookMarked },
  { key: 'fim',    label: 'finalizar',     icon: CheckCircle2 },
] as const

const ANO = new Date().getFullYear()
const aKey = (a: RsAprendizagem) => `${a.tipo}|${a.codigo}|${a.descricao}`

export function RelatorioSinteseClient({ ctx, catalogos, meus, professores, desbloqueio, canProduce, canView, canManage }: {
  ctx: RsContext | null; catalogos: RsCatalogos | null; meus: Meu[]
  professores: CoordProfessor[] | null; desbloqueio: DesbloqueioPainel | null
  canProduce: boolean; canView: boolean; canManage: boolean
}) {
  const [mode, setMode]           = useState<Mode>('home')
  const [homeTab, setHomeTab]     = useState<HomeTab>('meus')
  const [relatorios, setRelatorios] = useState<Meu[]>(meus)
  const [banner, setBanner]       = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [pending, start]          = useTransition()

  // ── estado do wizard ──
  const [draftId, setDraftId]         = useState<number | null>(null)
  const [step, setStep]               = useState(0)
  const [disc, setDisc]               = useState<RsDisciplina | null>(null)
  const [gradeId, setGradeId]         = useState<number | null>(null)
  const [classIds, setClassIds]       = useState<number[]>([])
  const [bimestres, setBimestres]     = useState<number[]>([])
  const [aprend, setAprend]           = useState<RsAprendizagem[]>([])
  const [aesDisp, setAesDisp]         = useState<RsAprendizagem[]>([])
  const [habsDisp, setHabsDisp]       = useState<RsAprendizagem[]>([])
  const [dificuldades, setDificuldades] = useState<DificuldadeSel[]>([])
  const [difOutro, setDifOutro]       = useState('')
  const [estrategias, setEstrategias] = useState<EstrategiaSel[]>([])
  const [estrOutro, setEstrOutro]     = useState('')
  const [referencias, setReferencias] = useState(REFERENCIAS_PADRAO)
  const [loadingAE, setLoadingAE]     = useState(false)

  const grade = disc?.grades.find(g => g.gradeId === gradeId) ?? null

  function reset() {
    setDraftId(null); setStep(0); setDisc(null); setGradeId(null); setClassIds([]); setBimestres([])
    setAprend([]); setAesDisp([]); setHabsDisp([]); setDificuldades([]); setDifOutro('')
    setEstrategias([]); setEstrOutro(''); setReferencias(REFERENCIAS_PADRAO)
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
    if (!r.ok) { setBanner({ kind: 'err', text: (await r.json().catch(() => ({}))).error ?? 'falha ao carregar aprendizagens.' }); return }
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
    const estr: EstrategiaSel[]  = [...estrategias, ...(estrOutro.trim() ? [{ outro: estrOutro.trim() }] : [])]
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
      if (!r.ok || res.error) { setBanner({ kind: 'err', text: res.error ?? 'erro ao salvar.' }); return }
      if (res.id) setDraftId(res.id)
      const entry: Meu = { id: res.id, title: res.title ?? 'Relatório-Síntese', status: res.status ?? (finalize ? 'FINAL' : 'DRAFT'), updatedAt: new Date().toISOString(), content: buildContent() }
      setRelatorios(prev => { const i = prev.findIndex(x => x.id === res.id); if (i < 0) return [entry, ...prev]; const n = [...prev]; n[i] = entry; return n })
      setBanner({ kind: 'ok', text: finalize ? 'relatório finalizado.' : 'rascunho salvo.' })
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

  const banEl = banner && (
    <div className={`${s.feedback} ${banner.kind === 'ok' ? s.ok : s.err}`} onClick={() => setBanner(null)}>
      {banner.text}
    </div>
  )

  // ════════════════ HOME (Tabs meus / coord) ════════════════
  if (mode === 'home') {
    const tabsShowCoord = canView
    return (
      <div className={s.page}>
        <PageHeader
          title="relatório-síntese"
          subtitle="produção do relatório-síntese bimestral"
          action={canProduce ? (
            <Button variant="primary" iconLeft={<Plus size={14} />} onClick={novo}>novo relatório</Button>
          ) : undefined}
        />

        {banEl}

        {tabsShowCoord && (
          <Tabs<HomeTab>
            active={homeTab}
            onChange={setHomeTab}
            items={[
              { key: 'meus',  label: 'meus relatórios', icon: <FileBarChart2 size={13} />, count: relatorios.length },
              { key: 'coord', label: 'coordenação',     icon: <Users size={13} /> },
            ]}
          />
        )}

        {(!tabsShowCoord || homeTab === 'meus') && (
          relatorios.length === 0 ? (
            <div className={s.empty}>
              <FileBarChart2 size={36} strokeWidth={1.2} />
              <p>nenhum relatório-síntese criado ainda.</p>
            </div>
          ) : (
            <div className={s.list}>
              {relatorios.map(m => {
                const isFinal = m.status === 'FINAL' || m.status === 'final'
                return (
                  <div key={m.id} className={s.card}>
                    <span className={s.accent} style={{ background: isFinal ? 'var(--success)' : 'var(--warning)' }} aria-hidden />
                    <span className={s.cardIcon}><FileBarChart2 size={14} /></span>
                    <div className={s.cardInfo}>
                      <span className={s.cardTitle}>{m.title}</span>
                      <span className={s.cardMeta}>
                        {m.content?.classNames?.join(', ') || '—'} · {periodoLabel(m.content?.bimestres ?? [])}
                        {' · '}<RelativeDate date={m.updatedAt} />
                      </span>
                    </div>
                    <div className={s.cardActions}>
                      <Badge tone={isFinal ? 'success' : 'amber'} withDot>{isFinal ? 'final' : 'rascunho'}</Badge>
                      <a className={s.iconLink} href={`/api/rs/relatorios/${m.id}/docx`} title="baixar DOCX">
                        <Download size={14} />
                      </a>
                      {canProduce && <IconButton icon={<Pencil size={14} />}  label="editar"  onClick={() => editar(m)} />}
                      {canProduce && <IconButton icon={<Trash2 size={14} />}  label="excluir" variant="danger" onClick={() => excluir(m.id)} />}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}

        {tabsShowCoord && homeTab === 'coord' && (
          <>
            {canManage && desbloqueio && <DesbloqueioPanel painel={desbloqueio} />}

            <div className={s.sectionHead}>
              <span className={s.sectionLabel}>professores e relatórios</span>
            </div>
            <div className={s.list}>
              {(professores ?? []).map(p => (
                <div key={p.id} className={s.coordCard}>
                  <div className={s.coordHead}>
                    <span className={s.coordName}>{formatName(p.name)}</span>
                    {!p.temDisciplinaElegivel && <Badge tone="neutral">sem disciplina elegível</Badge>}
                    <span className={s.coordCount}>{p.relatorios.length} relatório{p.relatorios.length !== 1 ? 's' : ''}</span>
                  </div>
                  {p.relatorios.length > 0 && (
                    <div className={s.relList}>
                      {p.relatorios.map(r => {
                        const isFinal = r.status === 'FINAL' || r.status === 'final'
                        return (
                          <a key={r.id} href={`/api/rs/relatorios/${r.id}/docx`} className={s.relRow}>
                            <span className={s.relDot} style={{ background: isFinal ? 'var(--success)' : 'var(--warning)' }} />
                            <span className={s.relLabel}>
                              {r.disciplinaLabel} · {r.serie}ª{r.bimestre ? ` · ${r.bimestre}º bim` : ''}
                            </span>
                            <Download size={13} className={s.relDl} />
                          </a>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
              {(!professores || professores.length === 0) && (
                <div className={s.empty}>
                  <Users size={36} strokeWidth={1.2} />
                  <p>nenhum professor com disciplinas elegíveis.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  // ════════════════ WIZARD ════════════════
  const stepKey = STEPS[step].key
  return (
    <div className={s.page}>
      <PageHeader
        title={draftId ? 'editar relatório-síntese' : 'novo relatório-síntese'}
        subtitle={`passo ${step + 1} de ${STEPS.length} · ${STEPS[step].label}`}
      />

      {banEl}

      {/* Stepper — padrão wizard v4 */}
      <div className={w.stepper} aria-label="progresso do relatório">
        {STEPS.map((st, i) => {
          const done   = i < step
          const active = i === step
          return (
            <Fragment key={st.key}>
              <button
                type="button"
                className={`${s.stepBtn} ${w.stepperItem} ${active ? w.stepperItemActive : ''} ${done ? w.stepperItemDone : ''}`}
                onClick={() => { if (i <= step) setStep(i) }}
                disabled={i > step}
              >
                <span className={w.stepperDot}>{done ? <Check size={11} /> : i + 1}</span>
                <span className={s.stepLabel}>{st.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <span className={`${w.stepperLine} ${done ? w.stepperLineDone : ''}`} />
              )}
            </Fragment>
          )
        })}
      </div>

      <div className={w.content}>
        {stepKey === 'ident'  && (
          <IdentStep
            ctx={ctx} disc={disc}
            setDisc={d => { setDisc(d); setGradeId(null); setClassIds([]) }}
            gradeId={gradeId} setGradeId={g => { setGradeId(g); setClassIds([]) }}
            classIds={classIds} setClassIds={setClassIds}
            bimestres={bimestres} setBimestres={setBimestres}
          />
        )}
        {stepKey === 'apont'  && (
          <ApontStep
            loading={loadingAE} aes={aesDisp} habs={habsDisp} aprend={aprend}
            onLoad={() => disc && gradeId && carregarAprend(disc.disciplineId, gradeId, bimestres)}
            toggleAprend={toggleAprend} toggleDescritor={toggleDescritor} valenciaOk={valenciaOk}
          />
        )}
        {stepKey === 'estrat' && catalogos && (
          <EscolhaStep
            icon={<Lightbulb size={14} />}
            titulo="estratégias que funcionaram"
            itens={catalogos.intervencoes.map(i => ({ id: i.id, titulo: i.titulo, sub: i.objetivo }))}
            selected={estrategias.filter(e => 'intervencaoId' in e).map(e => (e as { intervencaoId: string }).intervencaoId)}
            onToggle={id => setEstrategias(p => p.some(e => 'intervencaoId' in e && e.intervencaoId === id)
              ? p.filter(e => !('intervencaoId' in e && e.intervencaoId === id))
              : [...p, { intervencaoId: id }])}
            outro={estrOutro} setOutro={setEstrOutro}
          />
        )}
        {stepKey === 'diag'   && catalogos && (
          <DiagStep dificuldades={catalogos.dificuldades} sel={dificuldades} setSel={setDificuldades} outro={difOutro} setOutro={setDifOutro} />
        )}
        {stepKey === 'refs'   && (
          <div className={s.stepCard}>
            <div className={w.formSectionTitle}><BookMarked size={14} /> referências (ABNT)</div>
            <textarea className={s.textarea} value={referencias} onChange={e => setReferencias(e.target.value)} rows={14} />
          </div>
        )}
        {stepKey === 'fim'    && (
          <div className={s.stepCard}>
            <div className={w.formSectionTitle}><CheckCircle2 size={14} /> revisar e finalizar</div>
            <ul className={s.review}>
              <li><strong>disciplina:</strong> {disc?.name} · {grade?.gradeLabel}</li>
              <li><strong>turmas:</strong> {grade?.turmas.filter(t => classIds.includes(t.classId)).map(t => t.name).join(', ') || '—'}</li>
              <li><strong>período:</strong> {periodoLabel(bimestres)}</li>
              <li><strong>aprendizagens:</strong> {aprend.length}</li>
              <li><strong>dificuldades:</strong> {dificuldades.length + (difOutro.trim() ? 1 : 0)} · <strong>estratégias:</strong> {estrategias.length + (estrOutro.trim() ? 1 : 0)}</li>
            </ul>
            {!fase2Ok && (
              <p className={s.warn}>
                complete a identificação e o apontamento (2 descritores ✓ e 2 ✗ quando houver) para finalizar.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer canônico */}
      <div className={w.footer}>
        <button
          type="button"
          className={w.back}
          onClick={() => step === 0 ? setMode('home') : setStep(step - 1)}
        >
          <ArrowLeft size={14} />
          {step === 0 ? 'sair' : 'voltar'}
        </button>
        <div className={w.footerSpacer} />
        <div className={w.footerActions}>
          <Button variant="ghost" onClick={() => salvar(false)} disabled={pending || !fase1Ok}>
            salvar rascunho
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              variant="primary"
              iconRight={<ArrowRight size={13} />}
              disabled={(stepKey === 'ident' && !fase1Ok) || (stepKey === 'apont' && !fase2Ok)}
              onClick={() => {
                if (stepKey === 'ident') carregarAprend(disc!.disciplineId, gradeId!, bimestres)
                setStep(step + 1)
              }}
            >avançar</Button>
          ) : (
            <Button
              variant="primary"
              iconLeft={pending ? <Loader2 size={13} className={s.spin} /> : <CheckCircle2 size={13} />}
              onClick={() => salvar(true)}
              disabled={pending || !fase2Ok}
            >finalizar</Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Fase 1: identificação ──
function IdentStep({ ctx, disc, setDisc, gradeId, setGradeId, classIds, setClassIds, bimestres, setBimestres }: {
  ctx: RsContext | null; disc: RsDisciplina | null; setDisc: (d: RsDisciplina | null) => void
  gradeId: number | null; setGradeId: (g: number | null) => void
  classIds: number[]; setClassIds: (v: number[]) => void; bimestres: number[]; setBimestres: (v: number[]) => void
}) {
  const grade = disc?.grades.find(g => g.gradeId === gradeId) ?? null
  return (
    <div className={s.stepCard}>
      <div className={w.formSectionTitle}><Fingerprint size={14} /> identificação</div>

      <ChipGroup
        label="disciplina"
        empty={!ctx || ctx.disciplinas.length === 0
          ? 'nenhuma disciplina elegível atribuída a você.'
          : undefined}
        options={(ctx?.disciplinas ?? []).map(d => ({
          key: String(d.disciplineId),
          label: d.name,
          active: disc?.disciplineId === d.disciplineId,
          onClick: () => setDisc(d),
        }))}
      />

      {disc && (
        <ChipGroup
          label="série"
          options={disc.grades.map(g => ({
            key: String(g.gradeId), label: g.gradeLabel,
            active: gradeId === g.gradeId,
            onClick: () => setGradeId(g.gradeId),
          }))}
        />
      )}

      {grade && (
        <>
          <ChipGroup
            label="turmas"
            options={grade.turmas.map(tu => ({
              key: String(tu.classId), label: tu.name,
              active: classIds.includes(tu.classId),
              onClick: () => setClassIds(classIds.includes(tu.classId)
                ? classIds.filter(x => x !== tu.classId)
                : [...classIds, tu.classId]),
            }))}
          />
          <ChipGroup
            label="bimestre(s)"
            options={ENABLED_BIMESTRES.map(b => ({
              key: String(b), label: `${b}º bimestre`,
              active: bimestres.includes(b),
              onClick: () => setBimestres(bimestres.includes(b)
                ? bimestres.filter(x => x !== b)
                : [...bimestres, b].sort()),
            }))}
          />
        </>
      )}
    </div>
  )
}

function ChipGroup({ label, options, empty }: {
  label: string
  options: { key: string; label: string; active: boolean; onClick: () => void }[]
  empty?: string
}) {
  return (
    <div className={s.chipGroup}>
      <span className={s.chipGroupLabel}>{label}</span>
      <div className={s.chips}>
        {options.map(o => (
          <button
            key={o.key}
            type="button"
            className={`${s.chip} ${o.active ? s.chipOn : ''}`}
            onClick={o.onClick}
          >{o.label}</button>
        ))}
        {empty && <span className={s.muted}>{empty}</span>}
      </div>
    </div>
  )
}

// ── Fase 2: apontamento ──
function ApontStep({ loading, aes, habs, aprend, onLoad, toggleAprend, toggleDescritor, valenciaOk }: {
  loading: boolean; aes: RsAprendizagem[]; habs: RsAprendizagem[]; aprend: RsAprendizagem[]
  onLoad: () => void; toggleAprend: (a: RsAprendizagem) => void
  toggleDescritor: (a: RsAprendizagem, d: string, v: 'pos' | 'neg') => void; valenciaOk: boolean
}) {
  const sel = (a: RsAprendizagem) => aprend.find(x => aKey(x) === aKey(a))
  if (loading) return <div className={s.stepCard}><SkeletonText lines={4} /></div>
  if (aes.length === 0 && habs.length === 0) return (
    <div className={s.stepCard}>
      <p className={s.muted}>nenhuma aprendizagem para o filtro.</p>
      <Button variant="secondary" onClick={onLoad}>recarregar</Button>
    </div>
  )
  return (
    <div className={s.stepCard}>
      <div className={w.formSectionTitle}><ListChecks size={14} /> aprendizagens essenciais</div>
      {!valenciaOk && (
        <p className={s.warn}>classifique 2 descritores de melhor (✓) e 2 de pior (✗) desempenho.</p>
      )}
      <div className={s.aeList}>
        {aes.map(a => {
          const chosen = sel(a)
          return (
            <div key={aKey(a)} className={`${s.aeItem} ${chosen ? s.aeOn : ''}`}>
              <button type="button" className={s.aeHead} onClick={() => toggleAprend(a)}>
                <span className={s.aeCode}>{a.codigo}</span>
                <span className={s.aeDesc}>{a.descricao}</span>
                {chosen ? <Check size={14} className={s.aeCheck} /> : <Plus size={14} />}
              </button>
              {chosen && (a.descritores?.length ?? 0) > 0 && (
                <div className={s.descrs}>
                  {a.descritores!.map(d => {
                    const isPos = chosen.descritoresPos?.includes(d)
                    const isNeg = chosen.descritoresNeg?.includes(d)
                    return (
                      <div key={d} className={s.descrRow}>
                        <span className={s.descrTxt}>{d}</span>
                        <button
                          type="button"
                          className={`${s.valBtn} ${isPos ? s.valPos : ''}`}
                          onClick={() => toggleDescritor(a, d, 'pos')}
                        >✓</button>
                        <button
                          type="button"
                          className={`${s.valBtn} ${isNeg ? s.valNeg : ''}`}
                          onClick={() => toggleDescritor(a, d, 'neg')}
                        >✗</button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {habs.length > 0 && (
        <>
          <div className={w.formSectionTitle} style={{ marginTop: '0.75rem' }}>
            <ListChecks size={14} /> habilidades
          </div>
          <div className={s.aeList}>
            {habs.map(a => (
              <button
                key={aKey(a)}
                type="button"
                className={`${s.aeItem} ${s.aeHead} ${sel(a) ? s.aeOn : ''}`}
                onClick={() => toggleAprend(a)}
              >
                <span className={s.aeCode}>{a.codigo}</span>
                <span className={s.aeDesc}>{a.descricao}</span>
                {sel(a) ? <Check size={14} className={s.aeCheck} /> : <Plus size={14} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Fase 3: escolha genérica (estratégias) ──
function EscolhaStep({ icon, titulo, itens, selected, onToggle, outro, setOutro }: {
  icon: React.ReactNode
  titulo: string
  itens: { id: string; titulo: string; sub?: string }[]
  selected: string[]
  onToggle: (id: string) => void
  outro: string
  setOutro: (v: string) => void
}) {
  return (
    <div className={s.stepCard}>
      <div className={w.formSectionTitle}>{icon} {titulo} <span className={s.optional}>(opcional)</span></div>
      <div className={s.aeList}>
        {itens.map(i => (
          <button
            key={i.id}
            type="button"
            className={`${s.aeItem} ${s.aeHead} ${selected.includes(i.id) ? s.aeOn : ''}`}
            onClick={() => onToggle(i.id)}
          >
            <span className={s.aeDesc}><strong>{i.titulo}</strong>{i.sub ? ` — ${i.sub}` : ''}</span>
            {selected.includes(i.id) ? <Check size={14} className={s.aeCheck} /> : <Plus size={14} />}
          </button>
        ))}
      </div>
      <div className={s.chipGroup}>
        <span className={s.chipGroupLabel}>outro (texto livre)</span>
        <Input placeholder="registrar outra estratégia…" value={outro} onChange={e => setOutro(e.target.value)} />
      </div>
    </div>
  )
}

// ── Fase 4: diagnóstico ──
function DiagStep({ dificuldades, sel, setSel, outro, setOutro }: {
  dificuldades: RsCatalogos['dificuldades']; sel: DificuldadeSel[]; setSel: (v: DificuldadeSel[]) => void
  outro: string; setOutro: (v: string) => void
}) {
  const isSel   = (id: string) => sel.some(d => 'descritorId' in d && d.descritorId === id)
  const nivelOf = (id: string) => (sel.find(d => 'descritorId' in d && d.descritorId === id) as { nivel: Nivel } | undefined)?.nivel
  function toggle(id: string) { setSel(isSel(id) ? sel.filter(d => !('descritorId' in d && d.descritorId === id)) : [...sel, { descritorId: id, nivel: 'moderado' }]) }
  function setNivel(id: string, nivel: Nivel) { setSel(sel.map(d => 'descritorId' in d && d.descritorId === id ? { descritorId: id, nivel } : d)) }
  return (
    <div className={s.stepCard}>
      <div className={w.formSectionTitle}>
        <Stethoscope size={14} /> dificuldades observadas <span className={s.optional}>(opcional)</span>
      </div>
      <div className={s.aeList}>
        {dificuldades.map(d => (
          <div key={d.id} className={`${s.aeItem} ${isSel(d.id) ? s.aeOn : ''}`}>
            <button type="button" className={s.aeHead} onClick={() => toggle(d.id)}>
              <span className={s.aeDesc}><strong>{d.titulo}</strong> — {d.descricaoCurta}</span>
              {isSel(d.id) ? <Check size={14} className={s.aeCheck} /> : <Plus size={14} />}
            </button>
            {isSel(d.id) && (
              <div className={s.nivelChips}>
                {NIVEIS.map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`${s.chip} ${nivelOf(d.id) === n ? s.chipOn : ''}`}
                    onClick={() => setNivel(d.id, n)}
                  >{NIVEL_LABEL[n]}</button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className={s.chipGroup}>
        <span className={s.chipGroupLabel}>outra dificuldade (texto livre)</span>
        <Input placeholder="registrar outra dificuldade…" value={outro} onChange={e => setOutro(e.target.value)} />
      </div>
    </div>
  )
}

// ── Desbloqueio da 4ª fase (coordenação) ──
function DesbloqueioPanel({ painel }: { painel: DesbloqueioPainel }) {
  const [unlocks, setUnlocks] = useState(painel.unlocks)
  const [pending, start]      = useTransition()
  const on = (gradeId: number, b: number) => unlocks.some(u => u.gradeId === gradeId && u.bimestre === b)
  function toggle(gradeId: number, bimestre: number) {
    start(async () => {
      const r = await fetch('/api/rs/desbloqueio', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gradeId, bimestre }) })
      const res = await r.json().catch(() => ({}))
      if (r.ok) setUnlocks(prev => res.unlocked ? [...prev, { gradeId, bimestre }] : prev.filter(u => !(u.gradeId === gradeId && u.bimestre === bimestre)))
    })
  }
  return (
    <div className={s.desbCard}>
      <div className={w.formSectionTitle}>
        <Unlock size={14} /> liberar 4ª fase (recomposição) — por série e bimestre
      </div>
      <div className={s.desbGrid}>
        {painel.grades.map(g => (
          <div key={g.gradeId} className={s.desbRow}>
            <span className={s.desbLabel}>{g.label}</span>
            {ENABLED_BIMESTRES.map(b => (
              <button
                key={b}
                type="button"
                className={`${s.desbBtn} ${on(g.gradeId, b) ? s.desbOn : ''}`}
                onClick={() => toggle(g.gradeId, b)}
                disabled={pending}
              >
                {on(g.gradeId, b) ? <Unlock size={11} /> : <Lock size={11} />} {b}º
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
