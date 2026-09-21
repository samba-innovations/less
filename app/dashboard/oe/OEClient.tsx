'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Compass, BookOpen, ClipboardList, ArrowRight, Target, Info } from 'lucide-react'
import s from './oe.module.css'
import { PageHeader } from '../_components/PageHeader'
import { Select } from '../_components/Select'
import { Button } from '../_components/Button'
import { getOEMissoesForClass, type OEMissaoFull } from './actions'

type Turma = { id: number; name: string; gradeName: string }
type OEDisciplina = {
  id: number
  name: string
  aulasNome: string | null
  turmas: Turma[]
}

type Props = {
  disciplinasOE: OEDisciplina[]
  role: string
  isAdmin: boolean
}

const BIMESTRES = [1, 2, 3, 4]

export function OEClient({ disciplinasOE, role, isAdmin }: Props) {
  const router = useRouter()
  const [selectedDisc,  setSelectedDisc]  = useState<OEDisciplina | null>(disciplinasOE[0] ?? null)
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(disciplinasOE[0]?.turmas[0] ?? null)
  const [selectedBim,   setSelectedBim]   = useState<number>(1)
  const [missoes,       setMissoes]       = useState<OEMissaoFull[]>([])
  const [loading,       setLoading]       = useState(false)
  const [loaded,        setLoaded]        = useState(false)
  const [aviso,         setAviso]         = useState<string | null>(null)
  const [creating,      setCreating]      = useState(false)

  async function createOEDoc(type: 'OE_PLANO_AULA' | 'OE_GUIA_APRENDIZAGEM') {
    const title = selectedDisc
      ? `OE — ${selectedDisc.name} — ${selectedBim}º Bimestre`
      : `OE — ${selectedBim}º Bimestre`
    setCreating(true)
    try {
      const res = await fetch('/api/documentos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type, title,
          content: {
            disciplina: selectedDisc?.name ?? '',
            bimestre:   String(selectedBim),
            periodo:    type === 'OE_GUIA_APRENDIZAGEM' ? 'bimestral' : 'por_aula',
            // Amarra o documento à turma → o editor sabe a série e carrega o
            // currículo OE certo (regra dos livros). Ver actions.getOEMissoesForClass.
            classId:   selectedTurma?.id ?? null,
            turma:     selectedTurma?.name ?? '',
          },
        }),
      })
      const data = await res.json()
      if (res.ok && data.id) router.push(`/dashboard/documentos/${data.id}`)
    } finally { setCreating(false) }
  }

  async function loadMissoes() {
    if (!selectedDisc || !selectedTurma) return
    setLoading(true); setLoaded(false); setAviso(null)
    try {
      const disciplinaTipo = selectedDisc.aulasNome ?? selectedDisc.name
      const r = await getOEMissoesForClass(selectedTurma.id, disciplinaTipo, selectedBim)
      if (r.error) { setMissoes([]); setAviso(r.error) }
      else setMissoes(r.missoes ?? [])
    } catch {
      setMissoes([]); setAviso('Falha ao carregar o currículo OE.')
    } finally { setLoading(false); setLoaded(true) }
  }

  function handleDiscChange(disc: OEDisciplina) {
    setSelectedDisc(disc)
    setSelectedTurma(disc.turmas[0] ?? null)
    setMissoes([]); setLoaded(false)
  }
  function handleTurmaChange(t: Turma | null) { setSelectedTurma(t); setMissoes([]); setLoaded(false) }
  function handleBimChange(bim: number)       { setSelectedBim(bim); setMissoes([]); setLoaded(false) }

  const canProduce = ['TEACHER', 'TEACHER_COORDINATOR', 'COORDINATOR'].includes(role) || isAdmin

  return (
    <div className={s.page}>
      <PageHeader
        title="orientação de estudos"
        subtitle="produza planos e guias de OE vinculados ao currículo"
      />

      {disciplinasOE.length === 0 ? (
        <div className={s.empty}>
          <Compass size={36} strokeWidth={1.2} />
          <p><strong>nenhuma disciplina OE atribuída.</strong> para produzir documentos OE, você precisa ter uma disciplina do tipo OE atribuída à sua turma. entre em contato com a coordenação.</p>
        </div>
      ) : (
        <div className={s.grid}>
          {/* ── Coluna esquerda: config + criar ── */}
          <div className={s.gridLeft}>
            <div className={s.card}>
              <span className={s.cardLabel}>disciplina OE</span>
              <Select
                value={selectedDisc ? String(selectedDisc.id) : ''}
                onChange={v => {
                  const d = disciplinasOE.find(d => d.id === Number(v))
                  if (d) handleDiscChange(d)
                }}
                options={disciplinasOE.map(d => ({ value: String(d.id), label: d.name }))}
                placeholder="selecionar disciplina…"
              />
            </div>

            <div className={s.card}>
              <span className={s.cardLabel}>turma</span>
              <Select
                value={selectedTurma ? String(selectedTurma.id) : ''}
                onChange={v => handleTurmaChange(selectedDisc?.turmas.find(t => t.id === Number(v)) ?? null)}
                options={(selectedDisc?.turmas ?? []).map(t => ({ value: String(t.id), label: `${t.gradeName} ${t.name}` }))}
                placeholder="selecionar turma…"
              />
            </div>

            <div className={s.card}>
              <span className={s.cardLabel}>bimestre</span>
              <div className={s.bimRow}>
                {BIMESTRES.map(b => (
                  <button
                    key={b}
                    type="button"
                    className={`${s.bimBtn} ${selectedBim === b ? s.bimBtnActive : ''}`}
                    onClick={() => handleBimChange(b)}
                  >{b}º</button>
                ))}
              </div>
            </div>

            <Button
              variant="secondary"
              iconLeft={loading ? <div className={s.spinner} /> : <Target size={13} />}
              onClick={loadMissoes}
              disabled={loading || !selectedDisc || !selectedTurma}
              className={s.loadBtn}
            >
              {loading ? 'carregando…' : 'buscar missões do currículo'}
            </Button>

            {canProduce && (
              <div className={s.card}>
                <span className={s.cardLabel}>criar documento OE</span>
                <div className={s.createBtns}>
                  <button
                    type="button"
                    className={s.createBtn}
                    disabled={creating}
                    onClick={() => createOEDoc('OE_PLANO_AULA')}
                  >
                    <span className={`${s.createIcon} ${s.iconPlano}`}>
                      <ClipboardList size={15} />
                    </span>
                    <span className={s.createTxt}>
                      <span className={s.createTitle}>plano de aula OE</span>
                      <span className={s.createSub}>por aula, semanal, quinzenal ou bimestral</span>
                    </span>
                    <ArrowRight size={14} className={s.createArrow} />
                  </button>
                  <button
                    type="button"
                    className={s.createBtn}
                    disabled={creating}
                    onClick={() => createOEDoc('OE_GUIA_APRENDIZAGEM')}
                  >
                    <span className={`${s.createIcon} ${s.iconGuia}`}>
                      <BookOpen size={15} />
                    </span>
                    <span className={s.createTxt}>
                      <span className={s.createTitle}>guia de aprendizagem OE</span>
                      <span className={s.createSub}>guia bimestral completo do período</span>
                    </span>
                    <ArrowRight size={14} className={s.createArrow} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Coluna direita: missões ── */}
          <div className={s.gridRight}>
            {!loaded && !loading && (
              <div className={s.empty}>
                <Compass size={36} strokeWidth={1.2} />
                <p>selecione disciplina, turma e bimestre à esquerda e clique em <strong>buscar missões</strong> para carregar o currículo OE.</p>
              </div>
            )}

            {loaded && (
              <>
                <div className={s.sectionHead}>
                  <span className={s.sectionTitle}>
                    {missoes.length > 0
                      ? `${missoes.length} miss${missoes.length !== 1 ? 'ões' : 'ão'} · ${selectedBim}º bimestre`
                      : `nenhuma missão cadastrada para este período`}
                  </span>
                </div>

                {missoes.length === 0 ? (
                  <div className={s.noMissoes}>
                    <Info size={14} />
                    <span>{aviso ?? 'o currículo OE para esta disciplina/turma e bimestre ainda não foi importado. os documentos OE podem ser criados usando os planos regulares ao lado.'}</span>
                  </div>
                ) : (
                  <div className={s.missoesList}>
                    {missoes.map(m => (
                      <div key={m.id} className={s.missaoCard}>
                        <div className={s.missaoHead}>
                          <span className={s.missaoNum}>missão {m.missaoNum}</span>
                          <span className={s.missaoDot}>·</span>
                          <span className={s.missaoMeta}>{m.semanasLabel}</span>
                          <span className={s.missaoDot}>·</span>
                          <span className={s.missaoMeta}>{m.aulasLabel}</span>
                        </div>
                        {m.tema && <p className={s.missaoTema}>{m.tema}</p>}
                        {m.saebDescritores && (
                          <p className={s.missaoDescritores}>
                            <span className={s.missaoLabel}>descritores SAEB</span>
                            {m.saebDescritores}
                          </p>
                        )}
                        {m.objetivosAprendizagem && (
                          <p className={s.missaoObjetivos}>{m.objetivosAprendizagem}</p>
                        )}
                        {m.habilidades.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                            {m.habilidades.map(h => (
                              <span
                                key={h.id}
                                title={h.descricao}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  padding: '3px 8px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700,
                                  border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                                  color: 'var(--fg-secondary)',
                                }}
                              >
                                {h.bnccCodigo || h.codigo}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
