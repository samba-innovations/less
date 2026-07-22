'use client'

import { useState, useRef, useEffect } from 'react'
import { Smile } from 'lucide-react'
import s from './message-reactions.module.css'
import { Button } from '../_components/Button'

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '👏', '🙏']

type Reaction = { emoji: string; userId: number }

type Props = {
  messageId:  number
  reactions:  Reaction[]
  meId:       number
  onToggle:   (emoji: string) => void
}

// MessageReactions — mostra reactions agregadas por emoji com count.
// Botão "+" abre picker de emojis rápidos. Click num emoji já existente
// toggla (adiciona/remove a própria reação).
export function MessageReactions({ messageId, reactions, meId, onToggle }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pickerOpen) return
    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setPickerOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [pickerOpen])

  // Agrupa por emoji
  const grouped = new Map<string, { count: number; iReacted: boolean }>()
  for (const r of reactions) {
    const g = grouped.get(r.emoji) ?? { count: 0, iReacted: false }
    g.count++
    if (r.userId === meId) g.iReacted = true
    grouped.set(r.emoji, g)
  }
  const chips = Array.from(grouped.entries())

  function handleClick(emoji: string) {
    onToggle(emoji)
    setPickerOpen(false)
  }

  return (
    <div ref={wrapRef} className={s.wrap}>
      {chips.map(([emoji, { count, iReacted }]) => (
        <button
          key={emoji}
          type="button"
          className={`${s.chip} ${iReacted ? s.chipMine : ''}`}
          onClick={() => handleClick(emoji)}
          title={iReacted ? 'remover minha reação' : 'reagir'}
        >
          <span className={s.chipEmoji}>{emoji}</span>
          <span className={s.chipCount}>{count}</span>
        </button>
      ))}
      <Button
        variant="primary"
        onClick={() => setPickerOpen(v => !v)}
        type="button"
        aria-label="Adicionar reação"
      ><Smile size={12} /></Button>
      {pickerOpen && (
        <div className={s.picker} role="menu">
          {QUICK_EMOJIS.map(e => (
            <Button
              variant="secondary"
              onClick={() => handleClick(e)}
              type="button"
              aria-label={`reagir com ${e}`}
            >{e}</Button>
          ))}
        </div>
      )}
    </div>
  )
}
