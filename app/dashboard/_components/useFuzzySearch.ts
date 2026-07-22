'use client'

import Fuse, { type IFuseOptions, type FuseResultMatch } from 'fuse.js'
import { useMemo } from 'react'

// useFuzzySearch — wrapper leve sobre fuse.js. Retorna items filtrados por
// query com fuzzy matching + info de match pra highlighting.
//
// Uso simples: const results = useFuzzySearch(items, q, ['name'])
// Com highlights: const { results, matches } = useFuzzySearchWithMatches(...)
//                 <Highlight text={item.name} match={matches[i]?.name} />

const DEFAULT_OPTS: IFuseOptions<unknown> = {
  threshold:       0.35,
  ignoreLocation:  true,
  minMatchCharLength: 2,
  includeMatches:  true,
  keys:            [],
}

export function useFuzzySearch<T>(
  items: T[],
  query: string,
  keys:  Array<keyof T | string>,
  options: Partial<IFuseOptions<T>> = {},
): T[] {
  const fuse = useMemo(
    () => new Fuse(items, { ...DEFAULT_OPTS, ...options, keys: keys as string[] }),
    [items, keys, options.threshold, options.ignoreLocation]
  )
  return useMemo(() => {
    const q = query.trim()
    if (!q) return items
    return fuse.search(q).map(r => r.item)
  }, [fuse, query, items])
}

// Versão com matches (pra highlighting no UI)
export function useFuzzySearchWithMatches<T>(
  items: T[],
  query: string,
  keys:  Array<keyof T | string>,
  options: Partial<IFuseOptions<T>> = {},
): Array<{ item: T; matches: readonly FuseResultMatch[] | undefined }> {
  const fuse = useMemo(
    () => new Fuse(items, { ...DEFAULT_OPTS, ...options, keys: keys as string[] }),
    [items, keys, options.threshold, options.ignoreLocation]
  )
  return useMemo(() => {
    const q = query.trim()
    if (!q) return items.map(item => ({ item, matches: undefined }))
    return fuse.search(q).map(r => ({ item: r.item, matches: r.matches }))
  }, [fuse, query, items])
}

// Helper: renderiza texto com highlights em <mark>
// Uso: <Highlight text={item.name} indices={match?.indices} />
export function highlightIndices(text: string, indices: readonly [number, number][] | undefined): Array<{ text: string; highlight: boolean }> {
  if (!indices || indices.length === 0) return [{ text, highlight: false }]
  const out: Array<{ text: string; highlight: boolean }> = []
  let cursor = 0
  for (const [start, end] of indices) {
    if (start > cursor) out.push({ text: text.slice(cursor, start), highlight: false })
    out.push({ text: text.slice(start, end + 1), highlight: true })
    cursor = end + 1
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor), highlight: false })
  return out
}
