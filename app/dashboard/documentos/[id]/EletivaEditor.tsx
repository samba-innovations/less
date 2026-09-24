'use client'

import { useEffect } from 'react'
import { Check, ChevronDown, Calendar } from 'lucide-react'
import {
  DESENVOLVIMENTO_OPTS, RECURSOS_GRUPOS, AVALIACAO_GRUPOS, RECURSO_OBRIGATORIO,
  COMPOSICAO_MODELS, BLOCO_LABELS, BLOCO_ACCENT, REFERENCIAS_PADRAO, modelToText,
  somarSugestoes, type Grupo, type Tecnica,
} from '@/lib/guia-data'
import g from './guia.module.css'
import s from './eletiva.module.css'
import { GroupedChipSelector, type SelectorGroup } from '../../_components/Selector'
import { DatePicker } from '../../_components/DatePicker'
import { Input } from '../../_components/Input'
import { useFetch } from '@/lib/use-fetch'

type Props = {
  fields: Record<string, string>
  setField: (k: string, v: string) => void
  /** Para gravar mais de um campo no mesmo clique — ver EditorClient. */
  setFieldsMulti: (patch: Record<string, string>) => void
}

type AulaRow = { date: string; acao: string }

type Habilidade = { codigo: string; descricao: string; area: string }

function bimestreCorrente() {
  const m = new Date().getMonth() + 1
  return m <= 4 ? '1' : m <= 7 ? '2' : m <= 9 ? '3' : '4'
}
function pad(n: number) { return String(n).padStart(2, '0') }
function fmtBR(d: Date) { return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` }
function isoToBR(iso: string) { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}` }
function brToIso(br: string) { const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : '' }

function GrupoCheckbox({ grupos, value, onChange, lockedItems }: {
  grupos: Grupo[]; value: string; onChange: (v: string) => void; lockedItems?: string[]
}) {
  const groups: SelectorGroup[] = grupos.map(grp => ({
    id: grp.id, label: grp.label, items: grp.items, defaultOpen: true,
  }))
  return <GroupedChipSelector groups={groups} value={value} onChange={onChange} lockedItems={lockedItems} />
}

export function EletivaEditor({ fields, setField, setFieldsMulti }: Props) {
  useEffect(() => {
    // A eletiva voltou a ser organizada por bimestres, como o resto do sistema.
    // O bimestre corrente entra como ponto de partida; `semestre` so sobrevive
    // nos documentos antigos, que o PDF ainda sabe ler.
    if (!fields.bimestres)   setField('bimestres', bimestreCorrente())
    if (!fields.referencias) setField('referencias', REFERENCIAS_PADRAO)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Habilidades BNCC, do catalogo ──
  // Antes era caixa de texto: o professor digitava o codigo na mao, sem
  // validacao, e o PDF nem imprimia o campo. O catalogo e o mesmo da v1,
  // filtrado pelo nivel de ensino da eletiva.
  const catalogo = useFetch<Habilidade[]>(
    fields.nivel_ensino ? `/api/less/habilidades?nivel=${fields.nivel_ensino}` : null) ?? []
  const porArea = catalogo.reduce<Record<string, Habilidade[]>>((acc, h) => {
    (acc[h.area] ??= []).push(h)
    return acc
  }, {})
  const habLinhas = (fields.habilidades ?? '').split('\n').map(l => l.trim()).filter(Boolean)
  const habEscolhidas = new Set(habLinhas.map(l => /^([A-Z0-9]+)/.exec(l)?.[1] ?? '').filter(Boolean))

  function alternarHabilidade(h: Habilidade) {
    const proximas = new Set(habEscolhidas)
    proximas.has(h.codigo) ? proximas.delete(h.codigo) : proximas.add(h.codigo)
    // Reconstroi na ordem do catalogo, para a lista nao depender da ordem dos cliques.
    setField('habilidades', catalogo.filter(x => proximas.has(x.codigo))
      .map(x => `${x.codigo} — ${x.descricao}`).join('\n'))
  }

  function alternarBimestre(n: string) {
    const atuais = (fields.bimestres ?? '').split(',').map(x => x.trim()).filter(Boolean)
    const proximos = atuais.includes(n) ? atuais.filter(x => x !== n) : [...atuais, n]
    setField('bimestres', proximos.sort().join(','))
  }

  // Escolher a metodologia ja marca os materiais e os instrumentos de avaliacao
  // daquela tecnica, como na v1. Soma ao que estiver marcado, sem repetir: o
  // professor pode ter escolhido algo antes.
  function escolherMetodologia(m: Tecnica) {
    setFieldsMulti({
      metodologia: `${m.nome} — ${m.descritor}`,
      materiais:   somarSugestoes(fields.materiais ?? RECURSO_OBRIGATORIO, [m.id], 'recursos'),
      avaliacao:   somarSugestoes(fields.avaliacao ?? '', [m.id], 'avaliacao'),
    })
  }

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
          <Input
            placeholder="Ex: Programação Criativa"
            value={fields.nome_eletiva ?? ''}
            onChange={e => setField('nome_eletiva', e.target.value)}
            className={g.input}
          />
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
            <Input
              placeholder="Nome do parceiro"
              value={fields.professor_parceiro ?? ''}
              onChange={e => setField('professor_parceiro', e.target.value)}
              className={g.input}
            />
          </div>
          <div className={g.field}>
            <label className={g.label}>Bimestre(s) <span className={g.hint}>a eletiva pode atravessar mais de um</span></label>
            <div className={g.chipRow}>
              {['1', '2', '3', '4'].map(n => {
                const marcado = (fields.bimestres ?? '').split(',').map(x => x.trim()).includes(n)
                return (
                  <button key={n} className={`${g.chip} ${marcado ? g.chipOn : ''}`} onClick={() => alternarBimestre(n)}>{n}º</button>
                )
              })}
            </div>
          </div>
          <div className={g.field}>
            <label className={g.label}>Carga horária semanal</label>
            <Input
              placeholder="Ex: 2 aulas / semana"
              value={fields.carga_horaria ?? ''}
              onChange={e => setField('carga_horaria', e.target.value)}
              className={g.input}
            />
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
          <label className={g.label}>
            Habilidades BNCC
            <span className={g.hint}>
              {fields.nivel_ensino ? 'clique para incluir/excluir · passe o mouse para o descritor' : 'escolha o nível de ensino para carregar'}
            </span>
          </label>
          {Object.entries(porArea).map(([area, hs]) => (
            <div key={area} className={s.areaBloco}>
              <p className={s.areaNome}>{area}</p>
              <div className={g.habBadges}>
                {hs.map(h => (
                  <button
                    key={h.codigo}
                    type="button"
                    className={`${g.habBadge} ${habEscolhidas.has(h.codigo) ? g.habOn : g.habOff}`}
                    title={h.descricao}
                    onClick={() => alternarHabilidade(h)}
                  >{h.codigo}</button>
                ))}
              </div>
            </div>
          ))}
          {habLinhas.length > 0 && (
            <ul className={s.habEscolhidas}>
              {habLinhas.map(l => <li key={l}>{l}</li>)}
            </ul>
          )}
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
              <DatePicker
                value={fields.data_inicio ?? null}
                onChange={v => setField('data_inicio', v)}
                className={g.input}
              />
            </div>
            <div className={s.cronoDate}>
              <span className={s.cronoDateLabel}>Culminância</span>
              <DatePicker
                value={fields.data_culminancia ?? null}
                onChange={v => setField('data_culminancia', v)}
                className={g.input}
              />
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
                  <Input
                    placeholder={i === 0 ? 'Apresentação da eletiva…' : i === rows.length - 1 ? 'Culminância — apresentação final…' : 'Tema / atividade…'}
                    value={row.acao}
                    onChange={e => updateAcao(i, e.target.value)}
                    className={g.input}
                  />
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
                onClick={() => escolherMetodologia(m)}>
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
