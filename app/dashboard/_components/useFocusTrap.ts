'use client'

import { useEffect, useRef } from 'react'

// useFocusTrap — captura foco dentro de um container (modal, dialog, panel).
// Tab/Shift+Tab circulam entre elementos focáveis. Ao desmontar, restaura foco
// pro elemento que estava ativo antes de abrir.
//
// Uso: const ref = useFocusTrap(open); return <div ref={ref}>...</div>

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(active: boolean) {
  const containerRef = useRef<T | null>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active) return
    returnFocusRef.current = document.activeElement as HTMLElement | null

    const container = containerRef.current
    if (!container) return

    // Foca primeiro elemento focável ao abrir
    const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE)
    if (focusables.length > 0) {
      // Prefere elementos "action" ao invés do X close
      const preferred = Array.from(focusables).find(el => !el.getAttribute('aria-label')?.match(/fechar/i))
      ;(preferred ?? focusables[0]).focus()
    } else {
      container.focus()
    }

    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !container) return
      const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null)
      if (items.length === 0) return
      const first = items[0]
      const last  = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      // Restaura foco pro trigger
      returnFocusRef.current?.focus?.()
    }
  }, [active])

  return containerRef
}
