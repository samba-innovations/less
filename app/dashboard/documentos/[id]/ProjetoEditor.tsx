'use client'

import { useEffect, useRef, useState } from 'react'
import { Upload, Loader2, Sparkles } from 'lucide-react'
import {
  GRANDES_AREAS_PROJ, SUBAREAS_PROJ, LINHAS_PROJ, TIPOS_PROJ, ACOES_PROJ, RECURSOS_PROJ,
  suggestKeywords, currentSemestre,
} from '@/lib/projeto-data'
import { REFERENCIAS_PADRAO } from '@/lib/guia-data'
import s from './projeto.module.css'

type Props = {
  fields:   Record<string, string>
  setField: (key: string, value: string) => void
}

export function ProjetoEditor({ fields, setField }: Props) {
  const refInputRef = useRef<HTMLInputElement>(null)
  const [refUploading, setRefUploading] = useState(false)
  const [refModal, setRefModal] = useState<string | null>(null)

  useEffect(() => {
    if (!fields.periodo)     setField('periodo', currentSemestre())
    if (!fields.referencias) setField('referencias', REFERENCIAS_PADRAO)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedAcoes    = fields.acao     ? fields.acao.split(', ').filter(Boolean)     : []
  const selectedRecursos = fields.recursos ? fields.recursos.split(', ').filter(Boolean) : []
  const subareas = SUBAREAS_PROJ[fields.grande_area ?? ''] ?? []

  function toggle(key: string, current: string[], value: string) {
    const next = current.includes(value) ? current.filter(x => x !== value) : [...current, value]
    setField(key, next.join(', '))
  }

  async function handleRefUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setRefUploading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/upload/text', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok && data.text) setRefModal(data.text)
    } finally {
      setRefUploading(false)
      if (refInputRef.current) refInputRef.current.value = ''
    }
  }

  function handleSuggest() {
    const kws = suggestKeywords(fields)
    if (kws.length > 0) setField('palavras_chave', kws.join('; '))
  }

  return (
    <div className={s.wrap}>
      {/* Ref upload modal */}
      {refModal !== null && (
        <div className={s.modalOverlay} onClick={() => setRefModal(null)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <p className={s.modalTitle}>Importar referências</p>
            <p className={s.modalText}>Foram extraídas {refModal.split('\n').filter(Boolean).length} linhas. Deseja substituir as referências atuais ou adicionar ao final?</p>
            <div className={s.modalActions}>
              <button className={s.modalCancel} onClick={() => setRefModal(null)}>Cancelar</button>
              <button className={s.modalSecondary} onClick={() => { setField('referencias', (fields.referencias ?? '').trimEnd() + '\n' + refModal); setRefModal(null) }}>Adicionar</button>
              <button className={s.modalPrimary} onClick={() => { setField('referencias', refModal); setRefModal(null) }}>Substituir</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Classificação ── */}
      <section className={s.section}>
        <div className={s.sectionHead}><span className={s.dot} />Classificação do Projeto</div>

        <div className={s.field}>
          <label className={s.label}>Tipo do projeto</label>
          <div className={s.chipRow}>
            {TIPOS_PROJ.map(t => (
              <button key={t} className={`${s.chip} ${fields.tipo_projeto === t ? s.chipOn : ''}`} onClick={() => setField('tipo_projeto', t)}>{t}</button>
            ))}
          </div>
        </div>

        <div className={s.field}>
          <label className={s.label}>Grande área <span className={s.hint}>classificação CAPES / CNPq</span></label>
          <div className={s.areaGrid}>
            {GRANDES_AREAS_PROJ.map(a => (
              <button key={a} className={`${s.areaCard} ${fields.grande_area === a ? s.areaOn : ''}`}
                onClick={() => { setField('grande_area', a); setField('subarea', '') }}>{a}</button>
            ))}
          </div>
        </div>

        {subareas.length > 0 && (
          <div className={s.field}>
            <label className={s.label}>Subárea</label>
            <div className={s.chipRow}>
              {subareas.map(sub => (
                <button key={sub} className={`${s.chip} ${fields.subarea === sub ? s.chipOn : ''}`} onClick={() => setField('subarea', sub)}>{sub}</button>
              ))}
            </div>
          </div>
        )}

        <div className={s.field}>
          <label className={s.label}>Linha de aplicação <span className={s.hint}>natureza metodológica</span></label>
          <div className={s.linhaGrid}>
            {LINHAS_PROJ.map(l => (
              <button key={l.value} className={`${s.linhaCard} ${fields.linha_aplicacao === l.value ? s.linhaOn : ''}`} onClick={() => setField('linha_aplicacao', l.value)}>
                <span className={s.linhaDot} />
                <span className={s.linhaBody}><span className={s.linhaNome}>{l.value}</span><span className={s.linhaDesc}>{l.desc}</span></span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Estrutura ── */}
      <section className={s.section}>
        <div className={s.sectionHead}><span className={s.dot} />Estrutura do Projeto</div>
        <div className={s.field}>
          <label className={s.label}>Título do projeto</label>
          <input className={s.input} value={fields.titulo ?? ''} placeholder="Ex: Análise da qualidade da água do ribeirão Bauru" onChange={e => setField('titulo', e.target.value)} />
        </div>
        <div className={s.field}>
          <label className={s.label}>Tema / Subtítulo</label>
          <input className={s.input} value={fields.tema_sugerido ?? ''} placeholder="Ex: Recursos hídricos, saneamento e saúde pública" onChange={e => setField('tema_sugerido', e.target.value)} />
        </div>
        <div className={s.field}>
          <label className={s.label}>Período de referência</label>
          <input className={s.input} value={fields.periodo ?? ''} onChange={e => setField('periodo', e.target.value)} />
        </div>
        <div className={s.field}>
          <label className={s.label}>Ação central <span className={s.hint}>verbo que define o projeto</span></label>
          <div className={s.chipRow}>
            {ACOES_PROJ.map(a => (
              <button key={a} className={`${s.chip} ${selectedAcoes.includes(a) ? s.chipOn : ''}`} onClick={() => toggle('acao', selectedAcoes, a)}>{a}</button>
            ))}
          </div>
        </div>
        <div className={s.field}>
          <label className={s.label}>Recursos previstos</label>
          <div className={s.chipRow}>
            {RECURSOS_PROJ.map(r => (
              <button key={r} className={`${s.chip} ${selectedRecursos.includes(r) ? s.chipOn : ''}`} onClick={() => toggle('recursos', selectedRecursos, r)}>{r}</button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Conteúdo Científico ── */}
      <section className={s.section}>
        <div className={s.sectionHead}><span className={s.dot} />Conteúdo Científico</div>
        {([
          { k: 'problema',              label: 'Problema de pesquisa',     hint: 'qual lacuna este projeto responde?', rows: 4 },
          { k: 'justificativa',         label: 'Justificativa',            hint: 'relevância social, científica ou educacional', rows: 4 },
          { k: 'objetivo_geral',        label: 'Objetivo geral',           hint: 'comece com verbo no infinitivo', rows: 2 },
          { k: 'objetivos_especificos', label: 'Objetivos específicos',    hint: '3 a 5 etapas, uma por linha', rows: 5 },
          { k: 'metodologia',           label: 'Metodologia',              hint: 'tipo de pesquisa, coleta, instrumentos', rows: 5 },
          { k: 'resultados',            label: 'Resultados esperados',     hint: 'relatório, protótipo, mapa, artigo…', rows: 3 },
          { k: 'impacto',               label: 'Impacto esperado',         hint: 'específico — evite generalizações', rows: 3 },
          { k: 'resumo',                label: 'Resumo (Abstract)',        hint: '150 a 250 palavras', rows: 6 },
        ] as const).map(f => (
          <div key={f.k} className={s.field}>
            <label className={s.label}>{f.label} <span className={s.hint}>{f.hint}</span></label>
            <textarea className={s.textarea} rows={f.rows} value={fields[f.k] ?? ''} onChange={e => setField(f.k, e.target.value)} />
          </div>
        ))}

        <div className={s.field}>
          <label className={s.label}>Palavras-chave <span className={s.hint}>3 a 5 termos, separados por ponto e vírgula</span></label>
          <div className={s.kwRow}>
            <input className={s.input} value={fields.palavras_chave ?? ''} placeholder="Ex: recursos hídricos; qualidade da água; saneamento" onChange={e => setField('palavras_chave', e.target.value)} />
            <button className={s.suggestBtn} onClick={handleSuggest}><Sparkles size={13} /> Sugerir</button>
          </div>
        </div>

        <div className={s.field}>
          <label className={s.label}>Referências <span className={s.hint}>ABNT NBR 6023 — uma por linha</span></label>
          <textarea className={s.textarea} rows={7} value={fields.referencias ?? ''} onChange={e => setField('referencias', e.target.value)} />
          <div className={s.uploadRow}>
            <input ref={refInputRef} type="file" accept=".txt,.docx" className={s.hiddenInput} onChange={handleRefUpload} />
            <button className={s.uploadBtn} disabled={refUploading} onClick={() => refInputRef.current?.click()}>
              {refUploading ? <Loader2 size={11} className={s.spin} /> : <Upload size={11} />} Importar (.txt / .docx)
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
