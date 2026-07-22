'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

// useVirtualList — virtualização simples pra listas grandes (>200 items).
// Renderiza só os items visíveis + buffer. Retorna { containerProps, spacerProps,
// visibleItems, startIndex, endIndex } pra você usar diretamente no JSX.
//
// Uso:
//   const { containerRef, visibleItems, spacerTop, spacerBottom } = useVirtualList({
//     items: alunos,
//     itemHeight: 56,
//     overscan: 5,
//   })

type Options<T> = {
  items:      T[]
  itemHeight: number
  overscan?:  number     // rows extra pra pré-renderizar (default 5)
}

export function useVirtualList<T>({ items, itemHeight, overscan = 5 }: Options<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [range, setRange] = useState({ start: 0, end: Math.min(20, items.length) })

  const updateRange = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const scrollTop = el.scrollTop
    const viewportH = el.clientHeight
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const end   = Math.min(items.length, Math.ceil((scrollTop + viewportH) / itemHeight) + overscan)
    setRange(prev => (prev.start === start && prev.end === end) ? prev : { start, end })
  }, [itemHeight, overscan, items.length])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    updateRange()
    el.addEventListener('scroll', updateRange, { passive: true })
    const ro = new ResizeObserver(updateRange)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', updateRange)
      ro.disconnect()
    }
  }, [updateRange])

  const visibleItems = items.slice(range.start, range.end)
  const spacerTop    = range.start * itemHeight
  const spacerBottom = (items.length - range.end) * itemHeight

  return {
    containerRef,
    visibleItems,
    startIndex: range.start,
    endIndex:   range.end,
    spacerTop,
    spacerBottom,
    totalHeight: items.length * itemHeight,
  }
}
