'use client'

import { useState, useEffect } from 'react'

// Cache de módulo (TTL curto) — evita re-fetch de turmas/disciplinas/bimestres
// ao alternar abas/tipos de documento. Compartilhado por todos os editores.
type Entry = { ts: number; data: unknown }
const cache = new Map<string, Entry>()
const inflight = new Map<string, Promise<unknown>>()
const TTL = 60_000 // 1 min

export function invalidateFetchCache(prefix?: string) {
  if (!prefix) { cache.clear(); return }
  for (const k of cache.keys()) if (k.startsWith(prefix)) cache.delete(k)
}

async function cachedGet<T>(url: string): Promise<T | null> {
  const hit = cache.get(url)
  if (hit && Date.now() - hit.ts < TTL) return hit.data as T
  if (inflight.has(url)) return inflight.get(url) as Promise<T | null>

  const p = fetch(url)
    .then(r => (r.ok ? r.json() : null))
    .then((data: T | null) => { if (data !== null) cache.set(url, { ts: Date.now(), data }); return data })
    .catch((err) => { console.error(`[useFetch] ${url}:`, err); return null })
    .finally(() => { inflight.delete(url) })

  inflight.set(url, p)
  return p as Promise<T | null>
}

/** Hook de fetch GET com cache de módulo e tratamento de erro centralizado. */
export function useFetch<T>(url: string | null): T | null {
  const [data, setData] = useState<T | null>(() => (url ? (cache.get(url)?.data as T) ?? null : null))

  useEffect(() => {
    if (!url) { setData(null); return }
    let alive = true
    cachedGet<T>(url).then(d => { if (alive) setData(d) })
    return () => { alive = false }
  }, [url])

  return data
}
