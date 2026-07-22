'use client'

import { useEffect } from 'react'
import { Check } from 'lucide-react'
import {
  DESENVOLVIMENTO_OPTS, RECURSOS_GRUPOS, AVALIACAO_GRUPOS, RECURSO_OBRIGATORIO,
  COMPOSICAO_MODELS, BLOCO_LABELS, BLOCO_ACCENT, REFERENCIAS_PADRAO, modelToText, type Grupo,
} from '@/lib/guia-data'
import { useFetch } from '@/lib/use-fetch'
import g from './guia.module.css'
import { GroupedChipSelector, type SelectorGroup } from '../../_components/Selector'
import { Input } from '../../_components/Input'

type Props = { fields: Record<string, string>; setField: (k: string, v: string) => void }
type Turma = { id: number; name: string; grade: string; ciclo: string; serie: string }

function currentBimestre() { const m = new Date().getMonth() + 1; return m <= 4 ? '1' : m <= 7 ? '2' : m <= 9 ? '3' : '4' }
function pad(n: number) { return String(n).padStart(2, '0') }

function GrupoCheckbox({ grupos, value, onChange, lockedItems }: { grupos: Grupo[]; value: string; onChange: (v: string) => void; lockedItems?: string[] }) {
  const groups: SelectorGroup[] = grupos.map(grp => ({
    id: grp.id, label: grp.label, items: grp.items, defaultOpen: true,
  }))
  return <GroupedChipSelector groups={groups} value={value} onChange={onChange} lockedItems={lockedItems} />
}

export function EmaEditor({ fields, setField }: Props) {
  const turmasRaw = useFetch<Turma[] | { needsSchool: true }>('/api/less/turmas')
  const turmas: Turma[] = Array.isArray(turmasRaw) ? turmasRaw : []
  const selectedTurmas = fields.turmas ? fields.turmas.split(', ').filter(Boolean) : []

  useEffect(() => {
    if (!fields.bimestre)    setField('bimestre', currentBimestre())
    if (!fields.referencias) setField('referencias', REFERENCIAS_PADRAO)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const metodologiaId = DESENVOLVIMENTO_OPTS.find(m => (fields.metodologia ?? '').startsWith(m.nome))?.id ?? null
  const selectedModel = COMPOSICAO_MODELS.find(m => (fields.composicao_media ?? '').startsWith(m.nome))
  const blocos = ['A', 'B', 'C', 'D', 'E']

  function toggleTurma(name: string) {
    const next = selectedTurmas.includes(name) ? selectedTurmas.filter(x => x !== name) : [...selectedTurmas, name]
    setField('turmas', next.join(', '))
  }

  return (
    <div className={g.wrap}>
      <section className={g.section}>
        <div className={g.sectionHead}><span className={g.dot} />Identificação</div>
        <div className={g.idGrid}>
          <div className={g.field}>
            <label className={g.label}>Modalidade</label>
            <div className={g.chipRow}>
              {['Esporte', 'Música', 'Arte'].map(m => (
                <button key={m} className={`${g.chip} ${fields.modalidade === m ? g.chipOn : ''}`} onClick={() => setField('modalidade', m)}>{m}</button>
              ))}
            </div>
          </div>
          <div className={g.field}>
            <label className={g.label}>Bimestre</label>
            <div className={g.chipRow}>
              {['1','2','3','4'].map(b => <button key={b} className={`${g.chip} ${fields.bimestre === b ? g.chipOn : ''}`} onClick={() => setField('bimestre', b)}>{b}º</button>)}
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
        <div className={g.field}>
          <label className={g.label}>Turmas atendidas <span className={g.hint}>selecione uma ou mais</span></label>
          <div className={g.pillRow}>
            {turmas.map(t => (
              <button key={t.id} className={`${g.pill} ${selectedTurmas.includes(t.name) ? g.pillOn : ''}`} onClick={() => toggleTurma(t.name)}>
                {selectedTurmas.includes(t.name) && <Check size={10} />}{t.name}<span className={g.pillSub}>{t.grade}</span>
              </button>
            ))}
          </div>
        </div>
        <div className={g.field}>
          <label className={g.label}>Tema / Projeto do bimestre</label>
          <Input
            placeholder="Ex: Atletismo Paraolímpico / Canto Coral / Grafite Urbano"
            value={fields.tema ?? ''}
            onChange={e => setField('tema', e.target.value)}
            className={g.input}
          />
        </div>
      </section>

      <section className={g.section}>
        <div className={g.sectionHead}><span className={g.dot} />Planejamento</div>
        <div className={g.field}>
          <label className={g.label}>Objetivos</label>
          <textarea className={g.textarea} rows={3} value={fields.objetivos ?? ''} placeholder="O que os alunos vão aprender e desenvolver?" onChange={e => setField('objetivos', e.target.value)} />
        </div>
        <div className={g.field}>
          <label className={g.label}>Conteúdos</label>
          <textarea className={g.textarea} rows={4} value={fields.conteudos ?? ''} placeholder="Quais conteúdos serão trabalhados?" onChange={e => setField('conteudos', e.target.value)} />
        </div>
        <div className={g.field}>
          <label className={g.label}>Metodologia <span className={g.hint}>clique para selecionar</span></label>
          <div className={g.tecnicaGrid}>
            {DESENVOLVIMENTO_OPTS.map(m => (
              <button key={m.id} className={`${g.tecnica} ${metodologiaId === m.id ? g.tecnicaOn : ''}`} title={m.descritor} onClick={() => setField('metodologia', `${m.nome} — ${m.descritor}`)}>
                <span className={g.tecnicaNum}>{pad(m.id)}</span><span className={g.tecnicaNome}>{m.nome}</span>
              </button>
            ))}
          </div>
          {metodologiaId !== null && (
            <textarea className={g.textarea} rows={3} value={fields.metodologia ?? ''} placeholder="Descreva como aplicará…" onChange={e => setField('metodologia', e.target.value)} />
          )}
        </div>
        <div className={g.field}>
          <label className={g.label}>Avaliação</label>
          <GrupoCheckbox grupos={AVALIACAO_GRUPOS} value={fields.avaliacao ?? ''} onChange={v => setField('avaliacao', v)} />
        </div>
        <div className={g.field}>
          <label className={g.label}>Materiais e equipamentos</label>
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
                        <button key={m.id} className={`${g.modelCard} ${sel ? g.modelOn : ''}`} style={sel ? { borderColor: accent, background: accent + '12' } : undefined} onClick={() => setField('composicao_media', sel ? '' : modelToText(m))}>
                          <p className={g.modelNome}>{m.nome}</p>
                          {m.desc && <p className={g.modelDesc}>{m.desc}</p>}
                          <div className={g.modelItens}>{m.itens.map((it, idx) => <span key={idx} className={g.modelTag} style={it.nome === 'Prova Paulista' ? { background: accent, color: '#fff' } : undefined}>{it.pct}% {it.nome === 'Prova Paulista' ? 'PP' : it.nome}</span>)}</div>
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
