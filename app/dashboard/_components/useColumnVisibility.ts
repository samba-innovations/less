'use client'

import { useCallback, useEffect, useState } from 'react'

// useColumnVisibility — gerencia colunas visíveis em tabelas com persist em
// localStorage. User customiza sua view — não afeta outros usuários.
//
// Uso:
//   const cols = useColumnVisibility('alunos-table', ['nome', 'ra', 'turma', 'email'])
//   {cols.visible('nome') && <td>{a.nome}</td>}

const KEY_PREFIX = 'samba-columns:'

export function useColumnVisibility<T extends string>(
  key: string,
  defaultVisible: readonly T[],
  alwaysVisible: readonly T[] = [] as unknown as readonly T[],
) {
  const [hidden, setHidden] = useState<Set<T>>(new Set())
  const storageKey = KEY_PREFIX + key

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) setHidden(new Set(JSON.parse(raw) as T[]))
    } catch { /* ignore */ }
  }, [storageKey])

  const persist = useCallback((next: Set<T>) => {
    try { localStorage.setItem(storageKey, JSON.stringify([...next])) } catch { /* ignore */ }
  }, [storageKey])

  const toggle = useCallback((col: T) => {
    if (alwaysVisible.includes(col)) return
    setHidden(prev => {
      const next = new Set(prev)
      if (next.has(col)) next.delete(col)
      else next.add(col)
      persist(next)
      return next
    })
  }, [alwaysVisible, persist])

  const visible = useCallback((col: T) => !hidden.has(col), [hidden])

  const showAll = useCallback(() => {
    setHidden(new Set())
    persist(new Set())
  }, [persist])

  const visibleColumns = defaultVisible.filter(c => !hidden.has(c))

  return {
    visible,
    toggle,
    showAll,
    hidden,
    allColumns:     defaultVisible,
    visibleColumns,
    alwaysVisible,
  }
}
