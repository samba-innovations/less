'use client'

import { useState, useEffect } from 'react'
import { Check, ChevronDown, Loader2, ScrollText } from 'lucide-react'
import { Select } from '../../_components/Select'
import { SkeletonText } from '../../_components/Skeleton'
import {
  DIAGNOSTICO_FUNCIONAL, PEI_OBJETIVOS, PEI_ESTRAT_PEDAGOGICAS,
  PEI_INTERVENCOES, PEI_RECURSOS, PEI_AVALIACAO, PEI_LAWS, PEI_PURPOSES,
  parseClassCode, type PeiCard,
} from '@/lib/pei-data'
import { useFetch } from '@/lib/use-fetch'
import { GroupedChipSelector, type SelectorGroup } from '../../_components/Selector'
import s from './pei.module.css'
import { DatePicker } from '../../_components/DatePicker'
import { Input } from '../../_components/Input'

type PeiStudent = {
  id: number; name: string; ra: string; turma: string
  diagnostico?: string; profColaborativo?: string; profAee?: string
}
type Turma      = { id: number; name: string; grade: string; ciclo: string; serie: string }
type Disciplina = { id: number; name: string; aulasNome: string }

type Props = {
  fields:   Record<string, string>
  setField: (key: string, value: string) => void
  isAdmin?: boolean
}

const BIMESTRES = [
  { value: '1', label: '1º Bimestre' },
  { value: '2', label: '2º Bimestre' },
  { value: '3', label: '3º Bimestre' },
  { value: '4', label: '4º Bimestre' },
]

function todayStr() { return new Date().toISOString().slice(0, 10) }
function currentBimestre() {
  const m = new Date().getMonth() + 1
  return m <= 4 ? '1' : m <= 7 ? '2' : m <= 9 ? '3' : '4'
}

// Quebra o conteúdo de uma aula em itens (linhas / bullets / separadores comuns).
function parseConteudo(raw?: string | null): string[] {
  if (!raw) return []
  return raw
    .split(/\r?\n|[;•·]|•/)
    .map(x => x.replace(/^[-–—\s]+/, '').trim())
    .filter(Boolean)
}

// ─── Card grid (multi-select por nome) ────────────────────────────────────────

function CardGrid({ options, selected, onToggle }: {
  options: PeiCard[]; selected: Set<string>; onToggle: (nome: string) => void
}) {
  return (
    <div className={s.cardGrid}>
      {options.map(o => {
        const sel = selected.has(o.nome)
        return (
          <button key={o.id} type="button" onClick={() => onToggle(o.nome)}
            className={`${s.card} ${sel ? s.cardOn : ''}`}>
            <span className={s.cardCheck}>{sel && <Check size={9} strokeWidth={3.5} />}</span>
            <span className={s.cardBody}>
              <span className={s.cardNome}>{o.nome}</span>
              <span className={s.cardDesc}>{o.desc}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function PeiEditor({ fields, setField, isAdmin }: Props) {
  const adminSchool = fields._school_slug || ''
  const peiStudents = useFetch<PeiStudent[]>(
    isAdmin && adminSchool ? `/api/less/pei-students?school=${adminSchool}` : '/api/less/pei-students'
  ) ?? []
  const turmasRaw = useFetch<Turma[] | { needsSchool: true }>('/api/less/turmas')
  const turmas: Turma[] = Array.isArray(turmasRaw) ? turmasRaw : []

  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => {
    if (fields._selectedStudentIds) return new Set(fields._selectedStudentIds.split(',').map(Number).filter(Boolean))
    if (fields.aluno && peiStudents.length) {
      const f = peiStudents.find(p => p.name === fields.aluno)
      return f ? new Set([f.id]) : new Set()
    }
    return new Set()
  })

  const [classId, setClassId]       = useState<number | null>(null)
  const [ciclo, setCiclo]           = useState('')
  const [serie, setSerie]           = useState('')
  const [loadingHabs, setLoadingHabs] = useState(false)
  const [habMsg, setHabMsg]         = useState<string | null>(null)
  const [legalOpen, setLegalOpen]   = useState(false)
  const [openEixos, setOpenEixos]   = useState<Set<number>>(new Set())

  const disciplinas = useFetch<Disciplina[]>(classId ? `/api/less/disciplinas?classId=${classId}` : null) ?? []

  // selection sets derived from stored newline-joined strings
  const objNomes    = new Set((fields.objetivos  ?? '').split('\n').map(x => x.trim()).filter(Boolean))
  const estratNomes = new Set((fields.estrategias ?? '').split('\n').map(x => x.trim()).filter(Boolean))
  const avalNomes   = new Set((fields.avaliacao  ?? '').split('\n').map(x => x.trim()).filter(Boolean))
  const diagNomes   = new Set((fields.diagnostico_funcional ?? '').split('\n').map(x => x.trim()).filter(Boolean))

  useEffect(() => {
    if (!fields.bimestre)        setField('bimestre', currentBimestre())
    if (!fields.data_elaboracao) setField('data_elaboracao', todayStr())
    if (!fields.proxima_revisao) setField('proxima_revisao', todayStr())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Map current turma → classId/ciclo/serie whenever turma or turmas change
  useEffect(() => {
    if (!fields.turma || turmas.length === 0) return
    const cl = findClass(fields.turma)
    if (cl) { setClassId(cl.id); setCiclo(cl.ciclo); setSerie(cl.serie) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields.turma, turmas.length])

  // Auto-load habilidades when turma+disciplina+bimestre ready and not yet loaded
  useEffect(() => {
    if (fields.turma && fields.disciplina && fields.bimestre && !fields.habilidades && classId) {
      loadHabilidades()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, fields.disciplina, fields.bimestre])

  function normTurma(t: string) { return t.replace(/[ªº°\s]/g, '').toLowerCase() }

  function findClass(turma: string): Turma | undefined {
    let cl = turmas.find(x => normTurma(x.name) === normTurma(turma))
    if (cl) return cl
    const parsed = parseClassCode(turma)
    if (!parsed) return undefined
    const expectedCiclo = Number(parsed.year) >= 6 ? 'fundamental' : 'medio'
    return turmas.find(x => x.serie === parsed.year && x.name.toUpperCase().endsWith(parsed.sec) && x.ciclo === expectedCiclo)
      ?? turmas.find(x => {
        const p = parseClassCode(x.grade + x.name)
        return p?.year === parsed.year && p.sec === parsed.sec
      })
  }

  // students filtered to teacher's turmas (admin sees all)
  const myTurmasNorm = new Set(turmas.map(t => normTurma(t.name)))
  const myStudents = isAdmin ? peiStudents : peiStudents.filter(st => {
    const cl = findClass(st.turma)
    return cl != null || myTurmasNorm.has(normTurma(st.turma))
  })

  // compatibility: same série + same condição
  const refStudent = selectedIds.size > 0 ? myStudents.find(st => selectedIds.has(st.id)) ?? null : null
  const refSerie   = refStudent ? (parseClassCode(refStudent.turma)?.year ?? null) : null
  const refCond    = refStudent ? (refStudent.diagnostico?.trim() || null) : null

  function isCompatible(st: PeiStudent) {
    if (selectedIds.size === 0 || selectedIds.has(st.id)) return true
    const sSerie = parseClassCode(st.turma)?.year ?? null
    const sCond  = st.diagnostico?.trim() || null
    return sSerie === refSerie && sCond === refCond
  }

  function applyStudent(st: PeiStudent) {
    setField('aluno', st.name)
    setField('ra', st.ra)
    setField('turma', st.turma)
    setField('diagnostico_cid', st.diagnostico ?? '')
    const profs: string[] = []
    if (st.profAee) profs.push(`Prof. AEE: ${st.profAee}`)
    if (st.profColaborativo) profs.push(`Prof. Colaborativo: ${st.profColaborativo}`)
    setField('profissionais', profs.join('\n'))
  }

  function clearStudent() {
    ['aluno', 'ra', 'turma', 'diagnostico_cid', 'profissionais', 'habilidades', 'conteudo', '_conteudo_opcoes'].forEach(k => setField(k, ''))
    setField('_selectedStudentIds', '')
  }

  function toggleStudent(st: PeiStudent) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(st.id)) {
        next.delete(st.id)
        if (next.size === 0) clearStudent()
        else { const first = myStudents.find(x => x.id === [...next][0]); if (first) applyStudent(first) }
      } else {
        next.add(st.id)
        if (next.size === 1) applyStudent(st)
      }
      setField('_selectedStudentIds', [...next].join(','))
      return next
    })
  }

  async function loadHabilidades() {
    const cl = findClass(fields.turma)
    if (!cl) { setHabMsg(`Turma "${fields.turma}" não encontrada no sistema.`); return }
    const disc = disciplinas.find(d => d.name === fields.disciplina)
    const aulasNome = disc?.aulasNome ?? fields.disciplina
    setLoadingHabs(true); setHabMsg(null)
    try {
      const url = `/api/less/aulas?disciplina=${encodeURIComponent(aulasNome)}&serie=${cl.serie}&ciclo=${cl.ciclo}&bimestre=${fields.bimestre}`
      const rows: { habilidadeCodigo?: string; habilidadeTexto?: string; conteudo?: string | null }[] = await fetch(url).then(r => r.ok ? r.json() : [])
      if (!rows || rows.length === 0) {
        setHabMsg(`Nenhuma aula encontrada para ${fields.disciplina} / ${fields.turma} / ${fields.bimestre}º Bimestre no currículo.`)
        return
      }
      const habs = rows.map(a => [a.habilidadeCodigo, a.habilidadeTexto].filter(Boolean).join(' ')).filter(Boolean).join('\n')
      if (habs) setField('habilidades', habs)
      // Regra do PEI: além da habilidade, o conteúdo específico ligado a ela — das MESMAS aulas.
      const conts = [...new Set(rows.flatMap(a => parseConteudo(a.conteudo)))]
      if (conts.length > 0) {
        setField('_conteudo_opcoes', conts.join('\n'))
        setField('conteudo', conts.join('\n'))
      }
    } finally { setLoadingHabs(false) }
  }

  function toggleNome(key: 'objetivos' | 'estrategias' | 'avaliacao', set: Set<string>, nome: string) {
    const next = new Set(set)
    next.has(nome) ? next.delete(nome) : next.add(nome)
    setField(key, [...next].join('\n'))
  }

  function toggleDiag(nome: string) {
    const next = new Set(diagNomes)
    next.has(nome) ? next.delete(nome) : next.add(nome)
    setField('diagnostico_funcional', [...next].join('\n'))
  }

  function toggleEixo(id: number) {
    setOpenEixos(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const habList = (fields.habilidades ?? '').split('\n').map(x => x.trim()).filter(Boolean)

  // Conteúdo específico da habilidade — opções (das aulas) + seleção atual
  const conteudoOpcoes = (fields._conteudo_opcoes ?? '').split('\n').map(x => x.trim()).filter(Boolean)
  const conteudoSel    = new Set((fields.conteudo ?? '').split('\n').map(x => x.trim()).filter(Boolean))
  function toggleConteudo(opt: string) {
    const next = new Set(conteudoSel)
    next.has(opt) ? next.delete(opt) : next.add(opt)
    setField('conteudo', [...next].join('\n'))
  }

  return (
    <div className={s.wrap}>

      {/* ── Identificação do Aluno ── */}
      <section className={s.section}>
        <div className={s.sectionHead}><span className={s.sectionDot} />Identificação do Aluno</div>
        <p className={s.hint}>Selecione o aluno da lista PEI das suas turmas</p>
        {myStudents.length === 0 ? (
          <p className={s.empty}>Nenhum aluno PEI cadastrado nas suas turmas.</p>
        ) : (
          <div className={s.studentGrid}>
            {myStudents.map(st => {
              const sel = selectedIds.has(st.id)
              const compat = isCompatible(st)
              return (
                <button key={st.id} type="button" disabled={!compat}
                  onClick={() => compat && toggleStudent(st)}
                  className={`${s.studentCard} ${sel ? s.studentOn : ''} ${!compat ? s.studentDisabled : ''}`}
                  title={!compat ? 'Série ou condição diferente do aluno de referência' : undefined}>
                  <div className={s.studentTop}>
                    <span className={s.studentName}>{st.name}</span>
                    <span className={s.studentCheck}>{sel && <Check size={8} strokeWidth={3.5} />}</span>
                  </div>
                  <div className={s.studentTags}>
                    {st.turma && <span className={s.tagTurma}>{st.turma}</span>}
                    {st.diagnostico && <span className={s.tagDiag}>{st.diagnostico}</span>}
                  </div>
                </button>
              )
            })}
          </div>
        )}
        {selectedIds.size > 1 && (
          <p className={s.batchNote}>{selectedIds.size} alunos selecionados — será gerado um PDF por aluno.</p>
        )}

        <div className={s.idGrid}>
          <div className={s.field}>
            <label className={s.label}>Bimestre</label>
            <div className={s.chipRow}>
              {BIMESTRES.map(b => (
                <button key={b.value} className={`${s.chip} ${fields.bimestre === b.value ? s.chipOn : ''}`}
                  onClick={() => setField('bimestre', b.value)}>{b.value}º</button>
              ))}
            </div>
          </div>
          <div className={s.field}>
            <label className={s.label}>Disciplina</label>
            <Select
              value={fields.disciplina ?? ''}
              placeholder={classId ? 'selecionar…' : 'selecione o aluno primeiro'}
              options={disciplinas.map(d => ({ value: d.name, label: d.name }))}
              onChange={v => { setField('disciplina', v); setField('habilidades', ''); setField('conteudo', ''); setField('_conteudo_opcoes', '') }}
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

      {/* ── Habilidades e Conteúdo do Currículo ── */}
      <section className={s.section}>
        <div className={s.sectionHead}><span className={s.sectionDot} />Habilidades e Conteúdo do Currículo</div>
        {loadingHabs && <div style={{ padding: '12px 0' }}><SkeletonText lines={3} /></div>}
        {habMsg && !loadingHabs && <p className={s.warn}>{habMsg}</p>}
        {habList.length > 0 ? (
          <div className={s.habList}>
            {habList.map((h, i) => (
              <div key={i} className={s.habItem}><span className={s.habDot} /><span>{h}</span></div>
            ))}
          </div>
        ) : (!loadingHabs && !habMsg && (
          <p className={s.hint}>Selecione o aluno, disciplina e bimestre para carregar as habilidades automaticamente.</p>
        ))}

        {/* Conteúdo específico da habilidade — exigência do PEI, puxado das mesmas aulas */}
        {conteudoOpcoes.length > 0 && (
          <div className={s.field} style={{ marginTop: '0.875rem' }}>
            <label className={s.label}>
              Conteúdo específico da habilidade
              <span className={s.labelHint}>puxado das aulas — clique para incluir/excluir</span>
            </label>
            <div className={s.chipRow} style={{ flexWrap: 'wrap' }}>
              {conteudoOpcoes.map((opt, i) => (
                <button key={i} type="button"
                  className={`${s.chip} ${conteudoSel.has(opt) ? s.chipOn : ''}`}
                  onClick={() => toggleConteudo(opt)}>{opt}</button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Diagnóstico Funcional ── */}
      <section className={s.section}>
        <div className={s.sectionHead}><span className={s.sectionDot} />Diagnóstico Funcional</div>
        <p className={s.hint}>Expanda cada eixo e selecione as necessidades observadas</p>
        <GroupedChipSelector
          groups={DIAGNOSTICO_FUNCIONAL.map<SelectorGroup>(eixo => ({
            id: String(eixo.id), label: eixo.nome, items: eixo.necessidades,
          }))}
          value={[...diagNomes].join(', ')}
          onChange={v => {
            const arr = v.split(',').map(x => x.trim()).filter(Boolean)
            setField('diagnostico_funcional', arr.join('\n'))
          }}
        />
        <div className={s.field}>
          <label className={s.label}>Observações diagnósticas</label>
          <textarea className={s.textarea} rows={3} value={fields.diagnostico_obs ?? ''}
            placeholder="Ex: TEA (CID F84.0) — laudo de 15/03/2024. Hipersensibilidade sonora..."
            onChange={e => setField('diagnostico_obs', e.target.value)} />
        </div>
      </section>

      {/* ── Base Legal ── */}
      <section className={s.legalCard}>
        <button className={s.legalHead} onClick={() => setLegalOpen(o => !o)}>
          <ScrollText size={15} />
          <span className={s.legalTitle}>Embasamento Legal e Técnico</span>
          <ChevronDown size={14} className={`${s.eixoChevron} ${legalOpen ? s.eixoChevronOpen : ''}`} />
        </button>
        {legalOpen && (
          <div className={s.legalBody}>
            <p className={s.legalIntro}>Estrutura fundamentada em normativas oficiais vigentes, garantindo validade pedagógica, intencionalidade educacional e proteção jurídica ao documento.</p>
            <div className={s.legalTable}>
              {PEI_LAWS.map(law => (
                <div key={law.code} className={s.legalRow}>
                  <span className={s.legalCode}>{law.code}</span>
                  <span className={s.legalDesc}>{law.desc}</span>
                </div>
              ))}
            </div>
            <p className={s.legalPurposesLabel}>Propósitos da redação:</p>
            <ul className={s.legalPurposes}>
              {PEI_PURPOSES.map(p => <li key={p}>{p}</li>)}
            </ul>
          </div>
        )}
      </section>

      {/* ── Plano de Ação ── */}
      <section className={s.section}>
        <div className={s.sectionHead}><span className={s.sectionDot} />Plano de Ação</div>

        <div className={s.field}>
          <label className={s.label}>Objetivos específicos <span className={s.labelHint}>o que este aluno deve alcançar neste bimestre</span></label>
          <CardGrid options={PEI_OBJETIVOS} selected={objNomes} onToggle={n => toggleNome('objetivos', objNomes, n)} />
        </div>

        <div className={s.field}>
          <label className={s.label}>Estratégias e recursos pedagógicos <span className={s.labelHint}>adaptações e suportes para este aluno</span></label>
          {([
            { label: 'Estratégias pedagógicas',    opts: PEI_ESTRAT_PEDAGOGICAS },
            { label: 'Intervenções pedagógicas',   opts: PEI_INTERVENCOES },
            { label: 'Recursos de acessibilidade', opts: PEI_RECURSOS },
          ] as const).map(({ label, opts }) => (
            <div key={label} className={s.subGroup}>
              <div className={s.subDivider}>
                <span className={s.subDot} />
                <span className={s.subLabel}>{label}</span>
                <span className={s.subLine} />
              </div>
              <CardGrid options={opts} selected={estratNomes} onToggle={n => toggleNome('estrategias', estratNomes, n)} />
            </div>
          ))}
        </div>

        <div className={s.field}>
          <label className={s.label}>Avaliação do processo <span className={s.labelHint}>como o progresso será monitorado</span></label>
          <CardGrid options={PEI_AVALIACAO} selected={avalNomes} onToggle={n => toggleNome('avaliacao', avalNomes, n)} />
        </div>
      </section>

      {/* ── Profissionais e Família ── */}
      <section className={s.section}>
        <div className={s.sectionHead}><span className={s.sectionDot} />Profissionais e Família</div>
        {fields.profissionais && (
          <div className={s.profBox}>
            <p className={s.profBoxLabel}>Profissionais envolvidos</p>
            {fields.profissionais.split('\n').filter(Boolean).map((l, i) => <p key={i} className={s.profLine}>{l}</p>)}
          </div>
        )}
        <div className={s.field}>
          <label className={s.label}>Responsáveis / Família</label>
          <Input
            placeholder="Nome e contato dos responsáveis"
            value={fields.responsaveis ?? ''}
            onChange={e => setField('responsaveis', e.target.value)}
            className={s.input}
          />
        </div>
        <div className={s.field}>
          <label className={s.label}>Data da próxima revisão</label>
          <DatePicker
            value={fields.proxima_revisao ?? null}
            onChange={v => setField('proxima_revisao', v)}
            className={s.input}
          />
        </div>
      </section>

    </div>
  )
}
