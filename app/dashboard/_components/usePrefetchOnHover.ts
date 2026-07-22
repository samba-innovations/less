'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

// usePrefetchOnHover — dispara router.prefetch(href) quando mouse entra.
// Uso: const ref = usePrefetchOnHover<HTMLAnchorElement>('/dashboard/alunos')
// Idempotente — Next debouncing próprio evita spam.

export function usePrefetchOnHover<T extends HTMLElement = HTMLAnchorElement>(href: string) {
  const ref = useRef<T | null>(null)
  const router = useRouter()

  useEffect(() => {
    const el = ref.current
    if (!el || !href) return
    let prefetched = false
    function trigger() {
      if (prefetched) return
      prefetched = true
      try { router.prefetch(href) } catch { /* ignore */ }
    }
    el.addEventListener('mouseenter', trigger, { passive: true })
    el.addEventListener('focus', trigger, { passive: true })
    return () => {
      el.removeEventListener('mouseenter', trigger)
      el.removeEventListener('focus', trigger)
    }
  }, [href, router])

  return ref
}
