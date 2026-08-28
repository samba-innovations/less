'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import s from './pwa-bootstrap.module.css'

type BIPEvent = Event & {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'samba-pwa-install-dismissed'
const REPROMPT_DAYS = 21

export function PwaBootstrap() {
  const [prompt, setPrompt] = useState<BIPEvent | null>(null)
  const [visible, setVis]   = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost'
    if (!isSecure) return
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .catch(err => console.warn('[pwa] SW register falhou:', err))
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error — Safari legacy
      window.navigator.standalone === true
    if (isStandalone) return
    try {
      const raw = localStorage.getItem(DISMISSED_KEY)
      if (raw) {
        const at = Number(raw)
        if (Date.now() - at < REPROMPT_DAYS * 24 * 60 * 60 * 1000) return
      }
    } catch {}
    function onBIP(e: Event) {
      e.preventDefault()
      setPrompt(e as BIPEvent)
      setTimeout(() => setVis(true), 3000)
    }
    window.addEventListener('beforeinstallprompt', onBIP)
    return () => window.removeEventListener('beforeinstallprompt', onBIP)
  }, [])

  async function install() {
    if (!prompt) return
    await prompt.prompt()
    const choice = await prompt.userChoice
    if (choice.outcome === 'accepted') { setVis(false); setPrompt(null) }
    else dismiss()
  }
  function dismiss() {
    setVis(false)
    try { localStorage.setItem(DISMISSED_KEY, String(Date.now())) } catch {}
  }

  if (!visible || !prompt) return null

  return (
    <div className={s.card} role="dialog" aria-labelledby="pwa-title">
      <div className={s.icon}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" width={40} height={40} />
      </div>
      <div className={s.body}>
        <p id="pwa-title" className={s.title}>instalar como app</p>
        <p className={s.desc}>abre mais rápido, tem ícone próprio e funciona em tela cheia.</p>
      </div>
      <div className={s.actions}>
        <button type="button" className={s.installBtn} onClick={install}>
          <Download size={13} /> instalar
        </button>
        <button type="button" className={s.dismissBtn} onClick={dismiss} aria-label="Dispensar">
          <X size={13} />
        </button>
      </div>
    </div>
  )
}
