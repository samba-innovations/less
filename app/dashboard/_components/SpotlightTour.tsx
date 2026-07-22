'use client'

import { useEffect, useState, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import s from './spotlight-tour.module.css'
import { Button } from '../_components/Button'
import { IconButton } from '../_components/IconButton'

const COLOR = '#b89800'

type Step = {
  target: string
  title: string
  description: string
  side?: 'right' | 'bottom'
}

const STEPS: Step[] = [
  {
    target: '[data-tour="novo"]',
    title: 'Novo documento',
    description: 'Crie documentos pedagógicos normatizados: planos de aula, atas de reunião, relatórios de aluno e fichas de acompanhamento.',
    side: 'right',
  },
  {
    target: '[data-tour="documentos"]',
    title: 'Meus documentos',
    description: 'Acesse, edite e compartilhe os documentos que você criou. Filtre por tipo, data ou status de envio.',
    side: 'right',
  },
  {
    target: '[data-tour="coordenacao"]',
    title: 'Equipe',
    description: 'Visualize e gerencie os documentos de toda a equipe pedagógica. Disponível para coordenadores e diretores.',
    side: 'right',
  },
  {
    target: '[data-tour="dashboard"]',
    title: 'Início',
    description: 'O painel exibe seus documentos recentes e os documentos compartilhados com você pela coordenação.',
    side: 'right',
  },
]

const PAD = 8
const TOOLTIP_W = 272

type SnapRect = { top: number; left: number; width: number; height: number; vw: number; vh: number }
type Props = { active: boolean; onEnd: () => void }

export function SpotlightTour({ active, onEnd }: Props) {
  const [step, setStep] = useState(0)
  const [snap, setSnap] = useState<SnapRect | null>(null)

  const current = STEPS[step]

  const measure = useCallback(() => {
    const el = document.querySelector<HTMLElement>(current.target)
    if (!el) { setSnap(null); return }
    const r = el.getBoundingClientRect()
    setSnap({ top: r.top, left: r.left, width: r.width, height: r.height, vw: window.innerWidth, vh: window.innerHeight })
  }, [current.target])

  useEffect(() => {
    if (!active) { setStep(0); setSnap(null); return }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [active, measure])

  if (!active) return null

  function next() { step < STEPS.length - 1 ? setStep(i => i + 1) : onEnd() }
  function prev() { if (step > 0) setStep(i => i - 1) }

  if (!snap) {
    return (
      <div className={s.root}>
        <div className={s.dimFull} />
        <div className={s.tooltip} style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} key={step}>
          <TooltipContent step={step} current={current} onEnd={onEnd} onNext={next} onPrev={prev} />
        </div>
      </div>
    )
  }

  const { top, left, width, height, vw, vh } = snap
  const hTop    = top - PAD
  const hLeft   = left - PAD
  const hRight  = left + width + PAD
  const hBottom = top + height + PAD

  const side = current.side === 'right' && hRight + 16 + TOOLTIP_W < vw - 8 ? 'right' : 'bottom'
  let tStyle: React.CSSProperties = {}

  if (side === 'right') {
    tStyle = { left: hRight + 16, top: Math.min(Math.max(top + height / 2, 160), vh - 160), transform: 'translateY(-50%)' }
  } else {
    tStyle = { left: Math.min(Math.max(left + width / 2 - TOOLTIP_W / 2, 12), vw - TOOLTIP_W - 12), top: hBottom + 16 }
  }

  return (
    <div className={s.root} role="dialog" aria-modal="true" aria-label="Tour guiado">
      <div className={s.shade} style={{ top: 0, left: 0, right: 0, height: Math.max(0, hTop) }} />
      <div className={s.shade} style={{ top: hBottom, left: 0, right: 0, bottom: 0 }} />
      <div className={s.shade} style={{ top: hTop, left: 0, width: Math.max(0, hLeft), height: hBottom - hTop }} />
      <div className={s.shade} style={{ top: hTop, left: hRight, right: 0, height: hBottom - hTop }} />
      <div
        className={s.ring}
        style={{
          top: hTop, left: hLeft,
          width: width + PAD * 2, height: height + PAD * 2,
          border: `2px solid ${COLOR}`,
          boxShadow: `0 0 0 3px ${COLOR}33, 0 0 28px ${COLOR}88`,
        }}
      />
      <div className={s.tooltip} style={tStyle} key={step}>
        <TooltipContent step={step} current={current} onEnd={onEnd} onNext={next} onPrev={prev} />
      </div>
    </div>
  )
}

function TooltipContent({ step, current, onEnd, onNext, onPrev }: {
  step: number; current: Step; onEnd: () => void; onNext: () => void; onPrev: () => void
}) {
  const isLast = step === STEPS.length - 1
  return (
    <>
      <div className={s.tooltipTop}>
        <span className={s.counter} style={{ color: COLOR, background: `${COLOR}18` }}>
          {step + 1} / {STEPS.length}
        </span>
        <IconButton
          icon={<X size={13} />}
          label="Fechar tour"
          onClick={onEnd}
        />
      </div>
      <h3 className={s.title}>{current.title}</h3>
      <p className={s.desc}>{current.description}</p>
      <div className={s.actions}>
        <Button
          variant="ghost"
          iconLeft={<ChevronLeft size={13} />}
          onClick={onPrev}
          disabled={step === 0}
        >anterior</Button>
        <Button
          variant="primary"
          onClick={onNext}
        >{isLast ? 'concluir' : 'próximo'}
          {!isLast && <ChevronRight size={13} />}</Button>
      </div>
    </>
  )
}
