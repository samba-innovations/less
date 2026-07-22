'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import s from './loading-bar.module.css'

// LoadingBar: barra fina de 2px no topo da main content que aparece durante
// navegação client-side. Feedback global "algo tá carregando" sem bloquear.
// Fica escondida quando não há atividade. Auto-completa quando pathname mudar.

export function LoadingBar() {
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const [active, setActive]     = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Detecta que navegação começou: quando pathname/searchparams mudam
    setActive(true)
    setProgress(0)

    // Progresso simulado com curva ease (chega perto de 90% e "espera")
    let raf = 0
    let start = 0
    function tick(now: number) {
      if (!start) start = now
      const t = Math.min((now - start) / 800, 1)
      const eased = 1 - Math.pow(1 - t, 2)
      setProgress(eased * 0.9)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    // Auto-completa após rendering (100ms padrão) — Next.js já finalizou
    const finish = setTimeout(() => {
      setProgress(1)
      setTimeout(() => setActive(false), 220)
    }, 320)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(finish)
    }
  }, [pathname, searchParams])

  if (!active) return null

  return (
    <div className={s.bar} aria-hidden="true">
      <div className={s.fill} style={{ transform: `scaleX(${progress})` }} />
    </div>
  )
}
