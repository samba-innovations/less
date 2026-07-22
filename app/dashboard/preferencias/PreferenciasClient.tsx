'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon, Rows2, Rows3, Bell, Check, Volume2, VolumeX } from 'lucide-react'
import { useDensity } from '../_components/useDensity'
import { Slider } from '../_components/Slider'
import s from './preferencias.module.css'
import { Button } from '../_components/Button'

// sound prefs — cada notificação pode ter seu próprio "toca ou não toca".
// Persistido em localStorage, lido pelo NotificationBell quando dispara som.
const SOUND_KEY = 'samba-notif-sound'
const SOUND_VOL = 'samba-notif-volume'

// PreferenciasClient — página unificada com todas as prefs de UI/UX do usuário
// (tema, densidade, notificações in-app). Cada sistema tem esta página com o
// mesmo layout, alterna cor pelo brand.

type Theme = 'light' | 'dark' | 'auto'

export function PreferenciasClient() {
  const [theme, setTheme]         = useState<Theme>('light')
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({})
  const [notifLoaded, setNotifLoaded] = useState(false)
  const [soundOn, setSoundOn]       = useState(true)
  const [volume, setVolume]         = useState(0.5)
  const density = useDensity()

  useEffect(() => {
    const saved = (localStorage.getItem('samba-theme-mode') ?? 'manual') as string
    if (saved === 'auto') setTheme('auto')
    else setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
  }, [])

  useEffect(() => {
    const s = localStorage.getItem(SOUND_KEY)
    if (s !== null) setSoundOn(s === '1')
    const v = localStorage.getItem(SOUND_VOL)
    if (v !== null) setVolume(Number(v) || 0.5)
  }, [])

  useEffect(() => {
    fetch('/api/notifications/preferences').then(r => r.ok ? r.json() : null).then(data => {
      if (data?.prefs) {
        const map: Record<string, boolean> = {}
        for (const p of data.prefs) map[p.type] = p.inApp
        setNotifPrefs(map)
      }
      setNotifLoaded(true)
    }).catch(() => setNotifLoaded(true))
  }, [])

  function setThemeChoice(t: Theme) {
    setTheme(t)
    if (t === 'auto') {
      localStorage.setItem('samba-theme-mode', 'auto')
    } else {
      localStorage.setItem('samba-theme-mode', 'manual')
      localStorage.setItem('samba-theme', t)
      document.documentElement.classList.toggle('dark', t === 'dark')
    }
  }

  function setSoundChoice(on: boolean) {
    setSoundOn(on)
    localStorage.setItem(SOUND_KEY, on ? '1' : '0')
  }

  function setVolumeChoice(v: number) {
    setVolume(v)
    localStorage.setItem(SOUND_VOL, String(v))
  }

  function previewSound() {
    if (!soundOn) return
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext
      const ctx = new AC()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15)
      gain.gain.setValueAtTime(volume, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      osc.connect(gain); gain.connect(ctx.destination)
      osc.start(); osc.stop(ctx.currentTime + 0.3)
    } catch { /* Web Audio bloqueado — ignora silencioso */ }
  }

  async function toggleNotifPref(type: string) {
    const next = !(notifPrefs[type] ?? true)
    setNotifPrefs(prev => ({ ...prev, [type]: next }))
    await fetch('/api/notifications/preferences', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ type, inApp: next }),
    })
  }

  return (
    <div className={s.page}>
      <header className={s.header}>
        <h1 className={s.title}>preferências</h1>
        <p className={s.sub}>ajuste como o sistema se comporta pra você.</p>
      </header>

      {/* ── Tema ─────────────────────────────── */}
      <section className={s.section}>
        <h2 className={s.sectionTitle}>tema</h2>
        <div className={s.grid3}>
          <button className={`${s.card} ${theme === 'light' ? s.cardActive : ''}`} onClick={() => setThemeChoice('light')}>
            <Sun size={18}/>
            <span>claro</span>
            {theme === 'light' && <Check size={12} className={s.checkIcon}/>}
          </button>
          <button className={`${s.card} ${theme === 'dark' ? s.cardActive : ''}`} onClick={() => setThemeChoice('dark')}>
            <Moon size={18}/>
            <span>escuro</span>
            {theme === 'dark' && <Check size={12} className={s.checkIcon}/>}
          </button>
          <button className={`${s.card} ${theme === 'auto' ? s.cardActive : ''}`} onClick={() => setThemeChoice('auto')}>
            <span className={s.autoIcon}><Sun size={12}/><Moon size={12}/></span>
            <span>automático</span>
            {theme === 'auto' && <Check size={12} className={s.checkIcon}/>}
          </button>
        </div>
        <p className={s.hint}>automático: escuro entre 19h e 6h no seu horário local.</p>
      </section>

      {/* ── Densidade ─────────────────────────── */}
      <section className={s.section}>
        <h2 className={s.sectionTitle}>densidade</h2>
        <div className={s.grid2}>
          <button className={`${s.card} ${!density.isCompact ? s.cardActive : ''}`} onClick={() => density.set('comfortable')}>
            <Rows2 size={18}/>
            <span>confortável</span>
            {!density.isCompact && <Check size={12} className={s.checkIcon}/>}
          </button>
          <button className={`${s.card} ${density.isCompact ? s.cardActive : ''}`} onClick={() => density.set('compact')}>
            <Rows3 size={18}/>
            <span>compacto</span>
            {density.isCompact && <Check size={12} className={s.checkIcon}/>}
          </button>
        </div>
        <p className={s.hint}>compacto: reduz padding em listas — bom pra secretaria com listagens grandes.</p>
      </section>

      {/* ── Som ─────────────────────────────── */}
      <section className={s.section}>
        <h2 className={s.sectionTitle}>som das notificações</h2>
        <div className={s.grid2}>
          <button className={`${s.card} ${soundOn ? s.cardActive : ''}`} onClick={() => setSoundChoice(true)}>
            <Volume2 size={18}/>
            <span>ativo</span>
            {soundOn && <Check size={12} className={s.checkIcon}/>}
          </button>
          <button className={`${s.card} ${!soundOn ? s.cardActive : ''}`} onClick={() => setSoundChoice(false)}>
            <VolumeX size={18}/>
            <span>silencioso</span>
            {!soundOn && <Check size={12} className={s.checkIcon}/>}
          </button>
        </div>
        {soundOn && (
          <div className={s.volumeRow}>
            <label className={s.volumeLabel}>volume</label>
            <Slider
              value={volume}
              onChange={setVolumeChoice}
              min={0}
              max={1}
              step={0.05}
              renderValue={v => `${Math.round(v * 100)}%`}
              ariaLabel="volume das notificações"
            />
            <Button variant="ghost" onClick={previewSound}>testar som</Button>
          </div>
        )}
      </section>

      {/* ── Notificações ───────────────────────── */}
      <section className={s.section}>
        <h2 className={s.sectionTitle}><Bell size={13}/> notificações in-app</h2>
        {!notifLoaded ? (
          <p className={s.hint}>carregando...</p>
        ) : (
          <div className={s.list}>
            {['*', 'OCCURRENCE_NEW', 'RESERVATION_APPROVED', 'RESERVATION_REJECTED', 'TUTOR_CHANGE_REQUEST', 'CONTACT_LIST', 'PEI_UPDATED'].map(type => {
              const enabled = notifPrefs[type] ?? true
              return (
                <div key={type} className={s.notifRow}>
                  <div>
                    <span className={s.notifLabel}>{type === '*' ? 'Tudo' : type.toLowerCase().replace(/_/g, ' ')}</span>
                    <span className={s.notifDesc}>
                      {type === '*' ? 'silencia todas as notificações' : `receber notificação in-app pra "${type.toLowerCase().replace(/_/g, ' ')}"`}
                    </span>
                  </div>
                  <button
                    className={`${s.toggle} ${enabled ? s.toggleOn : s.toggleOff}`}
                    onClick={() => toggleNotifPref(type)}
                    aria-pressed={enabled}
                  >
                    <span className={s.knob}/>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
