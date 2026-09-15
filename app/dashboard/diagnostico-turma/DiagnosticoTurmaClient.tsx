'use client'

import { useState } from 'react'
import {
  ClipboardList, ArrowLeft, RefreshCw, Trash2, Download, Save, CheckCircle2,
  Sparkles, Plus, Users, FileText, Copy,
} from 'lucide-react'
import s from './diagnostico.module.css'
import { periodoLabel } from '@/lib/rs-shared'
import { PLANO_ACAO_CATALOGO, cicloLabel } from '@/lib/diagnostico-shared'
import type { DtTurma, DtCruzamento, DtPlanoAcaoItem, DtAcaoCatalogo } from '@/lib/diagnostico-shared'
import { PageHeader } from '../_components/PageHeader'
import { IconButton } from '../_components/IconButton'
import { Button } from '../_components/Button'
import { Input } from '../_components/Input'
import { Badge } from '../_components/Badge'
import { Modal } from '../_components/Modal'
import { ConfirmDialog } from '../_components/ConfirmDialog'
import { ProgressBar } from '../_components/ProgressBar'

type Feedback = { kind: 'ok' | 'err'; msg: string } | null

export function DiagnosticoTurmaClient({ turmas: turmasInit, canManage }: { turmas: DtTurma[]; canManage: boolean }) {
  const [turmas, setTurmas]   = useState<DtTurma[]>(turmasInit)
  const [cx, setCx]           = useState<DtCruzamento | null>(null)
  const [loading, setLoading] = useState(false)
  const [fb, setFb]           = useState<Feedback>(null)
  const [diagnostico, setDiagnostico] = useState('')
  const [plano, setPlano]     = useState<DtPlanoAcaoItem[]>([])
  const [docId, setDocId]     = useState<number | null>(null)
  const [docStatus, setDocStatus] = useState<string | null>(null)
  const [saving, setSaving]   = useState(false)
  const [geradoPorIA, setGeradoPorIA] = useState(false)
  const [catOpen, setCatOpen] = useState(false)
  const [iaOpen, setIaOpen]   = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

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
    if (finalize && !diagnostico.trim()) { setFb({ kind: 'err', msg: 'escreva o diagnóstico antes de finalizar.' }); return }
    setSaving(true); setFb(null)
    try {
      const r = await fetch('/api/diagnostico-turma', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: docId ?? undefined, classId: cx.classId, diagnostico, planoAcao: plano, finalize, geradoPorIA }),
      }).then(x => x.json())
      if (r.error) { setFb({ kind: 'err', msg: r.error }); return }
      setDocId(r.id); setDocStatus(r.status)
      setTurmas(prev => prev.map(t => t.classId === cx.classId ? { ...t, diagnosticoId: r.id, diagnosticoStatus: r.status } : t))
      setFb({ kind: 'ok', msg: finalize ? 'diagnóstico finalizado.' : 'rascunho salvo.' })
    } finally { setSaving(false) }
  }

  async function excluir() {
    if (!docId) return
    const r = await fetch(`/api/diagnostico-turma?id=${docId}`, { method: 'DELETE' }).then(x => x.json())
    setConfirmDelete(false)
    if (r.error) { setFb({ kind: 'err', msg: r.error }); return }
    setDocId(null); setDocStatus(null); setDiagnostico(''); setPlano([])
    if (cx) setTurmas(prev => prev.map(t => t.classId === cx.classId ? { ...t, diagnosticoId: null, diagnosticoStatus: null } : t))
    setFb({ kind: 'ok', msg: 'diagnóstico excluído.' })
  }

  function addAcao(a: DtAcaoCatalogo) {
    setPlano(p => [...p, { titulo: a.titulo, descricao: a.descricao, prazo: a.prazoSugerido, meta: { foco: a.foco, evidencia: a.evidencia, publico: a.publico, nivelOrigem: a.nivelOrigem, nivelDestino: a.nivelDestino } }])
    setCatOpen(false)
  }
  function addCustom() { setPlano(p => [...p, { titulo: '', descricao: '' }]) }
  function updAcao(i: number, patch: Partial<DtPlanoAcaoItem>) { setPlano(p => p.map((x, k) => k === i ? { ...x, ...patch } : x)) }
  function delAcao(i: number) { setPlano(p => p.filter((_, k) => k !== i)) }

  const fbEl = fb && (
    <div className={`${s.feedback} ${fb.kind === 'ok' ? s.ok : s.err}`} onClick={() => setFb(null)}>{fb.msg}</div>
  )

  // ════════════ LISTA DE TURMAS ════════════
  if (!cx) {
    return (
      <div className={s.page}>
        <PageHeader
          title="diagnóstico de turma"
          subtitle="cruzamento dos relatórios-síntese por turma"
        />
        {fbEl}

        {turmas.length === 0 ? (
          <div className={s.empty}>
            <ClipboardList size={36} strokeWidth={1.2} />
            <p>nenhuma turma elegível encontrada. turmas aparecem quando há disciplinas atribuídas.</p>
          </div>
        ) : (
          <div className={s.list}>
            {turmas.map(t => {
              const pct = t.totalDisciplinas ? Math.round((t.entregues / t.totalDisciplinas) * 100) : 0
              return (
                <div key={t.classId} className={s.turmaRow}>
                  <span className={s.turmaTag}>{t.gradeLabel}</span>
                  <div className={s.turmaInfo}>
                    <span className={s.turmaName}>{t.className}</span>
                    <span className={s.turmaSub}>{cicloLabel(t.ciclo)}</span>
                  </div>
                  <div className={s.turmaProgress}>
                    <ProgressBar
                      value={pct}
                      variant={pct === 100 ? 'success' : 'brand'}
                      size="sm"
                      ariaLabel={`${t.entregues} de ${t.totalDisciplinas} relatórios`}
                    />
                    <span className={s.turmaPct}>{t.entregues}/{t.totalDisciplinas} relatórios · {pct}%</span>
                  </div>
                  {t.diagnosticoId && (
                    <Badge tone={t.diagnosticoStatus === 'FINAL' ? 'success' : 'amber'} withDot>
                      {t.diagnosticoStatus === 'FINAL' ? 'finalizado' : 'rascunho'}
                    </Badge>
                  )}
                  <Button variant="primary" onClick={() => abrir(t)} disabled={loading}>
                    {loading ? 'abrindo…' : 'abrir'}
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ════════════ DETALHE DA TURMA ════════════
  const con = cx.consolidado
  return (
    <div className={s.page}>
      <div className={s.detailHead}>
        <IconButton icon={<ArrowLeft size={15} />} label="voltar" onClick={voltar} />
        <div className={s.detailTitleBlock}>
          <h1 className={s.detailTitle}>{cx.gradeLabel} {cx.className}</h1>
          <p className={s.detailSub}>
            {cicloLabel(cx.ciclo)} · {cx.bimestres.length ? periodoLabel(cx.bimestres) : 'sem período'}
          </p>
        </div>
        <IconButton
          icon={<RefreshCw size={15} />}
          label="recruzar"
          onClick={() => abrir(turmas.find(t => t.classId === cx.classId)!)}
        />
      </div>

      {fbEl}

      <div className={s.grid}>
        {/* ── Esquerda: leitura (análise) ── */}
        <div className={s.gridLeft}>
          <div className={s.card}>
            <div className={s.cardLabel}><Users size={13} /> completude dos relatórios</div>
            <div className={s.rows}>
              {cx.completude.length === 0 && <span className={s.muted}>nenhuma disciplina elegível.</span>}
              {cx.completude.map((c, i) => (
                <div key={i} className={s.compRow}>
                  <span className={`${s.dot} ${c.status === 'ok' ? s.dotOk : s.dotPend}`} />
                  <span className={s.compDisc}>{c.disciplinaLabel}</span>
                  <span className={s.compProf}>{c.professor}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={s.card}>
            <div className={s.cardLabel}><FileText size={13} /> cruzamento pedagógico</div>

            {con.padroes.length > 0 && (
              <div className={s.block}>
                <span className={s.blockLabel}>padrões transversais</span>
                <div className={s.chips}>
                  {con.padroes.map((p, i) => (
                    <span key={i} className={s.padrao}>
                      <span className={s.padraoCount}>{p.count}</span> {p.categoria}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className={s.consGrid}>
              <div className={s.block}>
                <span className={s.blockLabel}>forças ({con.fortes.length})</span>
                <div className={s.rows}>
                  {con.fortes.length === 0 && <span className={s.muted}>—</span>}
                  {con.fortes.slice(0, 30).map((f, i) => (
                    <div key={i} className={s.item}>
                      <span className={s.itemPos}>✓</span>
                      <span>{f.descritor} <span className={s.itemDisc}>· {f.disciplina}</span></span>
                    </div>
                  ))}
                </div>
              </div>
              <div className={s.block}>
                <span className={s.blockLabel}>fragilidades ({con.fracos.length})</span>
                <div className={s.rows}>
                  {con.fracos.length === 0 && <span className={s.muted}>—</span>}
                  {con.fracos.slice(0, 30).map((f, i) => (
                    <div key={i} className={s.item}>
                      <span className={s.itemNeg}>✗</span>
                      <span>{f.descritor} <span className={s.itemDisc}>· {f.disciplina}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {con.estrategias.length > 0 && (
              <div className={s.block}>
                <span className={s.blockLabel}>estratégias que funcionaram</span>
                <div className={s.rows}>
                  {con.estrategias.map((e, i) => (
                    <div key={i} className={s.item}>
                      <span className={s.itemBullet}>•</span>
                      <span>{e.titulo} <span className={s.itemDisc}>· {e.disciplina}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cx.fontes.length > 0 && (
              <div className={s.block}>
                <span className={s.blockLabel}>fontes ({cx.fontes.length} relatórios)</span>
                <div className={s.rows}>
                  {cx.fontes.map((f, i) => (
                    <a key={i} className={s.fonteRow} href={`/dashboard/relatorio-sintese?doc=${f.docId}`}>
                      <span className={`${s.dot} ${f.status === 'FINAL' ? s.dotOk : s.dotPend}`} />
                      <span className={s.compDisc}>{f.disciplinaLabel}</span>
                      <span className={s.compProf}>{f.professor}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Direita: escrita (diagnóstico + plano) ── */}
        <div className={s.gridRight}>
          {!canManage ? (
            <div className={s.warn}>
              você tem acesso de leitura. apenas a coordenação pode redigir e fechar o diagnóstico.
            </div>
          ) : (
            <>
              <div className={s.card}>
                <div className={s.cardHead}>
                  <span className={s.cardLabel}><ClipboardList size={13} /> diagnóstico da coordenação</span>
                  <Button variant="ghost" iconLeft={<Sparkles size={13} />} onClick={() => setIaOpen(true)}>
                    assistente
                  </Button>
                </div>
                {geradoPorIA && <span className={s.muted}>redigido com IA · revise antes de salvar</span>}
                <textarea
                  className={s.textarea}
                  value={diagnostico}
                  onChange={e => { setDiagnostico(e.target.value); setGeradoPorIA(false) }}
                  placeholder="síntese diagnóstica da turma: padrões, forças, fragilidades e prioridades…"
                />
              </div>

              <div className={s.card}>
                <div className={s.cardHead}>
                  <span className={s.cardLabel}><CheckCircle2 size={13} /> plano de ação</span>
                  <div className={s.cardHeadActions}>
                    <Button variant="ghost" iconLeft={<Plus size={13} />} onClick={() => setCatOpen(true)}>catálogo</Button>
                    <Button variant="ghost" iconLeft={<Plus size={13} />} onClick={addCustom}>personalizada</Button>
                  </div>
                </div>
                <div className={s.planoList}>
                  {plano.length === 0 && <span className={s.muted}>nenhuma ação adicionada.</span>}
                  {plano.map((a, i) => (
                    <div key={i} className={s.planoItem}>
                      <div className={s.planoHead}>
                        <Input
                          placeholder="título da ação"
                          value={a.titulo}
                          onChange={e => updAcao(i, { titulo: e.target.value })}
                        />
                        <IconButton icon={<Trash2 size={14} />} label="remover" variant="danger" onClick={() => delAcao(i)} />
                      </div>
                      {a.meta && (
                        <div className={s.metaChips}>
                          {[a.meta.foco, a.meta.evidencia, a.meta.publico].filter(Boolean).map((m, k) => (
                            <span key={k} className={s.metaChip}>{m}</span>
                          ))}
                        </div>
                      )}
                      <textarea
                        className={`${s.textarea} ${s.textareaSm}`}
                        value={a.descricao}
                        onChange={e => updAcao(i, { descricao: e.target.value })}
                        placeholder="descrição / como executar"
                      />
                      <div className={s.fieldRow}>
                        <Input placeholder="responsável" value={a.responsavel ?? ''} onChange={e => updAcao(i, { responsavel: e.target.value })} />
                        <Input placeholder="prazo"       value={a.prazo ?? ''}       onChange={e => updAcao(i, { prazo: e.target.value })} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={s.actions}>
                <Button variant="primary" iconLeft={<Save size={13} />} onClick={() => salvar(false)} disabled={saving}>
                  {saving ? 'salvando…' : 'salvar rascunho'}
                </Button>
                <Button variant="success" iconLeft={<CheckCircle2 size={13} />} onClick={() => salvar(true)} disabled={saving}>
                  finalizar
                </Button>
                {docId && (
                  <a className={s.dlLink} href={`/api/diagnostico-turma/${docId}/docx`}>
                    <Download size={13} /> Word
                  </a>
                )}
                {docId && (
                  <IconButton icon={<Trash2 size={14} />} label="excluir" variant="danger" onClick={() => setConfirmDelete(true)} />
                )}
                {docStatus && (
                  <Badge tone={docStatus === 'FINAL' ? 'success' : 'amber'} withDot>
                    {docStatus === 'FINAL' ? 'finalizado' : 'rascunho'}
                  </Badge>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {catOpen && <CatalogoModal onClose={() => setCatOpen(false)} onPick={addAcao} />}
      {iaOpen && (
        <IaModal
          classId={cx.classId}
          onClose={() => setIaOpen(false)}
          onApply={(d, p) => {
            setDiagnostico(d); setPlano(prev => [...prev, ...p]); setGeradoPorIA(true); setIaOpen(false)
            setFb({ kind: 'ok', msg: 'resposta da IA aplicada. revise antes de salvar.' })
          }}
        />
      )}
      <ConfirmDialog
        open={confirmDelete}
        title="excluir diagnóstico?"
        description="esta ação não pode ser desfeita. o diagnóstico e o plano de ação serão removidos."
        confirmLabel="excluir"
        onConfirm={excluir}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}

function CatalogoModal({ onClose, onPick }: { onClose: () => void; onPick: (a: DtAcaoCatalogo) => void }) {
  const [q, setQ] = useState('')
  const list = PLANO_ACAO_CATALOGO.filter(a => (a.titulo + a.foco + a.descricao).toLowerCase().includes(q.toLowerCase()))
  return (
    <Modal title="catálogo de ações pedagógicas" onClose={onClose} size="lg">
      <Input placeholder="buscar ação…" value={q} onChange={e => setQ(e.target.value)} />
      <div className={s.catGrid}>
        {list.map(a => (
          <button key={a.id} type="button" className={s.catCard} onClick={() => onPick(a)}>
            <span className={s.catTitle}>{a.titulo}</span>
            <div className={s.metaChips}>
              <span className={s.metaChip}>{a.foco}</span>
              <span className={s.metaChip}>{a.evidencia}</span>
              <span className={s.metaChip}>{a.publico}</span>
            </div>
            <span className={s.catDesc}>{a.descricao}</span>
          </button>
        ))}
        {list.length === 0 && <span className={s.muted}>nenhuma ação encontrada.</span>}
      </div>
    </Modal>
  )
}

function IaModal({ classId, onClose, onApply }: { classId: number; onClose: () => void; onApply: (diag: string, plano: DtPlanoAcaoItem[]) => void }) {
  const [prompt, setPrompt] = useState('')
  const [resp, setResp]     = useState('')
  const [busy, setBusy]     = useState(false)
  const [err, setErr]       = useState('')
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
    <Modal
      title="assistente de diagnóstico"
      subtitle="1) gere o pedido com os dados da turma · 2) cole no Copilot/ChatGPT · 3) cole aqui a resposta (JSON)"
      onClose={onClose}
      size="lg"
    >
      {err && <div className={`${s.feedback} ${s.err}`}>{err}</div>}
      {!prompt ? (
        <Button variant="primary" onClick={gerarPrompt} disabled={busy}>
          {busy ? 'gerando…' : 'gerar pedido'}
        </Button>
      ) : (
        <div className={s.iaBody}>
          <div className={s.block}>
            <span className={s.blockLabel}>pedido (copie para a IA)</span>
            <textarea className={`${s.textarea} ${s.textareaSm}`} readOnly value={prompt} />
            <Button variant="ghost" iconLeft={<Copy size={13} />} onClick={copiar}>
              {copied ? 'copiado' : 'copiar pedido'}
            </Button>
          </div>
          <div className={s.block}>
            <span className={s.blockLabel}>resposta da IA (cole o JSON)</span>
            <textarea
              className={`${s.textarea} ${s.textareaSm}`}
              value={resp}
              onChange={e => setResp(e.target.value)}
              placeholder='{"diagnostico":"…","planoAcao":[…]}'
            />
          </div>
          <Button variant="primary" onClick={aplicar} disabled={busy || !resp.trim()}>
            {busy ? 'aplicando…' : 'aplicar resposta'}
          </Button>
        </div>
      )}
    </Modal>
  )
}
