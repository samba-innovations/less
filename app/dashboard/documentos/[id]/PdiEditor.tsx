'use client'

import { useEffect } from 'react'
import { Plus, X, ChevronDown } from 'lucide-react'
import { DIMENSOES_PDI, OBJETIVOS_OPCOES, getAtividade, getMetaDefault } from '@/lib/pdi-data'
import s from './pdi.module.css'
import { ChipSelector } from '../../_components/Selector'
import { DatePicker } from '../../_components/DatePicker'
import { Button } from '../../_components/Button'
import { IconButton } from '../../_components/IconButton'

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
            <ChipSelector
              size="sm"
              value={fields.periodo || null}
              onChange={v => setField('periodo', v)}
              options={periodoOpcoes.map(p => ({ value: p, label: p }))}
            />
          </div>
          <div className={s.field}>
            <label className={s.label}>Data de elaboração</label>
            <DatePicker
              value={fields.data_elaboracao ?? null}
              onChange={v => setField('data_elaboracao', v)}
              className={s.input}
            />
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
              <IconButton
                icon={<X size={15} />}
                label="Remover"
                variant="danger"
                onClick={() => removeAtividade(ativ.id)}
              />
            </div>

            <div className={s.grid2}>
              <div className={s.field}>
                <label className={s.label}>Dimensão</label>
                <ChipSelector
                  size="sm"
                  value={ativ.dimensao || null}
                  onChange={v => changeAtividade(ativ.id, 'dimensao', v)}
                  options={Object.values(DIMENSOES_PDI).map(dim => ({
                    value:    String(dim.codigo),
                    label:    `${dim.codigo} · ${dim.nome}`,
                    disabled: dimensoesUsadas.has(String(dim.codigo)) && ativ.dimensao !== String(dim.codigo),
                  }))}
                />
              </div>
              <div className={s.field}>
                <label className={s.label}>Atividade</label>
                {!ativ.dimensao ? (
                  <p className={s.empty} style={{ margin: 0, fontSize: '0.75rem' }}>Selecione uma dimensão primeiro</p>
                ) : (
                  <ChipSelector
                    size="sm"
                    value={ativ.atividade || null}
                    onChange={v => changeAtividade(ativ.id, 'atividade', v)}
                    options={(DIMENSOES_PDI[parseInt(ativ.dimensao)]?.atividades ?? []).map(a => ({ value: a.id, label: a.titulo }))}
                  />
                )}
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
              <label className={s.label}>Objetivos esperados e evidências <span className={s.hint}>clique numa sugestão ou escreva</span></label>
              <details className={s.suggestions}>
                <summary className={s.suggestionsHeader}>
                  Ver sugestões por categoria
                  <ChevronDown size={13} className={s.suggestionsChevron} />
                </summary>
                <div className={s.suggestionsBody}>
                  {OBJETIVOS_OPCOES.map(cat => (
                    <div key={cat.categoria} className={s.suggestionsGroup}>
                      <p className={s.suggestionsGroupLabel}>{cat.categoria}</p>
                      <ChipSelector
                        size="sm"
                        value={null}
                        onChange={v => changeAtividade(ativ.id, 'objetivos', v)}
                        options={cat.opcoes.map(op => ({ value: op, label: op }))}
                      />
                    </div>
                  ))}
                </div>
              </details>
              <textarea className={s.textarea} rows={3} value={ativ.objetivos} placeholder="Objetivos esperados e evidências de aprendizagem…" onChange={e => changeAtividade(ativ.id, 'objetivos', e.target.value)} />
            </div>

            <div className={s.field}>
              <label className={s.label}>Meta</label>
              <textarea className={s.textarea} rows={2} value={ativ.meta} placeholder="Meta a ser alcançada (pré-preenchida, editável)" onChange={e => changeAtividade(ativ.id, 'meta', e.target.value)} />
            </div>
          </div>
        ))}

        <Button
          variant="primary"
          iconLeft={<Plus size={16} />}
          onClick={addAtividade}
        >Adicionar Atividade</Button>
      </section>
    </div>
  )
}
