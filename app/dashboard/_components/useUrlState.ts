'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

// useUrlState — sync state ↔ URL search params. Bookmark, share, back button
// funcionam nativos. Ideal pra filtros de listas.
//
// Uso:
//   const [ativo, setAtivo] = useUrlState('ativo', 'true')
//   → URL: ?ativo=true

export function useUrlState<T extends string | number | boolean | null>(
  key: string,
  defaultValue: T,
): [T, (next: T | null) => void] {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  const parse = useCallback((raw: string | null): T => {
    if (raw === null) return defaultValue
    if (typeof defaultValue === 'boolean') return (raw === 'true') as T
    if (typeof defaultValue === 'number')  return (Number(raw) as unknown) as T
    return (raw as unknown) as T
  }, [defaultValue])

  const [value, setValue] = useState<T>(() => parse(searchParams.get(key)))

  // Sync from URL when params change externally (back button, external nav)
  useEffect(() => {
    setValue(parse(searchParams.get(key)))
  }, [key, searchParams, parse])

  const set = useCallback((next: T | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (next === null || next === defaultValue || next === '' || next === undefined) {
      params.delete(key)
    } else {
      params.set(key, String(next))
    }
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    setValue(next === null ? defaultValue : next)
  }, [key, pathname, router, searchParams, defaultValue])

  return [value, set]
}
