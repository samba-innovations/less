'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Compass, ChevronDown, BookOpen, ClipboardList, ArrowRight, Target, Info } from 'lucide-react'
import s from './oe.module.css'
import { Select } from '../_components/Select'

type OEDisciplina = {
  id: number
  name: string
  aulasNome: string | null
}

type Missao = {
  id: number
  missaoNum: number
  bimestre: number
  tema: string | null
  semanasLabel: string
  aulasLabel: string
  totalAulas: number
  saebDescritores: string | null
  objetivosAprendizagem: string | null
}

type Props = {
  disciplinasOE: OEDisciplina[]
  role: string
  isAdmin: boolean
}

const BIMESTRES = [1, 2, 3, 4]

export function OEClient({ disciplinasOE, role, isAdmin }: Props) {
  const router = useRouter()
  const [selectedDisc, setSelectedDisc]   = useState<OEDisciplina | null>(disciplinasOE[0] ?? null)
  const [selectedBim,  setSelectedBim]    = useState<number>(1)
  const [missoes,      setMissoes]        = useState<Missao[]>([])
  const [loading,      setLoading]        = useState(false)
  const [loaded,       setLoaded]         = useState(false)
  const [creating,     setCreating]       = useState(false)

  async function createOEDoc(type: 'OE_PLANO_AULA' | 'OE_GUIA_APRENDIZAGEM') {
    const title = selectedDisc
      ? `OE — ${selectedDisc.name} — ${selectedBim}º Bimestre`
      : `OE — ${selectedBim}º Bimestre`
    setCreating(true)
    try {
      const res = await fetch('/api/documentos', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          type, title,
          content: {
            disciplina: selectedDisc?.name ?? '',
            bimestre:   String(selectedBim),
            periodo:    type === 'OE_GUIA_APRENDIZAGEM' ? 'bimestral' : 'por_aula',
          },
        }),
      })
      const data = await res.json()
      if (res.ok && data.id) router.push(`/dashboard/documentos/${data.id}`)
    } finally { setCreating(false) }
  }

  async function loadMissoes(disc: OEDisciplina, bim: number) {
    if (!disc) return
    setLoading(true); setLoaded(false)
    try {
      const aulasNome = disc.aulasNome ?? disc.name
      const ciclo     = 'medio'  // default; could be inferred from grade
      const serie     = '1'      // default

      const params = new URLSearchParams({
        disciplinaTipo: aulasNome,
        ciclo,
        serie,
        bimestre: String(bim),
      })

      const res = await fetch(`/api/less/oe-missoes?${params}`)
      if (res.ok) {
        const data: Missao[] = await res.json()
        setMissoes(data)
      } else {
        setMissoes([])
      }
    } finally {
      setLoading(false); setLoaded(true)
    }
  }

  function handleDiscChange(disc: OEDisciplina) {
    setSelectedDisc(disc)
    setMissoes([]); setLoaded(false)
  }

  function handleBimChange(bim: number) {
    setSelectedBim(bim)
    setMissoes([]); setLoaded(false)
  }

  function buildNewDocUrl(type: 'OE_PLANO_AULA' | 'OE_GUIA_APRENDIZAGEM') {
    const title = selectedDisc
      ? `OE — ${selectedDisc.name} — ${selectedBim}º Bimestre`
      : `OE — ${selectedBim}º Bimestre`
    return `/dashboard/documentos/novo?type=${type}&title=${encodeURIComponent(title)}`
  }

  const canProduce = ['TEACHER', 'TEACHER_COORDINATOR', 'COORDINATOR'].includes(role) || isAdmin

  return (
    <div className={s.page}>

      <div className={s.pageHeader}>
        <div className={s.pageHeaderIcon}><Compass size={18} /></div>
        <div>
          <h1 className={s.pageTitle}>Orientação de Estudos</h1>
          <p className={s.pageSub}>Produza planos e guias de OE vinculados ao currículo</p>
        </div>
      </div>

      {disciplinasOE.length === 0 ? (
        <div className={s.empty}>
          <Compass size={40} className={s.emptyIcon} />
          <p className={s.emptyTitle}>Nenhuma disciplina OE atribuída</p>
          <p className={s.emptySub}>Para produzir documentos OE, você precisa ter uma disciplina do tipo OE atribuída à sua turma. Entre em contato com a coordenação.</p>
        </div>
      ) : (
        <div className={s.body}>

          {/* Seleção de disciplina + bimestre */}
          <div className={s.selectorRow}>
            <div className={s.selectorGroup}>
              <p className={s.selectorLabel}>Disciplina OE</p>
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

            <div className={s.selectorGroup}>
              <p className={s.selectorLabel}>Bimestre</p>
              <div className={s.bimRow}>
                {BIMESTRES.map(b => (
                  <button
                    key={b}
                    className={`${s.bimBtn} ${selectedBim === b ? s.bimBtnActive : ''}`}
                    onClick={() => handleBimChange(b)}
                  >
                    {b}º
                  </button>
                ))}
              </div>
            </div>

            <button className={s.loadBtn} onClick={() => selectedDisc && loadMissoes(selectedDisc, selectedBim)}>
              {loading ? <span className={s.spinner} /> : <Target size={14} />}
              {loading ? 'Carregando…' : 'Buscar missões'}
            </button>
          </div>

          {/* Criar documentos OE */}
          {canProduce && (
            <div className={s.createSection}>
              <p className={s.createLabel}>Criar documento OE</p>
              <div className={s.createBtns}>
                <button className={s.createBtn} disabled={creating} onClick={() => createOEDoc('OE_PLANO_AULA')}>
                  <div className={s.createBtnIcon} style={{ background: '#7c3aed18', color: '#7c3aed' }}>
                    <ClipboardList size={16} />
                  </div>
                  <div>
                    <p className={s.createBtnTitle}>Plano de Aula OE</p>
                    <p className={s.createBtnSub}>Por aula, semanal, quinzenal ou bimestral</p>
                  </div>
                  <ArrowRight size={14} className={s.createBtnArrow} />
                </button>
                <button className={s.createBtn} disabled={creating} onClick={() => createOEDoc('OE_GUIA_APRENDIZAGEM')}>
                  <div className={s.createBtnIcon} style={{ background: '#0891b218', color: '#0891b2' }}>
                    <BookOpen size={16} />
                  </div>
                  <div>
                    <p className={s.createBtnTitle}>Guia de Aprendizagem OE</p>
                    <p className={s.createBtnSub}>Guia bimestral completo do período</p>
                  </div>
                  <ArrowRight size={14} className={s.createBtnArrow} />
                </button>
              </div>
            </div>
          )}

          {/* Missões do currículo */}
          {loaded && (
            <div className={s.missoesSection}>
              <p className={s.missoesTitle}>
                {missoes.length > 0
                  ? `${missoes.length} missão${missoes.length !== 1 ? 'ões' : ''} — ${selectedBim}º Bimestre`
                  : `Nenhuma missão cadastrada para este período`
                }
              </p>

              {missoes.length === 0 ? (
                <div className={s.noMissoes}>
                  <Info size={14} />
                  O currículo OE para esta disciplina e bimestre ainda não foi importado.
                  Os documentos OE podem ser criados usando os planos regulares acima.
                </div>
              ) : (
                <div className={s.missoesList}>
                  {missoes.map(m => (
                    <div key={m.id} className={s.missaoCard}>
                      <div className={s.missaoHeader}>
                        <span className={s.missaoNum}>Missão {m.missaoNum}</span>
                        <span className={s.missaoBim}>{m.bimestre}º Bimestre</span>
                        <span className={s.missaoSemanas}>{m.semanasLabel}</span>
                        <span className={s.missaoAulas}>{m.aulasLabel}</span>
                      </div>
                      {m.tema && <p className={s.missaoTema}>{m.tema}</p>}
                      {m.saebDescritores && (
                        <p className={s.missaoDescritores}>
                          <strong>Descritores SAEB:</strong> {m.saebDescritores}
                        </p>
                      )}
                      {m.objetivosAprendizagem && (
                        <p className={s.missaoObjetivos}>{m.objetivosAprendizagem}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
