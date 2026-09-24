'use client'

import { Check } from 'lucide-react'
import type { OEMissaoFull } from '@/lib/oe'

/**
 * Missões e habilidades do currículo de Orientação de Estudos.
 *
 * Estava embutido no assistente do plano de aula e travado em
 * `docType === 'OE_PLANO_AULA'`, então o guia de OE abria sem nenhuma menção a
 * missão — na v1 ele mostra. Virou componente para os dois editores usarem o
 * mesmo painel, em vez de existirem duas cópias que divergem com o tempo.
 *
 * É só apresentação: quem busca o currículo e quem grava os campos é o editor.
 */
export type PainelOEProps = {
  missoes: OEMissaoFull[]
  missoesSel: number[]
  habsSel: string[]
  onToggleMissao: (missaoNum: number) => void
  onToggleHab: (codigo: string) => void
  /** Mensagem de quando falta contexto para carregar o currículo. */
  semContexto?: string
  classes: { bloco: string; grupo: string; rotulo: string; aviso: string }
}

const AZUL = '#2563eb'

export function PainelOE({
  missoes, missoesSel, habsSel, onToggleMissao, onToggleHab, semContexto, classes,
}: PainelOEProps) {
  const habsDisponiveis = missoes
    .filter(m => missoesSel.includes(m.missaoNum))
    .flatMap(m => m.habilidades)

  return (
    <div className={classes.bloco}>
      <div className={classes.grupo}>
        <p className={classes.rotulo}>currículo OE — missão/jornada do bimestre</p>
        {semContexto ? (
          <p className={classes.aviso}>{semContexto}</p>
        ) : missoes.length === 0 ? (
          <p className={classes.aviso}>nenhuma missão OE cadastrada para esta turma/bimestre.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {missoes.map(m => {
              const sel = missoesSel.includes(m.missaoNum)
              return (
                <button
                  key={m.id} type="button" onClick={() => onToggleMissao(m.missaoNum)}
                  style={{
                    textAlign: 'left', padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                    border: sel ? `1.5px solid ${AZUL}` : '1px solid var(--border)',
                    background: sel ? 'rgba(37,99,235,0.08)' : 'var(--bg-secondary)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {sel && <Check size={13} color={AZUL} />}
                    <strong style={{ fontSize: '0.8rem' }}>Missão {m.missaoNum}</strong>
                    <span style={{ fontSize: '0.68rem', color: 'var(--fg-secondary)' }}>{m.semanasLabel} · {m.aulasLabel}</span>
                  </span>
                  {m.tema && <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--fg-secondary)', marginTop: 4 }}>{m.tema}</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {habsDisponiveis.length > 0 && (
        <div className={classes.grupo}>
          <p className={classes.rotulo}>habilidades (selecione as trabalhadas)</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {habsDisponiveis.map(h => {
              const sel = habsSel.includes(h.codigo)
              return (
                <button
                  key={h.id} type="button" onClick={() => onToggleHab(h.codigo)} title={h.descricao}
                  style={{
                    padding: '4px 9px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer',
                    border: sel ? `1.5px solid ${AZUL}` : '1px solid var(--border)',
                    background: sel ? 'rgba(37,99,235,0.12)' : 'var(--bg-secondary)',
                    color: sel ? AZUL : 'var(--fg-secondary)',
                  }}
                >
                  {h.bnccCodigo || h.codigo}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
