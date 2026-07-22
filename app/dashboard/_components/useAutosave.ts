'use client'

import { useEffect, useRef, useState } from 'react'

// useAutosave — salva estado em localStorage a cada N ms de inatividade.
// Retorna estado de "draft existe" pra oferecer restauração ao abrir a page.
//
// Uso:
//   const { hasDraft, draftAt, restore, discard } = useAutosave('alunos-form', values, 2000)
//   if (hasDraft) return <RecoveryBanner onRestore={restore} onDiscard={discard} at={draftAt} />

type Autosave<T> = {
  hasDraft: boolean
  draftAt:  Date | null
  restore:  () => T | null
  discard:  () => void
}

const KEY_PREFIX = 'samba-autosave:'

export function useAutosave<T>(
  key:      string,
  value:    T,
  delay = 2000,
): Autosave<T> {
  const [hasDraft, setHasDraft]     = useState(false)
  const [draftAt, setDraftAt]       = useState<Date | null>(null)
  const timerRef                    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skipInitialRef              = useRef(true)
  const storageKey                  = KEY_PREFIX + key

  // Ao montar: detecta se tem draft salvo
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw) as { at: string; value: T }
        if (parsed?.at && parsed.value) {
          setHasDraft(true)
          setDraftAt(new Date(parsed.at))
        }
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced save
  useEffect(() => {
    if (skipInitialRef.current) { skipInitialRef.current = false; return }
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ at: new Date().toISOString(), value }))
        setDraftAt(new Date())
      } catch { /* ignore quota */ }
    }, delay)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [value, delay, storageKey])

  function restore(): T | null {
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return null
      const parsed = JSON.parse(raw) as { at: string; value: T }
      return parsed.value
    } catch {
      return null
    }
  }

  function discard() {
    try {
      localStorage.removeItem(storageKey)
      setHasDraft(false)
      setDraftAt(null)
    } catch { /* ignore */ }
  }

  return { hasDraft, draftAt, restore, discard }
}
