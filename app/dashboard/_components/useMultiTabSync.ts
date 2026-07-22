'use client'

import { useEffect, useRef } from 'react'

// useMultiTabSync — broadcast events entre abas do mesmo browser via
// BroadcastChannel API. Ex: user marca notificação lida numa aba →
// outras abas ouvem e atualizam sem refresh.
//
// Uso:
//   useMultiTabSync('notifications', (e) => {
//     if (e.type === 'read') refetchBell()
//   })
//   // Em outro lugar:
//   const bc = useBroadcast('notifications')
//   bc.post({ type: 'read', id: 42 })

export function useMultiTabSync<T = unknown>(
  channel: string,
  onMessage: (data: T) => void,
) {
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const bc = new BroadcastChannel(`samba:${channel}`)
    bc.onmessage = (e) => onMessage(e.data as T)
    return () => bc.close()
  }, [channel, onMessage])
}

// Emitter — retorna .post pra broadcastar mensagens
export function useBroadcast<T = unknown>(channel: string) {
  const bcRef = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    bcRef.current = new BroadcastChannel(`samba:${channel}`)
    return () => { bcRef.current?.close(); bcRef.current = null }
  }, [channel])

  return {
    post: (data: T) => bcRef.current?.postMessage(data),
  }
}
