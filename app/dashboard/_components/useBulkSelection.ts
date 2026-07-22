'use client'

import { useCallback, useMemo, useState } from 'react'

// useBulkSelection — gerencia set de IDs selecionados em listas com checkbox.
// Suporta select-all, toggle individual, invert, clear.
//
// Uso:
//   const sel = useBulkSelection<number>()
//   {items.map(x => <Row selected={sel.has(x.id)} onToggle={() => sel.toggle(x.id)} />)}

export function useBulkSelection<T extends string | number>() {
  const [selected, setSelected] = useState<Set<T>>(new Set())

  const has    = useCallback((id: T) => selected.has(id), [selected])
  const size   = selected.size

  const toggle = useCallback((id: T) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback((ids: T[]) => {
    setSelected(new Set(ids))
  }, [])

  const clear = useCallback(() => setSelected(new Set()), [])

  const isAllSelected = useCallback((ids: T[]) => {
    if (ids.length === 0) return false
    return ids.every(id => selected.has(id))
  }, [selected])

  const toggleAll = useCallback((ids: T[]) => {
    if (isAllSelected(ids)) clear()
    else selectAll(ids)
  }, [isAllSelected, clear, selectAll])

  const asArray = useMemo(() => Array.from(selected), [selected])

  return {
    selected,
    size,
    has,
    toggle,
    selectAll,
    clear,
    toggleAll,
    isAllSelected,
    asArray,
  }
}
