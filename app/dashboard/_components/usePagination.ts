'use client'

import { useMemo } from 'react'
import { useUrlState } from './useUrlState'

// usePagination — state de paginação sincronizado com URL (?page=5).
// Retorna items da página atual + info de navegação.
//
// Uso:
//   const { page, setPage, totalPages, visibleItems } = usePagination(rows, 20)

export function usePagination<T>(items: T[], pageSize: number) {
  const [page, setPage] = useUrlState<number>('page', 1)

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage   = Math.min(Math.max(1, page), totalPages)

  const visibleItems = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, safePage, pageSize])

  return {
    page:        safePage,
    setPage,
    totalPages,
    pageSize,
    visibleItems,
    hasPrev:     safePage > 1,
    hasNext:     safePage < totalPages,
    goPrev:      () => setPage(safePage - 1),
    goNext:      () => setPage(safePage + 1),
  }
}
