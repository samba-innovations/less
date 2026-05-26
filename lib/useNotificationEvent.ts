'use client'

import { useEffect, useRef } from 'react'

export function useNotificationEvent(
  types: string[],
  handler: (notification: Record<string, unknown>) => void
) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const key = types.join(',')
    const fn = (e: Event) => {
      const n = (e as CustomEvent).detail as Record<string, unknown>
      if (types.includes(n.type as string)) handlerRef.current(n)
    }
    window.addEventListener('samba:notification', fn)
    return () => window.removeEventListener('samba:notification', fn)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [types.join(',')])
}
