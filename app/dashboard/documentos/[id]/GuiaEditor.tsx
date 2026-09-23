'use client'

import { useState, useEffect, useRef } from 'react'
import { Check, ChevronDown, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react'
import { Select } from '../../_components/Select'
import { SkeletonText } from '../../_components/Skeleton'
import {
  BNCC_COMPETENCIAS, DESENVOLVIMENTO_OPTS, RECURSOS_GRUPOS, AVALIACAO_GRUPOS,
  RECURSO_OBRIGATORIO, COMPOSICAO_MODELS, BLOCO_LABELS, BLOCO_ACCENT,
  REFERENCIAS_PADRAO, somarSugestoes, modelToText, PACOTES_PRONTOS,
  DESENVOLVIMENTO_TO_PACOTE, type Tecnica, type Grupo, type Pacote,
} from '@/lib/guia-data'
import { useFetch } from '@/lib/use-fetch'
import { GroupedChipSelector, type SelectorGroup } from '../../_components/Selector'
import s from './guia.module.css'
import { Button } from '../../_components/Button'
import { Input } from '../../_components/Input'
import { Chip } from '../../_components/Chip'

type Turma = { id: number; name: string; grade: string; ciclo: string; serie: string }
type Disciplina = { id: number; name: string; aulasNome: string }
type Aula = {
  id: number; aulaNum: number; titulo: string
  conteudo?: string | null; objetivos?: string | null
  habilidadeCodigo?: string | null; habilidadeTexto?: string | null
  // As três colunas temáticas do currículo, em ordem de abrangência. Vêm nulas
  // com frequência — ver temaDoCurriculo().
  unidadeTematica?: string | null; eixo?: string | null; objetoConhecimento?: string | null
}
type AE = { id: number; codigo: string; descricao: string }

type BimestreCal = { id: number; ano: number; numero: number; label: string; dataInicio: string; dataFim: string }

type Props = {
  fields:   Record<string, string>
  setField: (key: string, value: string) => void
  /**
   * Para gravar mais de um campo no mesmo clique. Dois setField seguidos
   * agendam o segundo save a partir do `fields` anterior, e o primeiro campo
   * não chega ao banco — daqui em diante, quem escreve em par usa este.
   */
  setFieldsMulti: (patch: Record<string, string>) => void
  isAdmin?: boolean
}

const MAX_ESTRATEGIAS = 5
const STEP_LABELS = ['Identificação', 'Currículo', 'Objetivos', 'Metodologia', 'Finalização']

/**
 * O que cada etapa cobra para liberar a próxima.
 *
 * Antes só a etapa 1 era cobrada: dava para atravessar o assistente inteiro
 * deixando campo em branco e só descobrir o que faltava na hora de emitir, com
 * o documento já fechado — e aí era preciso refazer o caminho todo para achar
 * a etapa do campo.
 *
 * A etapa 2 é só leitura (aulas e aprendizagens do currículo) e a etapa 5 é a
 * última, então nenhuma das duas tem o que cobrar aqui; a 5 é cobrada na
 * emissão, pelo camposFaltando. "Ajuste(s) por demanda" fica de fora de
 * propósito: é registro eventual, e nem toda turma tem um.
 */
const CAMPOS_ETAPA: Record<number, { key: string; label: string }[]> = {
  1: [
    { key: 'turma',        label: 'turma' },
    { key: 'disciplina',   label: 'disciplina' },
    { key: 'bimestre',     label: 'bimestre' },
    { key: 'ano_letivo',   label: 'ano letivo' },
    { key: 'data_inicio',  label: 'período do bimestre' },
  ],
  2: [],
  3: [
    { key: 'tema',         label: 'tema / título do guia' },
    { key: 'competencias', label: 'competências gerais (BNCC)' },
    { key: 'habilidades',  label: 'habilidades específicas' },
    { key: 'conteudos',    label: 'conteúdos programáticos' },
  ],
  4: [
    { key: 'estrategias',  label: 'estratégias didáticas' },
    { key: 'recursos',     label: 'recursos e materiais' },
    { key: 'avaliacao',    label: 'avaliação bimestral' },
  ],
  5: [],
}

function currentBimestre() {
  const m = new Date().getMonth() + 1
  return m <= 4 ? '1' : m <= 7 ? '2' : m <= 9 ? '3' : '4'
}

// ─── Tecnica badge (com tooltip de descritor) ─────────────────────────────────
function TecnicaBadge({ item, selected, disabled, onToggle }: {
  item: Tecnica; selected: boolean; disabled?: boolean; onToggle: () => void
}) {
  return (
    <button type="button" disabled={disabled} onClick={onToggle}
      className={`${s.tecnica} ${selected ? s.tecnicaOn : ''} ${disabled ? s.tecnicaDisabled : ''}`}
      title={item.descritor}>
      <span className={s.tecnicaNum}>{String(item.id).padStart(2, '0')}</span>
      <span className={s.tecnicaNome}>{item.nome}</span>
    </button>
  )
}

/**
 * O tema do guia, lido do próprio currículo — a importação que a v1 fazia.
 *
 * A v1 tirava o tema da unidade temática da primeira aula. Só que no currículo
 * carregado aqui 4 de cada 5 aulas não têm unidade temática, e mais da metade
 * dos bimestres não tem nenhuma das três colunas temáticas — daí o campo, que é
 * obrigatório, chegar vazio à emissão. A cascata desce da coluna mais ampla
 * (unidade temática) para a mais específica (objeto de conhecimento) e, quando
 * o currículo não traz nenhuma, monta o rótulo que os professores já escreviam
 * à mão nos guias da v1 ("Guia de Aprendizagem — <disciplina> — 3º bimestre").
 * Em qualquer caso é um ponto de partida: o campo continua editável, e um tema
 * escrito pelo professor nunca é sobrescrito.
 */
function temaDoCurriculo(rows: Aula[], disciplina: string, bimestre: string): string {
  const limpar = (v?: string | null) => (v ?? '').replace(/\s+/g, ' ').trim()
  const distintos = (vals: (string | undefined | null)[]) =>
    [...new Set(vals.map(limpar).filter(Boolean))]

  for (const coluna of [
    rows.map(a => a.unidadeTematica),
    rows.map(a => a.eixo),
    rows.map(a => a.objetoConhecimento),
  ]) {
    const vals = distintos(coluna)
    if (vals.length === 0) continue
    // Um bimestre com dezenas de objetos de conhecimento viraria um parágrafo
    // no lugar de um título; os primeiros já dizem do que o bimestre trata.
    return vals.length > 4 ? `${vals.slice(0, 4).join(' · ')}…` : vals.join(' · ')
  }

  return `Guia de Aprendizagem — ${disciplina} — ${bimestre}º bimestre`
}

/**
 * As aprendizagens essenciais do bimestre — ou o motivo de não haver nenhuma.
 *
 * A SEDUC publica AE só para as disciplinas da matriz; itinerários, eletivas e
 * variantes ainda sem material publicado não têm. O bloco sumia calado quando a
 * lista vinha vazia, e o professor só descobria a ausência no PDF emitido.
 */
function Aprendizagens({ aes, disciplina, mostrar }: { aes: AE[]; disciplina?: string; mostrar: boolean }) {
  if (!mostrar) return null
  return (
    <div className={s.aesBlock}>
      <p className={s.aesLabel}>Aprendizagens Essenciais do Bimestre</p>
      {aes.length > 0
        ? aes.map(ae => (
            <div key={ae.id} className={s.aeRow}><span className={s.aeCode}>{ae.codigo}</span><span className={s.aeDesc}>{ae.descricao}</span></div>
          ))
        : <p className={s.empty}>Nenhuma publicada para {disciplina || 'esta disciplina'} neste bimestre — o guia sai sem esta seção.</p>}
    </div>
  )
}

// ─── Grupo checkbox (recursos / avaliação) — usa GroupedChipSelector unificado
function GrupoCheckbox({ grupos, value, onChange, lockedItems }: {
  grupos: Grupo[]; value: string; onChange: (v: string) => void; lockedItems?: string[]
}) {
  const groups: SelectorGroup[] = grupos.map(g => ({
    id: g.id, label: g.label, items: g.items, defaultOpen: g.defaultOpen,
  }))
  return <GroupedChipSelector groups={groups} value={value} onChange={onChange} lockedItems={lockedItems} />
}

export function GuiaEditor({ fields, setField, setFieldsMulti, isAdmin }: Props) {
  // As datas do bimestre estavam num BIMESTRE_DATAS fixo no código, que nem
  // batia com o calendário real da escola (1º bimestre: o código dizia "02/02 a
  // 22/04", o banco diz 02/02 a 01/05). E a caixa só exibia — data_inicio, que
  // é obrigatório e sai no PDF, nunca era gravado: o campo aparecia como não
  // preenchido mesmo com o período visível na tela.
  const bimestres = useFetch<BimestreCal[]>('/api/less/bimestres') ?? []
  const turmasRaw = useFetch<Turma[] | { needsSchool: true }>('/api/less/turmas')
  const turmas: Turma[] = Array.isArray(turmasRaw) ? turmasRaw : []

  const selectedTurmas = fields.turmas ? fields.turmas.split(', ').filter(Boolean) : fields.turma ? [fields.turma] : []
  const primaryTurma = turmas.find(t => t.name === (selectedTurmas[0] ?? ''))
  const classId = primaryTurma?.id ?? null

  const disciplinas = useFetch<Disciplina[]>(classId ? `/api/less/disciplinas?classId=${classId}` : null) ?? []

  const hasId = !!(fields.turma && fields.disciplina && fields.bimestre)
  const [step, setStep] = useState<number>(hasId ? 3 : 1)
  const [aulas, setAulas] = useState<Aula[]>([])
  const [aes, setAes] = useState<AE[]>([])
  const [loadingAulas, setLoadingAulas] = useState(false)
  const initRef = useRef(false)

  const estrategiaIds = (fields.estrategia_ids ?? '').split(',').map(Number).filter(Boolean)

  /** O bimestre do ano letivo escolhido — o calendário é por ano. */
  function calDoBimestre(num: string): BimestreCal | undefined {
    const ano = Number(fields.ano_letivo) || new Date().getFullYear()
    return bimestres.find(b => String(b.numero) === num && b.ano === ano)
        ?? bimestres.find(b => String(b.numero) === num)
  }

  function ddmm(iso: string) {
    const [, m, d] = iso.slice(0, 10).split('-')
    return `${d}/${m}`
  }

  function periodoDoBimestre(num: string) {
    const cal = calDoBimestre(num)
    return cal ? `${ddmm(cal.dataInicio)} a ${ddmm(cal.dataFim)}` : '—'
  }

  /** Escolher o bimestre também carimba as datas, que saem no PDF. */
  function escolherBimestre(num: string) {
    const cal = calDoBimestre(num)
    setFieldsMulti({
      bimestre: num,
      ...(cal ? { data_inicio: cal.dataInicio.slice(0, 10), data_fim: cal.dataFim.slice(0, 10) } : {}),
    })
  }

  useEffect(() => {
    const inicial: Record<string, string> = {}
    if (!fields.bimestre)    inicial.bimestre    = currentBimestre()
    if (!fields.referencias) inicial.referencias = REFERENCIAS_PADRAO
    if (!fields.ano_letivo)  inicial.ano_letivo  = String(new Date().getFullYear())
    if (Object.keys(inicial).length) setFieldsMulti(inicial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Os bimestres chegam depois do primeiro render; se já havia um escolhido
  // (documento salvo, ou o padrão do useEffect acima), carimba a data agora.
  useEffect(() => {
    if (!fields.bimestre || fields.data_inicio || bimestres.length === 0) return
    const cal = calDoBimestre(fields.bimestre)
    if (cal) {
      setFieldsMulti({
        data_inicio: cal.dataInicio.slice(0, 10),
        data_fim:    cal.dataFim.slice(0, 10),
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bimestres.length, fields.bimestre])

  // On open with existing identification, load curriculum once
  useEffect(() => {
    if (hasId && !initRef.current && primaryTurma && disciplinas.length > 0) {
      initRef.current = true
      loadCurriculo(primaryTurma, fields.disciplina, fields.bimestre, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasId, primaryTurma?.id, disciplinas.length])

  function toggleTurma(t: Turma) {
    const prev = selectedTurmas
    const next = prev.includes(t.name) ? prev.filter(x => x !== t.name) : [...prev, t.name]
    const np = next[0] && next[0] !== prev[0] ? turmas.find(x => x.name === next[0]) : undefined
    setFieldsMulti({
      turma:  next[0] ?? '',
      turmas: next.join(', '),
      ...(np ? { _ciclo: np.ciclo, _serie: np.serie } : {}),
    })
  }

  async function loadCurriculo(turma: Turma, disciplina: string, bimStr: string, autofill = true) {
    if (!turma || !disciplina || !bimStr) return
    const disc = disciplinas.find(d => d.name === disciplina)
    const aulasNome = disc?.aulasNome ?? disciplina
    setLoadingAulas(true)
    setFieldsMulti({ _ciclo: turma.ciclo, _serie: turma.serie, _aulas_nome: aulasNome })
    try {
      const base = `disciplina=${encodeURIComponent(aulasNome)}&serie=${turma.serie}&ciclo=${turma.ciclo}&bimestre=${bimStr}`
      const [rows, aeRows] = await Promise.all([
        fetch(`/api/less/aulas?${base}`).then(r => r.ok ? r.json() : []),
        fetch(`/api/less/aprendizagens?${base}`).then(r => r.ok ? r.json() : []),
      ])
      setAulas(rows ?? [])
      setAes(aeRows ?? [])
      if (autofill && rows && rows.length > 0) {
        const habs  = rows.map((a: Aula) => [a.habilidadeCodigo, a.habilidadeTexto].filter(Boolean).join(' ')).filter(Boolean).join('\n')
        const conts = rows.map((a: Aula) => a.conteudo).filter(Boolean).join('\n')
        const patch: Record<string, string> = {}
        if (habs)  patch.habilidades = habs
        if (conts) patch.conteudos   = conts
        // O tema é obrigatório e sai no PDF. Antes vinha só da unidade temática
        // da primeira aula — que 4 em cada 5 aulas do currículo não têm, então
        // o campo ficava vazio e travava a emissão.
        if (!fields.tema) {
          const tema = temaDoCurriculo(rows, disciplina, bimStr)
          if (tema) patch.tema = tema
        }
        if (Object.keys(patch).length) setFieldsMulti(patch)
      }
    } finally { setLoadingAulas(false) }
  }

  /**
   * O campo visível é REFEITO a cada clique no catálogo, então o texto escrito
   * pelo professor vive em `estrategia_outro` e é recomposto aqui — senão o
   * clique seguinte apagaria o que ele escreveu. Mesma composição da v1: os
   * cartões e, no fim, o texto próprio como observação.
   */
  function buildEstrategias(ids: number[], outro = fields.estrategia_outro ?? '') {
    const cartoes = DESENVOLVIMENTO_OPTS.filter(x => ids.includes(x.id)).map(x => `${x.nome} — ${x.descritor}`)
    return [...cartoes, ...(outro.trim() ? [`Observação: ${outro.trim()}`] : [])].join('\n')
  }

  function definirEstrategiaOutro(texto: string) {
    setFieldsMulti({
      estrategia_outro: texto,
      estrategias:      buildEstrategias(estrategiaIds, texto),
    })
  }
  function toggleEstrategia(id: number) {
    const next = estrategiaIds.includes(id)
      ? estrategiaIds.filter(x => x !== id)
      : estrategiaIds.length < MAX_ESTRATEGIAS ? [...estrategiaIds, id] : estrategiaIds
    // Escolher a estratégia já marca os recursos correspondentes, como na v1.
    // Soma ao que estiver marcado: o professor pode ter escolhido algo antes.
    setFieldsMulti({
      estrategia_ids: next.join(','),
      estrategias:    buildEstrategias(next),
      recursos:       somarSugestoes(fields.recursos ?? RECURSO_OBRIGATORIO, next, 'recursos'),
      avaliacao:      somarSugestoes(fields.avaliacao ?? '', next, 'avaliacao'),
    })
  }

  // ── Início rápido: os mesmos pacotes do plano de aula ──
  // Lá o pacote troca recursos e avaliação de uma vez; aqui também, com uma
  // diferença: os slides oficiais são recurso obrigatório do guia e ficam, senão
  // o clique os apagaria do documento (o seletor os mostra travados, mas quem
  // vai para o PDF é o valor do campo).
  const pacoteSugerido = estrategiaIds[0] ? DESENVOLVIMENTO_TO_PACOTE[estrategiaIds[0]] : undefined

  function aplicarPacote(p: Pacote) {
    setFieldsMulti({
      recursos:  [...new Set([RECURSO_OBRIGATORIO, ...p.recursos])].join(', '),
      avaliacao: p.avaliacao.join(', '),
    })
  }

  // ── Competências BNCC ──
  const compIds = new Set((fields.competencias ?? '').split('\n').map(l => { const m = l.match(/^(\d+)\./); return m ? Number(m[1]) : null }).filter((x): x is number => x != null))
  function toggleComp(id: number) {
    const sset = new Set(compIds)
    sset.has(id) ? sset.delete(id) : sset.add(id)
    setField('competencias', BNCC_COMPETENCIAS.filter(c => sset.has(c.id)).map(c => `${c.id}. ${c.nome}`).join('\n'))
  }

  // ── Habilidades badge selector ──
  const habLines = (fields.habilidades ?? '').split('\n').map(l => l.trim()).filter(Boolean)
  const codeMap = new Map<string, string>()
  for (const line of habLines) {
    const m = line.match(/^\(?([A-Z]{2,4}\d+[A-Z]+\d+)\)?\s*(.*)/)
    if (m && !codeMap.has(m[1])) codeMap.set(m[1], line)
  }
  const habCodes = [...codeMap.keys()]
  const selHabCodes = new Set(habCodes) // all selected by default (whatever's in fields.habilidades)
  function toggleHab(code: string) {
    const sset = new Set(selHabCodes)
    sset.has(code) ? sset.delete(code) : sset.add(code)
    setField('habilidades', habCodes.filter(c => sset.has(c)).map(c => codeMap.get(c)!).join('\n'))
  }

  // ── Composição de média ──
  const selectedModel = COMPOSICAO_MODELS.find(m => (fields.composicao_media ?? '').startsWith(m.nome))
  const blocos = ['A', 'B', 'C', 'D', 'E']

  /** O que falta preencher na etapa — a turma mora em `turmas`, não num campo. */
  function faltantesDaEtapa(n: number) {
    return (CAMPOS_ETAPA[n] ?? []).filter(f => {
      const valor = f.key === 'turma' ? (selectedTurmas[0] ?? '') : (fields[f.key] ?? '')
      return valor.trim() === ''
    })
  }

  function NavBar() {
    const faltando = faltantesDaEtapa(step)
    return (
      <div className={s.navwrap}>
      <div className={s.navbar}>
        <div className={s.steps}>
          {STEP_LABELS.map((label, i) => {
            const n = i + 1
            const active = step === n
            const done = step > n
            return (
              <button key={n} className={`${s.stepBtn} ${active ? s.stepActive : ''} ${done ? s.stepDone : ''}`}
                onClick={() => n < step && setStep(n)} disabled={n > step}>
                <span className={s.stepNum}>{done ? <Check size={9} /> : n}</span>
                <span className={s.stepName}>{label}</span>
              </button>
            )
          })}
        </div>
        <div className={s.navActions}>
          {step > 1 && <Button
            variant="ghost"
            iconLeft={<ArrowLeft size={12} />}
            onClick={() => setStep(step - 1)}
          >Voltar</Button>}
          {step < 5 && (
            <button className={s.nextBtn} disabled={faltando.length > 0}
              onClick={() => {
                if (step === 1 && primaryTurma) loadCurriculo(primaryTurma, fields.disciplina, fields.bimestre)
                setStep(step + 1)
              }}>
              Avançar <ArrowRight size={12} />
            </button>
          )}
        </div>
      </div>
      {/* Dizer o que falta, e não só desligar o botão: sem isto a pessoa fica
          clicando num botão morto sem saber qual campo está cobrando. */}
      {faltando.length > 0 && step < 5 && (
        <p className={s.faltando}>
          para avançar, preencha: {faltando.map(f => f.label).join(' · ')}
        </p>
      )}
      </div>
    )
  }

  return (
    <div className={s.wrap}>
      <NavBar />

      {/* ── Step 1: Identificação ── */}
      {step === 1 && (
        <section className={s.section}>
          <div className={s.sectionHead}><span className={s.dot} />Identificação</div>
          <div className={s.field}>
            <label className={s.label}>Turma(s) <span className={s.hint}>selecione uma ou mais</span></label>
            <div className={s.pillRow}>
              {turmas.map(t => (
                <button key={t.id} className={`${s.pill} ${selectedTurmas.includes(t.name) ? s.pillOn : ''}`}
                  onClick={() => toggleTurma(t)}>
                  {selectedTurmas.includes(t.name) && <Check size={10} />}{t.name}
                  <span className={s.pillSub}>{t.grade}</span>
                </button>
              ))}
            </div>
          </div>
          <div className={s.idGrid}>
            <div className={s.field}>
              <label className={s.label}>Disciplina</label>
              <Select
                value={fields.disciplina ?? ''}
                placeholder={classId ? 'selecionar…' : 'selecione a turma'}
                options={disciplinas.map(d => ({ value: d.name, label: d.name }))}
                onChange={v => setField('disciplina', v)}
                searchable
                searchPlaceholder="digite para achar…"
              />
            </div>
            <div className={s.field}>
              <label className={s.label}>Bimestre</label>
              <div className={s.chipRow}>
                {['1','2','3','4'].map(b => (
                  <button key={b} className={`${s.chip} ${fields.bimestre === b ? s.chipOn : ''}`}
                    onClick={() => escolherBimestre(b)}>{b}º</button>
                ))}
              </div>
            </div>
            <div className={s.field}>
              <label className={s.label}>Ano letivo</label>
              <Input
                value={fields.ano_letivo ?? ''}
                onChange={e => setField('ano_letivo', e.target.value)}
                className={s.input}
              />
            </div>
            <div className={s.field}>
              <label className={s.label}>Período do bimestre</label>
              <div className={s.periodBox}>
                {fields.bimestre
                  ? `${fields.bimestre}º Bimestre: ${periodoDoBimestre(fields.bimestre)}`
                  : 'Selecione o bimestre'}
              </div>
            </div>
          </div>
          {loadingAulas && <div style={{ padding: '12px 0' }}><SkeletonText lines={2} /></div>}
        </section>
      )}

      {/* ── Step 2: Currículo ── */}
      {step === 2 && (
        <section className={s.section}>
          <div className={s.sectionHead}><span className={s.dot} />Aulas do {fields.bimestre}º Bimestre — {fields.disciplina}
            {aulas.length > 0 && <Chip>{aulas.length} aulas</Chip>}</div>
          {loadingAulas ? <div style={{ padding: '12px 0' }}><SkeletonText lines={2} /></div>
            : aulas.length > 0 ? (
            <div className={s.aulaList}>
              {aulas.map(a => (
                <div key={a.id} className={s.aulaRow}>
                  <span className={s.aulaNum}>Aula {a.aulaNum}</span>
                  <div className={s.aulaInfo}>
                    <p className={s.aulaTitulo}>{a.titulo}</p>
                    {a.conteudo && <p className={s.aulaConteudo}>{a.conteudo}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : <p className={s.empty}>Nenhuma aula encontrada para esta disciplina e bimestre.</p>}
          <Aprendizagens aes={aes} disciplina={fields.disciplina} mostrar={hasId && !loadingAulas} />
        </section>
      )}

      {/* ── Step 3: Objetivos e Conteúdo ── */}
      {step === 3 && (
        <section className={s.section}>
          <div className={s.sectionHead}><span className={s.dot} />Objetivos e Conteúdo</div>
          <div className={s.field}>
            <label className={s.label}>Tema / Título do Guia</label>
            <Input
              placeholder="Ex: Funções Afim e Quadrática"
              value={fields.tema ?? ''}
              onChange={e => setField('tema', e.target.value)}
              className={s.input}
            />
          </div>
          <div className={s.field}>
            <label className={s.label}>Competências gerais (BNCC) <span className={s.hint}>passe o mouse para o descritor</span></label>
            <div className={s.compGrid}>
              {BNCC_COMPETENCIAS.map(comp => {
                const sel = compIds.has(comp.id)
                return (
                  <button key={comp.id} className={`${s.compCard} ${sel ? s.compOn : ''}`} onClick={() => toggleComp(comp.id)} title={comp.descritor}>
                    <span className={s.cardCheck}>{sel && <Check size={9} strokeWidth={3.5} />}</span>
                    <span className={s.compBody}>
                      <span className={s.compNome}><span className={s.compId}>{comp.id}.</span> {comp.nome}</span>
                      <span className={s.compDesc}>{comp.descritor}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className={s.field}>
            <label className={s.label}>Habilidades específicas <span className={s.hint}>clique para incluir/excluir</span></label>
            {habCodes.length > 0 ? (
              <div className={s.habBadges}>
                {habCodes.map(code => {
                  const sel = selHabCodes.has(code)
                  const desc = codeMap.get(code)!.replace(/^\(?[A-Z]{2,4}\d+[A-Z]+\d+\)?\s*/, '')
                  return (
                    <button key={code} className={`${s.habBadge} ${sel ? s.habOn : s.habOff}`} onClick={() => toggleHab(code)} title={desc}>{code}</button>
                  )
                })}
              </div>
            ) : <p className={s.hint}>Selecione turma, disciplina e bimestre para carregar as habilidades automaticamente.</p>}
          </div>
          <div className={s.field}>
            <label className={s.label}>Conteúdos programáticos <span className={s.hint}>preenchido automaticamente</span></label>
            <textarea className={s.textarea} rows={4} value={fields.conteudos ?? ''} placeholder="Conteúdos do bimestre" onChange={e => setField('conteudos', e.target.value)} />
          </div>
          <Aprendizagens aes={aes} disciplina={fields.disciplina} mostrar={hasId && !loadingAulas} />
        </section>
      )}

      {/* ── Step 4: Metodologia e Avaliação ── */}
      {step === 4 && (
        <section className={s.section}>
          <div className={s.sectionHead}><span className={s.dot} />Metodologia e Avaliação</div>
          <div className={s.field}>
            <label className={s.label}>Estratégias didáticas <span className={s.hint}>máx. {MAX_ESTRATEGIAS} ({estrategiaIds.length}/{MAX_ESTRATEGIAS})</span></label>
            <div className={s.tecnicaGrid}>
              {DESENVOLVIMENTO_OPTS.map(m => {
                const sel = estrategiaIds.includes(m.id)
                const disabled = !sel && estrategiaIds.length >= MAX_ESTRATEGIAS
                return <TecnicaBadge key={m.id} item={m} selected={sel} disabled={disabled} onToggle={() => toggleEstrategia(m.id)} />
              })}
            </div>
          </div>
          <div className={s.field}>
            <label className={s.label}>
              Outra estratégia <span className={s.hint}>opcional — sai no documento como observação</span>
            </label>
            <textarea
              className={s.textarea}
              rows={2}
              value={fields.estrategia_outro ?? ''}
              placeholder="Descreva uma estratégia que não esteja no catálogo…"
              onChange={e => definirEstrategiaOutro(e.target.value)}
            />
          </div>
          <div className={s.field}>
            <label className={s.label}>Ajuste(s) por demanda</label>
            <textarea className={s.textarea} rows={3} value={fields.ajustes_demanda ?? ''} placeholder="Registre ajustes por demanda da coordenação..." onChange={e => setField('ajustes_demanda', e.target.value)} />
          </div>
          <div className={s.field}>
            <label className={s.label}>
              Início rápido
              {pacoteSugerido && <span className={s.autoTag}>sugestão baseada na técnica selecionada</span>}
            </label>
            <div className={s.pacoteBtns}>
              {PACOTES_PRONTOS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  className={`${s.pacoteBtn} ${pacoteSugerido === p.id ? s.pacoteBtnSugerido : ''}`}
                  onClick={() => aplicarPacote(p)}
                >
                  {p.label}{pacoteSugerido === p.id ? ' ★' : ''}
                </button>
              ))}
            </div>
          </div>
          <div className={s.field}>
            <label className={s.label}>Recursos e materiais</label>
            <GrupoCheckbox grupos={RECURSOS_GRUPOS} value={fields.recursos ?? RECURSO_OBRIGATORIO} onChange={v => setField('recursos', v)} lockedItems={[RECURSO_OBRIGATORIO]} />
          </div>
          <div className={s.field}>
            <label className={s.label}>Avaliação bimestral</label>
            <GrupoCheckbox grupos={AVALIACAO_GRUPOS} value={fields.avaliacao ?? ''} onChange={v => setField('avaliacao', v)} />
          </div>
        </section>
      )}

      {/* ── Step 5: Composição e Referências ── */}
      {step === 5 && (
        <section className={s.section}>
          <div className={s.sectionHead}><span className={s.dot} />Referências e Composição</div>
          <div className={s.field}>
            <label className={s.label}>Composição de média <span className={s.hint}>selecione um modelo</span></label>
            <div className={s.compModelList}>
              {blocos.map(bloco => {
                const models = COMPOSICAO_MODELS.filter(m => m.bloco === bloco)
                const accent = BLOCO_ACCENT[bloco]
                return (
                  <div key={bloco} className={s.blocoGroup} style={{ borderColor: accent + '40' }}>
                    <div className={s.blocoHead}><span className={s.blocoBar} style={{ background: accent }} /><span className={s.blocoLabel} style={{ color: accent }}>Bloco {bloco} — Prova Paulista {BLOCO_LABELS[bloco]}</span></div>
                    <div className={s.blocoModels}>
                      {models.map(m => {
                        const sel = selectedModel?.id === m.id
                        return (
                          <button key={m.id} className={`${s.modelCard} ${sel ? s.modelOn : ''}`}
                            style={sel ? { borderColor: accent, background: accent + '12' } : undefined}
                            onClick={() => setField('composicao_media', sel ? '' : modelToText(m))}>
                            <p className={s.modelNome}>{m.nome}</p>
                            {m.desc && <p className={s.modelDesc}>{m.desc}</p>}
                            <div className={s.modelItens}>
                              {m.itens.map((it, idx) => (
                                <span key={idx} className={s.modelTag} style={it.nome === 'Prova Paulista' ? { background: accent, color: '#fff' } : undefined}>
                                  {it.pct}% {it.nome === 'Prova Paulista' ? 'PP' : it.nome}
                                </span>
                              ))}
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
          <div className={s.field}>
            <label className={s.label}>Referências bibliográficas</label>
            <textarea className={s.textarea} rows={10} value={fields.referencias ?? ''} onChange={e => setField('referencias', e.target.value)} />
          </div>
        </section>
      )}
    </div>
  )
}
