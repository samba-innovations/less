'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { CheckCircle2, RotateCcw, X } from 'lucide-react'
import s from './undo-toast.module.css'
import { Button } from '../_components/Button'

type Props = {
  open:     boolean
  message:  string
  duration?: number      // ms — default 5000
  onUndo:   () => void
  onDismiss: () => void  // chamado quando timer expira ou X clicado
}

// UndoToast — mostrado quando ação destrutiva/reversível é executada.
// Padrão: user apagou item → item some da UI → toast "removido [DESFAZER]" (5s)
// Se clicar UNDO antes de 5s, chama onUndo e some. Se não, chama onDismiss.
export function UndoToast({ open, message, duration = 5000, onUndo, onDismiss }: Props) {
  const [exiting, setExiting] = useState(false)
  const [progress, setProgress] = useState(0)
  const pausedRef = useRef(false)
  const elapsedRef = useRef(0)
  const lastFrameRef = useRef(0)

  useEffect(() => {
    if (!open) { setExiting(false); elapsedRef.current = 0; lastFrameRef.current = 0; setProgress(0); return }
    let raf = 0
    function tick(now: number) {
      if (!lastFrameRef.current) lastFrameRef.current = now
      const dt = now - lastFrameRef.current
      lastFrameRef.current = now
      if (!pausedRef.current) {
        elapsedRef.current += dt
        setProgress(Math.min(1, elapsedRef.current / duration))
        if (elapsedRef.current >= duration) {
          setExiting(true)
          setTimeout(onDismiss, 220)
          return
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [open, duration, onDismiss])

  const handleUndo = useCallback(() => {
    setExiting(true)
    setTimeout(() => { onUndo(); onDismiss() }, 180)
  }, [onUndo, onDismiss])

  if (!open) return null

  return (
    <div
      className={`${s.toast} ${exiting ? s.exiting : ''}`}
      role="status"
      onMouseEnter={() => { pausedRef.current = true }}
      onMouseLeave={() => { pausedRef.current = false }}
    >
      <div className={s.iconWrap}>
        <CheckCircle2 size={15} />
      </div>
      <span className={s.message}>{message}</span>
      <Button
        variant="ghost"
        iconLeft={<RotateCcw size={12} />}
        onClick={handleUndo}
      >desfazer</Button>
      <button className={s.close} onClick={() => { setExiting(true); setTimeout(onDismiss, 180) }} aria-label="Dispensar">
        <X size={11} />
      </button>
      <div className={s.progress}>
        <div className={s.progressFill} style={{ transform: `scaleX(${1 - progress})` }} />
      </div>
    </div>
  )
}
