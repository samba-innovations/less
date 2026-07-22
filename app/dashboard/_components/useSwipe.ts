'use client'

import { useEffect, useRef } from 'react'

// useSwipe — detecta swipe touch em um elemento (mobile).
// Chama onSwipe com a direção quando threshold é atingido.
//
// Uso:
//   const ref = useSwipe<HTMLDivElement>({ onSwipe: (dir) => dir === 'left' && close() })
//   return <div ref={ref}>...</div>

type Direction = 'left' | 'right' | 'up' | 'down'

type Options = {
  threshold?: number  // px — default 50
  onSwipe:    (direction: Direction, distance: number) => void
}

export function useSwipe<T extends HTMLElement = HTMLDivElement>({ threshold = 50, onSwipe }: Options) {
  const ref = useRef<T | null>(null)
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    function onStart(e: TouchEvent) {
      const t = e.touches[0]
      startRef.current = { x: t.clientX, y: t.clientY, t: Date.now() }
    }
    function onEnd(e: TouchEvent) {
      const start = startRef.current
      if (!start) return
      startRef.current = null
      const t = e.changedTouches[0]
      const dx = t.clientX - start.x
      const dy = t.clientY - start.y
      const dt = Date.now() - start.t
      if (dt > 600) return
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)
      if (absDx > absDy && absDx >= threshold) {
        onSwipe(dx > 0 ? 'right' : 'left', absDx)
      } else if (absDy > absDx && absDy >= threshold) {
        onSwipe(dy > 0 ? 'down' : 'up', absDy)
      }
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchend', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchend', onEnd)
    }
  }, [threshold, onSwipe])

  return ref
}
