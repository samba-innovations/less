'use client'

import { useEffect, useState } from 'react'
import { Smartphone, X } from 'lucide-react'
import s from './pwa-install-banner.module.css'

// Chrome/Edge dispatcham 'beforeinstallprompt'; iOS não. Mostramos banner
// discreto após 2 visitas se ainda não instalou. User pode dispensar.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BeforeInstallPromptEvent = any

const VISIT_KEY = 'samba-pwa-visits'
const DISMISS_KEY = 'samba-pwa-dismissed'
const MIN_VISITS = 2

export function PWAInstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow]     = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Incrementa contador de visitas
    const visits = Number(localStorage.getItem(VISIT_KEY) ?? '0') + 1
    localStorage.setItem(VISIT_KEY, String(visits))

    // Se já dispensou nas últimas 30d, não mostra
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? '0')
    if (Date.now() - dismissedAt < 30 * 86400000) return

    // Se já rodando como PWA, não mostra
    if (window.matchMedia?.('(display-mode: standalone)').matches) return

    function onPrompt(e: Event) {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
      if (visits >= MIN_VISITS) setShow(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  async function install() {
    if (!prompt) return
    prompt.prompt()
    await prompt.userChoice
    setShow(false)
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
  }

  function dismiss() {
    setShow(false)
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
  }

  if (!show) return null

  return (
    <div className={s.banner} role="dialog" aria-label="instalar como app">
      <div className={s.icon}><Smartphone size={18}/></div>
      <div className={s.text}>
        <span className={s.title}>instalar como app?</span>
        <span className={s.sub}>acesso rápido pelo ícone, sem chrome de browser.</span>
      </div>
      <div className={s.actions}>
        <button onClick={dismiss} className={s.later}>agora não</button>
        <button onClick={install} className={s.install}>instalar</button>
      </div>
      <button onClick={dismiss} className={s.close} aria-label="Fechar"><X size={12}/></button>
    </div>
  )
}
