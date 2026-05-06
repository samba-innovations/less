'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import s from './loader.module.css'

const LOGO  = '/identidade/less-isotipo1.svg'
const COLOR = '#fce375'

export function PageLoader() {
  const [phase, setPhase] = useState<'in' | 'out' | 'gone'>('in')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('out'),  650)
    const t2 = setTimeout(() => setPhase('gone'), 1050)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  if (phase === 'gone') return null

  return (
    <div className={`${s.splash} ${phase === 'out' ? s.splashOut : ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO} alt="logo" className={s.splashLogo} />
      <div className={s.splashBar}>
        <div className={s.splashProgress} style={{ '--loader-color': COLOR } as React.CSSProperties} />
      </div>
    </div>
  )
}

export function NavigationProgress() {
  const pathname  = usePathname()
  const [width, setWidth]     = useState(0)
  const [visible, setVisible] = useState(false)
  const pending   = useRef(false)
  const timer     = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const a = (e.target as Element).closest('a[href]') as HTMLAnchorElement | null
      if (!a) return
      try {
        const url = new URL(a.href, location.href)
        if (url.origin !== location.origin) return
        if (url.pathname === location.pathname) return
      } catch { return }
      pending.current = true
      setVisible(true)
      setWidth(35)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setWidth(75), 300)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  useEffect(() => {
    if (!pending.current) return
    pending.current = false
    if (timer.current) clearTimeout(timer.current)
    setWidth(100)
    timer.current = setTimeout(() => { setVisible(false); setWidth(0) }, 380)
  }, [pathname])

  if (!visible) return null

  return (
    <div
      className={s.navBar}
      style={{ width: `${width}%`, '--loader-color': COLOR } as React.CSSProperties}
    />
  )
}
