'use client'

import { useEffect, useState, useCallback } from 'react'

// useDensity — hook para gerenciar densidade de UI (comfortable | compact).
// Adiciona `data-density="compact"` no html root quando ativa. CSS pode
// reagir via `[data-density="compact"] .lista-row { padding-block: 4px; }`.
//
// Uso:
//   const { density, toggle, isCompact } = useDensity()
//   <button onClick={toggle}>{isCompact ? 'confortável' : 'compacto'}</button>

export type Density = 'comfortable' | 'compact'
const STORAGE_KEY = 'samba-density'

export function useDensity() {
  const [density, setDensity] = useState<Density>('comfortable')

  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as Density | null) ?? 'comfortable'
    setDensity(saved)
    document.documentElement.setAttribute('data-density', saved)
  }, [])

  const set = useCallback((next: Density) => {
    setDensity(next)
    document.documentElement.setAttribute('data-density', next)
    localStorage.setItem(STORAGE_KEY, next)
  }, [])

  const toggle = useCallback(() => {
    set(density === 'compact' ? 'comfortable' : 'compact')
  }, [density, set])

  return {
    density,
    isCompact: density === 'compact',
    set,
    toggle,
  }
}
