'use client'

import { useEffect } from 'react'
import { Plus, X, ChevronDown } from 'lucide-react'
import { DIMENSOES_PDI, OBJETIVOS_OPCOES, getAtividade, getMetaDefault } from '@/lib/pdi-data'
import s from './pdi.module.css'

type Props = {
  fields:   Record<string, string>
  setField: (key: string, value: string) => void
}

type Atividade = {
  id: string; dimensao: string; atividade: string; detalhamento: string
  prazo_inicio: string; prazo_fim: string; objetivos: string; meta: string
}

function todayStr() { return new Date().toISOString().slice(0, 10) }
function currentSemestre() {
  const y = new Date().getFullYear()
  return (new Date().getMonth() + 1) <= 6 ? `1º Semestre ${y}` : `2º Semestre ${y}`
}

export function PdiEditor({ fields, setField }: Props) {
  useEffect(() => {
    if (!fields.periodo) setField('periodo', currentSemestre())
    if (!fields.data_elaboracao) setField('data_elaboracao', todayStr())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  let atividades: Atividade[] = []
  try { atividades = fields.atividades_json ? JSON.parse(fields.atividades_json) : [] } catch { atividades = [] }

  const y = new Date().getFullYear()
  const periodoOpcoes = [
    `1º Semestre ${y}`, `2º Semestre ${y}`,
    `1º Bimestre ${y}`, `2º Bimestre ${y}`, `3º Bimestre ${y}`, `4º Bimestre ${y}`,
  ]

  function save(list: Atividade[]) { setField('atividades_json', JSON.stringify(list)) }

  function addAtividade() {
    save([...atividades, { id: Date.now().toString(), dimensao: '', atividade: '', detalhamento: '', prazo_inicio: '', prazo_fim: '', objetivos: '', meta: '' }])
  }
  function removeAtividade(id: string) { save(atividades.filter(a => a.id !== id)) }

  function changeAtividade(id: string, campo: keyof Atividade, valor: string) {
    save(atividades.map(a => {
      if (a.id !== id) return a
      const up = { ...a, [campo]: valor }
      if (campo === 'dimensao' && valor) {
        up.atividade = ''
        up.detalhamento = ''
        up.meta = getMetaDefault(parseInt(valor))
      }
      if (campo === 'atividade' && valor && up.dimensao) {
        const ativ = getAtividade(parseInt(up.dimensao), valor)
        if (ativ) up.detalhamento = ativ.detalhamento
      }
      return up
    }))
  }

  const dimensoesUsadas = new Set(atividades.map(a => a.dimensao).filter(Boolean))

  return (
    <div className={s.wrap}>

      {/* ── Identificação ── */}
      <section className={s.section}>
        <div className={s.sectionHead}><span className={s.dot} />Identificação</div>
        <div className={s.idGrid}>
          <div className={s.field}>
            <label className={s.label}>Período de referência</label>
            <div className={s.selectWrap}>
              <select className={s.select} value={fields.periodo ?? ''} onChange={e => setField('periodo', e.target.value)}>
                <option value="">Selecionar período…</option>
                {periodoOpcoes.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <ChevronDown size={14} className={s.selectChevron} />
            </div>
          </div>
          <div className={s.field}>
            <label className={s.label}>Data de elaboração</label>
            <input type="date" className={s.input} value={fields.data_elaboracao ?? ''} onChange={e => setField('data_elaboracao', e.target.value)} />
          </div>
        </div>
      </section>

      {/* ── Dimensões ── */}
      <section className={s.section}>
        <div className={s.sectionHead}><span className={s.dot} />Plano de Desenvolvimento Individual — Dimensões</div>

        {atividades.length === 0 && <p className={s.empty}>Nenhuma atividade adicionada. Clique no botão abaixo para começar.</p>}

        {atividades.map((ativ, idx) => (
          <div key={ativ.id} className={s.card}>
            <div className={s.cardHead}>
              <span className={s.cardTitle}>Atividade {idx + 1}{ativ.dimensao ? ` — Dimensão ${ativ.dimensao}` : ''}</span>
              <button className={s.removeBtn} onClick={() => removeAtividade(ativ.id)} title="Remover"><X size={15} /></button>
            </div>

            <div className={s.grid2}>
              <div className={s.field}>
                <label className={s.label}>Dimensão</label>
                <div className={s.selectWrap}>
                  <select className={s.select} value={ativ.dimensao} onChange={e => changeAtividade(ativ.id, 'dimensao', e.target.value)}>
                    <option value="">Selecionar dimensão…</option>
                    {Object.values(DIMENSOES_PDI).map(dim => {
                      const disabled = dimensoesUsadas.has(String(dim.codigo)) && ativ.dimensao !== String(dim.codigo)
                      return <option key={dim.codigo} value={dim.codigo} disabled={disabled}>{dim.codigo} - {dim.nome}{disabled ? ' (já utilizada)' : ''}</option>
                    })}
                  </select>
                  <ChevronDown size={14} className={s.selectChevron} />
                </div>
              </div>
              <div className={s.field}>
                <label className={s.label}>Atividade</label>
                <div className={s.selectWrap}>
                  <select className={s.select} value={ativ.atividade} disabled={!ativ.dimensao} onChange={e => changeAtividade(ativ.id, 'atividade', e.target.value)}>
                    <option value="">{ativ.dimensao ? 'Selecionar atividade…' : 'Selecione uma dimensão primeiro'}</option>
                    {ativ.dimensao && DIMENSOES_PDI[parseInt(ativ.dimensao)]?.atividades.map(a => <option key={a.id} value={a.id}>{a.titulo}</option>)}
                  </select>
                  <ChevronDown size={14} className={s.selectChevron} />
                </div>
              </div>
            </div>

            <div className={s.field}>
              <label className={s.label}>Detalhamento da atividade</label>
              <textarea className={s.textarea} rows={3} value={ativ.detalhamento} placeholder="Descrição detalhada (pré-preenchida, editável)" onChange={e => changeAtividade(ativ.id, 'detalhamento', e.target.value)} />
            </div>

            <div className={s.grid2}>
              <div className={s.field}>
                <label className={s.label}>Prazo — Início</label>
                <input type="month" className={s.input} value={ativ.prazo_inicio} onChange={e => changeAtividade(ativ.id, 'prazo_inicio', e.target.value)} />
              </div>
              <div className={s.field}>
                <label className={s.label}>Prazo — Fim</label>
                <input type="month" className={s.input} value={ativ.prazo_fim} onChange={e => changeAtividade(ativ.id, 'prazo_fim', e.target.value)} />
              </div>
            </div>

            <div className={s.field}>
              <label className={s.label}>Objetivos esperados e evidências <span className={s.hint}>selecione uma sugestão ou escreva</span></label>
              <div className={s.selectWrap}>
                <select className={s.select} value="" onChange={e => { if (e.target.value) changeAtividade(ativ.id, 'objetivos', e.target.value) }}>
                  <option value="">Usar sugestão de objetivo…</option>
                  {OBJETIVOS_OPCOES.map(cat => (
                    <optgroup key={cat.categoria} label={cat.categoria}>
                      {cat.opcoes.map((op, i) => <option key={i} value={op}>{op}</option>)}
                    </optgroup>
                  ))}
                </select>
                <ChevronDown size={14} className={s.selectChevron} />
              </div>
              <textarea className={s.textarea} rows={3} value={ativ.objetivos} placeholder="Objetivos esperados e evidências de aprendizagem…" onChange={e => changeAtividade(ativ.id, 'objetivos', e.target.value)} />
            </div>

            <div className={s.field}>
              <label className={s.label}>Meta</label>
              <textarea className={s.textarea} rows={2} value={ativ.meta} placeholder="Meta a ser alcançada (pré-preenchida, editável)" onChange={e => changeAtividade(ativ.id, 'meta', e.target.value)} />
            </div>
          </div>
        ))}

        <button className={s.addBtn} onClick={addAtividade}><Plus size={16} /> Adicionar Atividade</button>
      </section>
    </div>
  )
}
