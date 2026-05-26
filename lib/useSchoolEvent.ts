'use client'

import { useEffect, useRef } from 'react'

export function useSchoolEvent(
  types: string[],
  handler: (data: Record<string, unknown>) => void
) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const fn = (e: Event) => {
      const d = (e as CustomEvent).detail as Record<string, unknown>
      if (types.includes(d.type as string)) handlerRef.current(d)
    }
    window.addEventListener('samba:live', fn)
    return () => window.removeEventListener('samba:live', fn)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [types.join(',')])
}
