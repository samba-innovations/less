'use client'

import { useState } from 'react'
import {
  ClipboardList, ArrowLeft, RefreshCw, Trash2, Download, Save, CheckCircle2,
  Sparkles, Plus, X, Users, FileText, Copy,
} from 'lucide-react'
import s from './diagnostico.module.css'
import { periodoLabel } from '@/lib/rs-shared'
import { PLANO_ACAO_CATALOGO, cicloLabel } from '@/lib/diagnostico-shared'
import type { DtTurma, DtCruzamento, DtPlanoAcaoItem, DtAcaoCatalogo } from '@/lib/diagnostico-shared'

type Feedback = { kind: 'ok' | 'err'; msg: string } | null

export function DiagnosticoTurmaClient({ turmas: turmasInit, canManage }: { turmas: DtTurma[]; canManage: boolean }) {
  const [turmas, setTurmas] = useState<DtTurma[]>(turmasInit)
  const [cx, setCx] = useState<DtCruzamento | null>(null)
  const [loading, setLoading] = useState(false)
  const [fb, setFb] = useState<Feedback>(null)
  const [diagnostico, setDiagnostico] = useState('')
  const [plano, setPlano] = useState<DtPlanoAcaoItem[]>([])
  const [docId, setDocId] = useState<number | null>(null)
  const [docStatus, setDocStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [geradoPorIA, setGeradoPorIA] = useState(false)
  const [catOpen, setCatOpen] = useState(false)
  const [iaOpen, setIaOpen] = useState(false)

  async function abrir(t: DtTurma) {
    setLoading(true); setFb(null)
    try {
      const r = await fetch(`/api/diagnostico-turma/cruzar?classId=${t.classId}`).then(x => x.json())
      if (r.error) { setFb({ kind: 'err', msg: r.error }); return }
      const c: DtCruzamento = r.cruzamento
      setCx(c); setDiagnostico(c.diagnostico ?? ''); setPlano(c.planoAcao ?? [])
      setDocId(c.diagnosticoId); setDocStatus(c.diagnosticoStatus); setGeradoPorIA(false)
    } finally { setLoading(false) }
  }
  function voltar() { setCx(null); setFb(null) }

  async function salvar(finalize: boolean) {
    if (!cx) return
    if (finalize && !diagnostico.trim()) { setFb({ kind: 'err', msg: 'Escreva o diagnóstico antes de finalizar.' }); return }
    setSaving(true); setFb(null)
    try {
      const r = await fetch('/api/diagnostico-turma', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: docId ?? undefined, classId: cx.classId, diagnostico, planoAcao: plano, finalize, geradoPorIA }),
      }).then(x => x.json())
      if (r.error) { setFb({ kind: 'err', msg: r.error }); return }
      setDocId(r.id); setDocStatus(r.status)
      setTurmas(prev => prev.map(t => t.classId === cx.classId ? { ...t, diagnosticoId: r.id, diagnosticoStatus: r.status } : t))
      setFb({ kind: 'ok', msg: finalize ? 'Diagnóstico finalizado.' : 'Rascunho salvo.' })
    } finally { setSaving(false) }
  }

  async function excluir() {
    if (!docId || !confirm('Excluir este diagnóstico?')) return
    const r = await fetch(`/api/diagnostico-turma?id=${docId}`, { method: 'DELETE' }).then(x => x.json())
    if (r.error) { setFb({ kind: 'err', msg: r.error }); return }
    setDocId(null); setDocStatus(null); setDiagnostico(''); setPlano([])
    if (cx) setTurmas(prev => prev.map(t => t.classId === cx.classId ? { ...t, diagnosticoId: null, diagnosticoStatus: null } : t))
    setFb({ kind: 'ok', msg: 'Diagnóstico excluído.' })
  }

  function addAcao(a: DtAcaoCatalogo) {
    setPlano(p => [...p, { titulo: a.titulo, descricao: a.descricao, prazo: a.prazoSugerido, meta: { foco: a.foco, evidencia: a.evidencia, publico: a.publico, nivelOrigem: a.nivelOrigem, nivelDestino: a.nivelDestino } }])
    setCatOpen(false)
  }
  function addCustom() { setPlano(p => [...p, { titulo: '', descricao: '' }]) }
  function updAcao(i: number, patch: Partial<DtPlanoAcaoItem>) { setPlano(p => p.map((x, k) => k === i ? { ...x, ...patch } : x)) }
  function delAcao(i: number) { setPlano(p => p.filter((_, k) => k !== i)) }

  // ── home ──
  if (!cx) {
    return (
      <>
        {fb && <div className={`${s.feedback} ${fb.kind === 'ok' ? s.ok : s.err}`} onClick={() => setFb(null)}>{fb.msg}</div>}
        {turmas.length === 0 ? (
          <div className={s.empty}><ClipboardList size={40} className={s.emptyIcon} /><p>Nenhuma turma elegível encontrada.</p><span className={s.muted}>Turmas aparecem quando há disciplinas atribuídas.</span></div>
        ) : (
          <div className={s.turmaGrid}>
            {turmas.map(t => {
              const pct = t.totalDisciplinas ? Math.round((t.entregues / t.totalDisciplinas) * 100) : 0
              return (
                <div key={t.classId} className={s.turmaCard}>
                  <div className={s.turmaTop}>
                    <div>
                      <div className={s.turmaName}>{t.gradeLabel} {t.className}</div>
                      <div className={s.turmaSub}>{cicloLabel(t.ciclo)}</div>
                    </div>
                    {t.diagnosticoId && <span className={t.diagnosticoStatus === 'FINAL' ? s.tagFinal : s.tagDraft}>{t.diagnosticoStatus === 'FINAL' ? 'finalizado' : 'rascunho'}</span>}
                  </div>
                  <div>
                    <div className={s.muted} style={{ marginBottom: 4 }}>{t.entregues} de {t.totalDisciplinas} relatórios ({pct}%)</div>
                    <div className={s.bar}><div className={`${s.barFill} ${pct === 100 ? s.barFull : ''}`} style={{ width: `${pct}%` }} /></div>
                  </div>
                  <button className={s.btnPrimary} onClick={() => abrir(t)} disabled={loading}>{loading ? 'Abrindo…' : 'Abrir cruzamento'}</button>
                </div>
              )
            })}
          </div>
        )}
      </>
    )
  }

  // ── turma view ──
  const con = cx.consolidado
  return (
    <>
      <div className={s.toolbar}>
        <button className={s.iconBtn} onClick={voltar} title="Voltar"><ArrowLeft size={16} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{cx.gradeLabel} {cx.className}</div>
          <div className={s.muted}>{cicloLabel(cx.ciclo)} · {cx.bimestres.length ? periodoLabel(cx.bimestres) : 'sem período'}</div>
        </div>
        <button className={s.iconBtn} onClick={() => abrir(turmas.find(t => t.classId === cx.classId)!)} title="Recruzar"><RefreshCw size={16} /></button>
      </div>

      {fb && <div className={`${s.feedback} ${fb.kind === 'ok' ? s.ok : s.err}`} onClick={() => setFb(null)}>{fb.msg}</div>}

      {/* completude */}
      <div className={s.card}>
        <div className={s.sectionTitle}><Users size={16} /> Completude dos relatórios</div>
        <div className={s.itemList}>
          {cx.completude.length === 0 && <span className={s.muted}>Nenhuma disciplina elegível.</span>}
          {cx.completude.map((c, i) => (
            <div key={i} className={s.compRow}>
              <span className={`${s.dot} ${c.status === 'ok' ? s.dotOk : s.dotPend}`} />
              <span className={s.compDisc}>{c.disciplinaLabel}</span>
              <span className={s.compProf}>{c.professor}</span>
            </div>
          ))}
        </div>
      </div>

      {/* consolidado */}
      <div className={s.card}>
        <div className={s.sectionTitle}><FileText size={16} /> Cruzamento pedagógico</div>
        {con.padroes.length > 0 && <>
          <div className={s.lbl}>Padrões transversais</div>
          <div className={s.chips}>{con.padroes.map((p, i) => <span key={i} className={s.padrao}><span className={s.padraoCount}>{p.count}</span> {p.categoria}</span>)}</div>
        </>}
        <div className={s.consGrid} style={{ marginTop: 12 }}>
          <div>
            <div className={s.lbl}>Forças ({con.fortes.length})</div>
            <div className={s.itemList}>
              {con.fortes.length === 0 && <span className={s.muted}>—</span>}
              {con.fortes.slice(0, 30).map((f, i) => <div key={i} className={s.item}><span className={s.itemPos}>✓</span><span>{f.descritor} <span className={s.itemDisc}>· {f.disciplina}</span></span></div>)}
            </div>
          </div>
          <div>
            <div className={s.lbl}>Fragilidades ({con.fracos.length})</div>
            <div className={s.itemList}>
              {con.fracos.length === 0 && <span className={s.muted}>—</span>}
              {con.fracos.slice(0, 30).map((f, i) => <div key={i} className={s.item}><span className={s.itemNeg}>✗</span><span>{f.descritor} <span className={s.itemDisc}>· {f.disciplina}</span></span></div>)}
            </div>
          </div>
        </div>
        {con.estrategias.length > 0 && <>
          <div className={s.lbl}>Estratégias que funcionaram</div>
          <div className={s.itemList}>{con.estrategias.map((e, i) => <div key={i} className={s.item}>• {e.titulo} <span className={s.itemDisc}>· {e.disciplina}</span></div>)}</div>
        </>}
        {cx.fontes.length > 0 && <>
          <div className={s.lbl}>Fontes ({cx.fontes.length} relatórios)</div>
          {cx.fontes.map((f, i) => (
            <a key={i} className={s.fonteRow} href={`/dashboard/relatorio-sintese?doc=${f.docId}`}>
              <span className={`${s.dot} ${f.status === 'FINAL' ? s.dotOk : s.dotPend}`} />
              <span className={s.compDisc}>{f.disciplinaLabel}</span>
              <span className={s.compProf}>{f.professor}</span>
            </a>
          ))}
        </>}
      </div>

      {!canManage ? (
        <div className={s.warn}>Você tem acesso de leitura. Apenas a coordenação pode redigir e fechar o diagnóstico.</div>
      ) : (
        <>
          {/* diagnóstico */}
          <div className={s.card}>
            <div className={s.sectionTitle}><ClipboardList size={16} /> Diagnóstico da coordenação</div>
            <div className={s.toolbar} style={{ marginBottom: 8 }}>
              <button className={s.btnGhost} onClick={() => setIaOpen(true)}><Sparkles size={15} /> Assistente (IA)</button>
              {geradoPorIA && <span className={s.muted}>· redigido com IA</span>}
            </div>
            <textarea className={s.textarea} value={diagnostico} onChange={e => { setDiagnostico(e.target.value); setGeradoPorIA(false) }} placeholder="Síntese diagnóstica da turma: padrões, forças, fragilidades e prioridades…" />
          </div>

          {/* plano de ação */}
          <div className={s.card}>
            <div className={s.sectionTitle}><CheckCircle2 size={16} /> Plano de ação</div>
            <div className={s.toolbar} style={{ marginBottom: 10 }}>
              <button className={s.btnGhost} onClick={() => setCatOpen(true)}><Plus size={15} /> Do catálogo</button>
              <button className={s.btnGhost} onClick={addCustom}><Plus size={15} /> Ação personalizada</button>
            </div>
            <div className={s.itemList} style={{ gap: 10 }}>
              {plano.length === 0 && <span className={s.muted}>Nenhuma ação adicionada.</span>}
              {plano.map((a, i) => (
                <div key={i} className={s.planoItem}>
                  <div className={s.planoHead}>
                    <input className={s.input} style={{ fontWeight: 700 }} value={a.titulo} onChange={e => updAcao(i, { titulo: e.target.value })} placeholder="Título da ação" />
                    <button className={s.iconBtnDanger} onClick={() => delAcao(i)} title="Remover"><Trash2 size={15} /></button>
                  </div>
                  {a.meta && <div className={s.metaChips}>{[a.meta.foco, a.meta.evidencia, a.meta.publico].filter(Boolean).map((m, k) => <span key={k} className={s.metaChip}>{m}</span>)}</div>}
                  <textarea className={s.textarea} style={{ minHeight: 70 }} value={a.descricao} onChange={e => updAcao(i, { descricao: e.target.value })} placeholder="Descrição / como executar" />
                  <div className={s.fieldRow}>
                    <input className={s.input} value={a.responsavel ?? ''} onChange={e => updAcao(i, { responsavel: e.target.value })} placeholder="Responsável" />
                    <input className={s.input} value={a.prazo ?? ''} onChange={e => updAcao(i, { prazo: e.target.value })} placeholder="Prazo" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ações */}
          <div className={s.toolbar}>
            <button className={s.btnPrimary} onClick={() => salvar(false)} disabled={saving}><Save size={15} /> {saving ? 'Salvando…' : 'Salvar rascunho'}</button>
            <button className={s.btnPrimary} onClick={() => salvar(true)} disabled={saving} style={{ background: '#059669' }}><CheckCircle2 size={15} /> Finalizar</button>
            {docId && <a className={s.btnGhost} href={`/api/diagnostico-turma/${docId}/docx`}><Download size={15} /> Word</a>}
            {docId && <button className={s.iconBtnDanger} onClick={excluir} title="Excluir"><Trash2 size={15} /></button>}
            {docStatus && <span className={docStatus === 'FINAL' ? s.tagFinal : s.tagDraft}>{docStatus === 'FINAL' ? 'finalizado' : 'rascunho'}</span>}
          </div>
        </>
      )}

      {catOpen && <CatalogoModal onClose={() => setCatOpen(false)} onPick={addAcao} />}
      {iaOpen && <IaModal classId={cx.classId} onClose={() => setIaOpen(false)} onApply={(d, p) => { setDiagnostico(d); setPlano(prev => [...prev, ...p]); setGeradoPorIA(true); setIaOpen(false); setFb({ kind: 'ok', msg: 'Resposta da IA aplicada. Revise antes de salvar.' }) }} />}
    </>
  )
}

function CatalogoModal({ onClose, onPick }: { onClose: () => void; onPick: (a: DtAcaoCatalogo) => void }) {
  const [q, setQ] = useState('')
  const list = PLANO_ACAO_CATALOGO.filter(a => (a.titulo + a.foco + a.descricao).toLowerCase().includes(q.toLowerCase()))
  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>
        <div className={s.modalHead}>
          <span className={s.modalTitle}>Catálogo de ações pedagógicas</span>
          <button className={s.iconBtn} onClick={onClose}><X size={16} /></button>
        </div>
        <input className={s.input} style={{ marginBottom: 12 }} value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar ação…" />
        <div className={s.catGrid}>
          {list.map(a => (
            <button key={a.id} className={s.catCard} onClick={() => onPick(a)}>
              <div className={s.catTitle}>{a.titulo}</div>
              <div className={s.metaChips}><span className={s.metaChip}>{a.foco}</span><span className={s.metaChip}>{a.evidencia}</span><span className={s.metaChip}>{a.publico}</span></div>
              <div className={s.catDesc}>{a.descricao}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function IaModal({ classId, onClose, onApply }: { classId: number; onClose: () => void; onApply: (diag: string, plano: DtPlanoAcaoItem[]) => void }) {
  const [prompt, setPrompt] = useState('')
  const [resp, setResp] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)

  async function gerarPrompt() {
    setBusy(true); setErr('')
    try {
      const r = await fetch('/api/diagnostico-turma/ia', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'montar', classId }) }).then(x => x.json())
      if (r.error) { setErr(r.error); return }
      setPrompt(r.prompt)
    } finally { setBusy(false) }
  }
  async function aplicar() {
    setBusy(true); setErr('')
    try {
      const r = await fetch('/api/diagnostico-turma/ia', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'aplicar', texto: resp }) }).then(x => x.json())
      if (r.error) { setErr(r.error); return }
      onApply(r.diagnostico ?? '', r.planoAcao ?? [])
    } finally { setBusy(false) }
  }
  function copiar() { navigator.clipboard?.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 1500) }

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>
        <div className={s.modalHead}>
          <span className={s.modalTitle}><Sparkles size={16} style={{ verticalAlign: -3 }} /> Assistente de diagnóstico</span>
          <button className={s.iconBtn} onClick={onClose}><X size={16} /></button>
        </div>
        <p className={s.muted}>1) Gere o pedido com os dados da turma. 2) Cole no Copilot/ChatGPT. 3) Cole aqui a resposta (JSON) para aplicar.</p>
        {err && <div className={`${s.feedback} ${s.err}`} style={{ marginTop: 10 }}>{err}</div>}
        {!prompt ? (
          <button className={s.btnPrimary} style={{ marginTop: 12 }} onClick={gerarPrompt} disabled={busy}>{busy ? 'Gerando…' : 'Gerar pedido'}</button>
        ) : (
          <>
            <div className={s.lbl}>Pedido (copie para a IA)</div>
            <textarea className={s.textarea} style={{ minHeight: 120 }} readOnly value={prompt} />
            <button className={s.btnGhost} style={{ marginTop: 8 }} onClick={copiar}><Copy size={15} /> {copied ? 'Copiado!' : 'Copiar pedido'}</button>
            <div className={s.lbl}>Resposta da IA (cole o JSON)</div>
            <textarea className={s.textarea} style={{ minHeight: 120 }} value={resp} onChange={e => setResp(e.target.value)} placeholder='{"diagnostico":"…","planoAcao":[…]}' />
            <button className={s.btnPrimary} style={{ marginTop: 10 }} onClick={aplicar} disabled={busy || !resp.trim()}>{busy ? 'Aplicando…' : 'Aplicar resposta'}</button>
          </>
        )}
      </div>
    </div>
  )
}
