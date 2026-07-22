'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  value:    number
  duration?: number      // ms — default 600
  format?:   (n: number) => string
  className?: string
}

// AnimatedCounter — anima transição de números com easing. Uso:
// <AnimatedCounter value={studentsCount} />
export function AnimatedCounter({ value, duration = 600, format, className }: Props) {
  const [display, setDisplay] = useState(value)
  const startRef = useRef<number | null>(null)
  const fromRef  = useRef(value)

  useEffect(() => {
    fromRef.current = display
    startRef.current = null
    let raf = 0
    function tick(now: number) {
      if (startRef.current === null) startRef.current = now
      const t = Math.min((now - startRef.current) / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      const current = fromRef.current + (value - fromRef.current) * eased
      setDisplay(current)
      if (t < 1) raf = requestAnimationFrame(tick)
      else       setDisplay(value)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration])

  const rounded = Math.round(display)
  const shown = format ? format(rounded) : rounded.toLocaleString('pt-BR')
  return <span className={className}>{shown}</span>
}
