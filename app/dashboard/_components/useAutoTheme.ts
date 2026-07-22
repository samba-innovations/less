'use client'

import { useEffect } from 'react'

// useAutoTheme — alterna dark/light automaticamente baseado em horário local.
// Config default: dark entre 19h e 6h. User pode manter override manual via
// localStorage 'samba-theme-mode' = 'manual' (permite toggle sem sobrescrever).
//
// Uso: coloca no shell. Se localStorage.samba-theme-mode !== 'auto', não faz nada.

const CHECK_INTERVAL = 60_000 // 1min

function isDarkTime(now = new Date()) {
  const h = now.getHours()
  return h >= 19 || h < 6
}

export function useAutoTheme(mode: 'manual' | 'auto' = 'manual') {
  useEffect(() => {
    if (mode !== 'auto') return

    function apply() {
      const dark = isDarkTime()
      document.documentElement.classList.toggle('dark', dark)
      localStorage.setItem('samba-theme', dark ? 'dark' : 'light')
    }

    apply()
    const id = setInterval(apply, CHECK_INTERVAL)
    return () => clearInterval(id)
  }, [mode])
}
