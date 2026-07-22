'use client'

import { useEffect, useState, useCallback } from 'react'

// useRecentHistory — mantém lista de últimos N acessos com dedup e persist
// em localStorage. Usado pelo CommandPalette pra mostrar "recentes" quando
// vazio.
//
// Uso:
//   const { items, push, clear } = useRecentHistory<{ href, label }>('recentPages', 5)
//   push({ href: '/dashboard/alunos', label: 'alunos' })

export function useRecentHistory<T extends { href?: string; id?: string | number }>(
  key: string,
  maxItems = 5,
) {
  const [items, setItems] = useState<T[]>([])
  const storageKey = `samba-recent:${key}`

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) setItems(JSON.parse(raw) as T[])
    } catch { /* ignore */ }
  }, [storageKey])

  const push = useCallback((item: T) => {
    setItems(prev => {
      const identity = item.href ?? item.id
      const next = [item, ...prev.filter(p => (p.href ?? p.id) !== identity)].slice(0, maxItems)
      try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [maxItems, storageKey])

  const clear = useCallback(() => {
    setItems([])
    try { localStorage.removeItem(storageKey) } catch { /* ignore */ }
  }, [storageKey])

  return { items, push, clear }
}
