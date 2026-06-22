'use client'

import { useEffect } from 'react'
import { Check, ChevronDown, Calendar } from 'lucide-react'
import {
  DESENVOLVIMENTO_OPTS, RECURSOS_GRUPOS, AVALIACAO_GRUPOS, RECURSO_OBRIGATORIO,
  COMPOSICAO_MODELS, BLOCO_LABELS, BLOCO_ACCENT, REFERENCIAS_PADRAO, modelToText, type Grupo,
} from '@/lib/guia-data'
import g from './guia.module.css'
import s from './eletiva.module.css'

type Props = { fields: Record<string, string>; setField: (k: string, v: string) => void }

type AulaRow = { date: string; acao: string }

function currentSemestre() { return (new Date().getMonth() + 1) <= 6 ? '1º Semestre' : '2º Semestre' }
function pad(n: number) { return String(n).padStart(2, '0') }
function fmtBR(d: Date) { return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` }
function isoToBR(iso: string) { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}` }
function brToIso(br: string) { const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : '' }

function GrupoCheckbox({ grupos, value, onChange, lockedItems }: {
  grupos: Grupo[]; value: string; onChange: (v: string) => void; lockedItems?: string[]
}) {
  const selected = new Set(value ? value.split(', ').map(x => x.trim()).filter(Boolean) : [])
  const locked = new Set(lockedItems ?? [])
  function toggle(item: string) { if (locked.has(item)) return; const nx = new Set(selected); nx.has(item) ? nx.delete(item) : nx.add(item); onChange([...nx].join(', ')) }
  return (
    <div className={g.grupoList}>
      {grupos.map(grp => (
        <div key={grp.id} className={g.grupo}>
          <div className={g.grupoHead}><span className={g.grupoLabel}>{grp.label}</span></div>
          <div className={g.grupoBody}>
            {grp.items.map(item => {
              const on = selected.has(item) || locked.has(item)
              return (
                <label key={item} className={`${g.grupoItem} ${on ? g.grupoItemOn : ''} ${locked.has(item) ? g.grupoItemLocked : ''}`}>
                  <input type="checkbox" checked={on} disabled={locked.has(item)} onChange={() => toggle(item)} />
                  <span>{item}</span>
                </label>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export function EletivaEditor({ fields, setField }: Props) {
  useEffect(() => {
    if (!fields.semestre)    setField('semestre', currentSemestre())
    if (!fields.referencias) setField('referencias', REFERENCIAS_PADRAO)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const metodologiaId = DESENVOLVIMENTO_OPTS.find(m => (fields.metodologia ?? '').startsWith(m.nome))?.id ?? null
  const selectedModel = COMPOSICAO_MODELS.find(m => (fields.composicao_media ?? '').startsWith(m.nome))
  const blocos = ['A', 'B', 'C', 'D', 'E']

  const rows: AulaRow[] = (() => { try { return fields.cronograma ? JSON.parse(fields.cronograma) : [] } catch { return [] } })()

  function gerarCronograma() {
    const d1 = fields.data_inicio ? new Date(fields.data_inicio + 'T00:00') : null
    const d2 = fields.data_culminancia ? new Date(fields.data_culminancia + 'T00:00') : null
    if (!d1 || !d2 || d1 > d2) return
    const existing = new Map(rows.map(r => [r.date, r.acao]))
    const out: AulaRow[] = []
    const cur = new Date(d1)
    while (cur <= d2) { const ds = fmtBR(new Date(cur)); out.push({ date: ds, acao: existing.get(ds) ?? '' }); cur.setDate(cur.getDate() + 7) }
    setField('cronograma', JSON.stringify(out))
  }
  function updateAcao(i: number, acao: string) {
    setField('cronograma', JSON.stringify(rows.map((r, idx) => idx === i ? { ...r, acao } : r)))
  }

  return (
    <div className={g.wrap}>
      {/* ── Identificação ── */}
      <section className={g.section}>
        <div className={g.sectionHead}><span className={g.dot} />Identificação</div>
        <div className={g.field}>
          <label className={g.label}>Nome da Eletiva</label>
          <input className={g.input} value={fields.nome_eletiva ?? ''} placeholder="Ex: Programação Criativa" onChange={e => setField('nome_eletiva', e.target.value)} />
        </div>
        <div className={g.field}>
          <label className={g.label}>Nível de ensino</label>
          <div className={g.pillRow}>
            {[{ v: 'medio', l: 'Ensino Médio' }, { v: 'fundamental', l: 'Ensino Fundamental' }].map(o => (
              <button key={o.v} className={`${g.pill} ${fields.nivel_ensino === o.v ? g.pillOn : ''}`} onClick={() => setField('nivel_ensino', o.v)}>{o.l}</button>
            ))}
          </div>
        </div>
        <div className={g.idGrid}>
          <div className={g.field}>
            <label className={g.label}>Professor(a) parceiro(a) <span className={g.hint}>opcional</span></label>
            <input className={g.input} value={fields.professor_parceiro ?? ''} placeholder="Nome do parceiro" onChange={e => setField('professor_parceiro', e.target.value)} />
          </div>
          <div className={g.field}>
            <label className={g.label}>Semestre</label>
            <div className={g.chipRow}>
              {['1º Semestre', '2º Semestre'].map(sem => (
                <button key={sem} className={`${g.chip} ${fields.semestre === sem ? g.chipOn : ''}`} onClick={() => setField('semestre', sem)}>{sem}</button>
              ))}
            </div>
          </div>
          <div className={g.field}>
            <label className={g.label}>Carga horária semanal</label>
            <input className={g.input} value={fields.carga_horaria ?? ''} placeholder="Ex: 2 aulas / semana" onChange={e => setField('carga_horaria', e.target.value)} />
          </div>
        </div>
      </section>

      {/* ── Proposta Pedagógica ── */}
      <section className={g.section}>
        <div className={g.sectionHead}><span className={g.dot} />Proposta Pedagógica</div>
        <div className={g.field}>
          <label className={g.label}>Justificativa</label>
          <textarea className={g.textarea} rows={4} value={fields.justificativa ?? ''} placeholder="Por que esta eletiva é relevante?" onChange={e => setField('justificativa', e.target.value)} />
        </div>
        <div className={g.field}>
          <label className={g.label}>Ementa</label>
          <textarea className={g.textarea} rows={3} value={fields.ementa ?? ''} placeholder="Descrição geral dos temas e proposta…" onChange={e => setField('ementa', e.target.value)} />
        </div>
        <div className={g.field}>
          <label className={g.label}>Habilidades <span className={g.hint}>habilidades BNCC trabalhadas</span></label>
          <textarea className={g.textarea} rows={3} value={fields.habilidades ?? ''} placeholder="Liste as habilidades BNCC…" onChange={e => setField('habilidades', e.target.value)} />
        </div>
        <div className={g.field}>
          <label className={g.label}>Objetivos</label>
          <textarea className={g.textarea} rows={3} value={fields.objetivos ?? ''} placeholder="O que os alunos vão desenvolver?" onChange={e => setField('objetivos', e.target.value)} />
        </div>

        {/* Cronograma */}
        <div className={g.field}>
          <label className={g.label}>Conteúdo programático <span className={g.hint}>gere o cronograma semanal automaticamente</span></label>
          <div className={s.cronoControls}>
            <div className={s.cronoDate}>
              <span className={s.cronoDateLabel}>Primeira aula</span>
              <input type="date" className={g.input} value={fields.data_inicio ?? ''} onChange={e => setField('data_inicio', e.target.value)} />
            </div>
            <div className={s.cronoDate}>
              <span className={s.cronoDateLabel}>Culminância</span>
              <input type="date" className={g.input} value={fields.data_culminancia ?? ''} onChange={e => setField('data_culminancia', e.target.value)} />
            </div>
            <button className={s.cronoBtn} disabled={!fields.data_inicio || !fields.data_culminancia} onClick={gerarCronograma}>
              <Calendar size={13} /> Gerar cronograma
            </button>
          </div>
          {rows.length > 0 && (
            <div className={s.cronoList}>
              <p className={s.cronoCount}>{rows.length} aulas</p>
              {rows.map((row, i) => (
                <div key={row.date} className={`${s.cronoRow} ${i === rows.length - 1 ? s.cronoRowLast : ''}`}>
                  <span className={s.cronoNum}>{pad(i + 1)}</span>
                  <span className={s.cronoData}>{row.date}{i === rows.length - 1 ? ' · Culminância' : ''}</span>
                  <input className={g.input} value={row.acao} placeholder={i === 0 ? 'Apresentação da eletiva…' : i === rows.length - 1 ? 'Culminância — apresentação final…' : 'Tema / atividade…'} onChange={e => updateAcao(i, e.target.value)} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Metodologia e Avaliação ── */}
      <section className={g.section}>
        <div className={g.sectionHead}><span className={g.dot} />Metodologia e Avaliação</div>
        <div className={g.field}>
          <label className={g.label}>Metodologia <span className={g.hint}>clique para selecionar</span></label>
          <div className={g.tecnicaGrid}>
            {DESENVOLVIMENTO_OPTS.map(m => (
              <button key={m.id} className={`${g.tecnica} ${metodologiaId === m.id ? g.tecnicaOn : ''}`} title={m.descritor}
                onClick={() => setField('metodologia', `${m.nome} — ${m.descritor}`)}>
                <span className={g.tecnicaNum}>{pad(m.id)}</span><span className={g.tecnicaNome}>{m.nome}</span>
              </button>
            ))}
          </div>
          {metodologiaId !== null && (
            <textarea className={g.textarea} rows={3} value={fields.metodologia ?? ''} placeholder="Descreva como aplicará esta metodologia…" onChange={e => setField('metodologia', e.target.value)} />
          )}
        </div>
        <div className={g.field}>
          <label className={g.label}>Avaliação</label>
          <GrupoCheckbox grupos={AVALIACAO_GRUPOS} value={fields.avaliacao ?? ''} onChange={v => setField('avaliacao', v)} />
        </div>
        <div className={g.field}>
          <label className={g.label}>Materiais e recursos</label>
          <GrupoCheckbox grupos={RECURSOS_GRUPOS} value={fields.materiais ?? RECURSO_OBRIGATORIO} onChange={v => setField('materiais', v)} lockedItems={[RECURSO_OBRIGATORIO]} />
        </div>
        <div className={g.field}>
          <label className={g.label}>Composição de média <span className={g.hint}>selecione um modelo</span></label>
          <div className={g.compModelList}>
            {blocos.map(bloco => {
              const models = COMPOSICAO_MODELS.filter(m => m.bloco === bloco)
              const accent = BLOCO_ACCENT[bloco]
              return (
                <div key={bloco} className={g.blocoGroup} style={{ borderColor: accent + '40' }}>
                  <div className={g.blocoHead}><span className={g.blocoBar} style={{ background: accent }} /><span className={g.blocoLabel} style={{ color: accent }}>Bloco {bloco} — Prova Paulista {BLOCO_LABELS[bloco]}</span></div>
                  <div className={g.blocoModels}>
                    {models.map(m => {
                      const sel = selectedModel?.id === m.id
                      return (
                        <button key={m.id} className={`${g.modelCard} ${sel ? g.modelOn : ''}`} style={sel ? { borderColor: accent, background: accent + '12' } : undefined}
                          onClick={() => setField('composicao_media', sel ? '' : modelToText(m))}>
                          <p className={g.modelNome}>{m.nome}</p>
                          {m.desc && <p className={g.modelDesc}>{m.desc}</p>}
                          <div className={g.modelItens}>
                            {m.itens.map((it, idx) => <span key={idx} className={g.modelTag} style={it.nome === 'Prova Paulista' ? { background: accent, color: '#fff' } : undefined}>{it.pct}% {it.nome === 'Prova Paulista' ? 'PP' : it.nome}</span>)}
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
        <div className={g.field}>
          <label className={g.label}>Referências</label>
          <textarea className={g.textarea} rows={10} value={fields.referencias ?? ''} onChange={e => setField('referencias', e.target.value)} />
        </div>
      </section>
    </div>
  )
}
