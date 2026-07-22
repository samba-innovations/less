'use client'

import { useState, useRef, type ReactNode } from 'react'
import { GripVertical } from 'lucide-react'
import s from './sortable-list.module.css'

type Props<T extends { id: string | number }> = {
  items:     T[]
  onReorder: (nextItems: T[]) => void
  renderItem: (item: T, dragHandle: ReactNode) => ReactNode
  className?: string
}

// SortableList — drag-drop reorder de items usando HTML5 nativo.
// Sem dep externa. Cada item precisa ter `id`. Grip handle é renderizado
// via prop `dragHandle` no renderItem — user aponta onde grabar.
//
// Uso:
//   <SortableList
//     items={disciplinas}
//     onReorder={next => setDisciplinas(next)}
//     renderItem={(item, handle) => <div>{handle} <span>{item.name}</span></div>}
//   />
export function SortableList<T extends { id: string | number }>({
  items, onReorder, renderItem, className,
}: Props<T>) {
  const [dragIdx, setDragIdx]   = useState<number | null>(null)
  const [overIdx, setOverIdx]   = useState<number | null>(null)
  const containerRef            = useRef<HTMLDivElement>(null)

  function onDragStart(idx: number) {
    return (e: React.DragEvent) => {
      setDragIdx(idx)
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', String(idx))
    }
  }

  function onDragOver(idx: number) {
    return (e: React.DragEvent) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      if (overIdx !== idx) setOverIdx(idx)
    }
  }

  function onDragEnd() {
    setDragIdx(null)
    setOverIdx(null)
  }

  function onDrop(dropIdx: number) {
    return (e: React.DragEvent) => {
      e.preventDefault()
      if (dragIdx === null || dragIdx === dropIdx) { onDragEnd(); return }
      const next = [...items]
      const [moved] = next.splice(dragIdx, 1)
      next.splice(dropIdx, 0, moved)
      onReorder(next)
      onDragEnd()
    }
  }

  return (
    <div ref={containerRef} className={`${s.list} ${className ?? ''}`}>
      {items.map((item, idx) => {
        const isDrag = dragIdx === idx
        const isOver = overIdx === idx && dragIdx !== idx
        return (
          <div
            key={item.id}
            className={`${s.itemWrap} ${isDrag ? s.dragging : ''} ${isOver ? s.dropTarget : ''}`}
            draggable
            onDragStart={onDragStart(idx)}
            onDragOver={onDragOver(idx)}
            onDragEnd={onDragEnd}
            onDrop={onDrop(idx)}
          >
            {renderItem(item, (
              <span className={s.handle} aria-label="mover">
                <GripVertical size={14}/>
              </span>
            ))}
          </div>
        )
      })}
    </div>
  )
}
