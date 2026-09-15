'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import s from './loading-bar.module.css'

// Barra fina de progresso no topo, durante navegação client-side.
//
// O início vem do clique no link, não do usePathname: no App Router o pathname
// só muda quando a navegação JÁ terminou, então reagir a ele mostrava a barra
// depois do carregamento — parecia travada. O pathname aqui serve de sinal de
// término.
//
// O avanço é feito em CSS (uma animação que desacelera até ~92% e espera), em
// vez de setState a cada frame.

/** Se a navegação não terminar nesse tempo, a barra sai sozinha. */
const SAFETY_MS = 10_000
/** Duração da saída — precisa bater com o .done do CSS. */
const EXIT_MS = 280

type Phase = 'idle' | 'loading' | 'done'

export function LoadingBar() {
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const [phase, setPhase] = useState<Phase>('idle')

  const phaseRef  = useRef<Phase>('idle')
  const fillRef   = useRef<HTMLDivElement>(null)
  const targetRef = useRef<string | null>(null)
  const safetyRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const exitRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  function clearTimers() {
    if (safetyRef.current) { clearTimeout(safetyRef.current); safetyRef.current = null }
    if (exitRef.current)   { clearTimeout(exitRef.current);   exitRef.current   = null }
  }

  function go(next: Phase) {
    phaseRef.current = next
    setPhase(next)
  }

  function start(target?: string) {
    if (phaseRef.current === 'loading') return
    clearTimers()
    targetRef.current = target ?? null
    go('loading')
    // Rede lenta, erro de chunk ou navegação abortada não podem deixar a barra
    // parada na tela para sempre.
    safetyRef.current = setTimeout(() => finish(), SAFETY_MS)
  }

  function finish() {
    if (phaseRef.current !== 'loading') return
    clearTimers()
    targetRef.current = null
    // Congela onde a barra está para que o fecho parta daqui, sem salto.
    const el = fillRef.current
    if (el) {
      const m = new DOMMatrixReadOnly(getComputedStyle(el).transform)
      el.style.setProperty('--lb-at', String(m.a || 0))
    }
    go('done')
    exitRef.current = setTimeout(() => go('idle'), EXIT_MS)
  }

  // ── Início: clique em link interno, ou voltar/avançar do navegador ──
  useEffect(() => {
    function onClick(e: MouseEvent) {
      // Cliques sintéticos (a.click() de um download, por exemplo) não são
      // navegação: disparavam a barra e ela ficava até o timeout de segurança.
      if (!e.isTrusted) return
      if (e.defaultPrevented || e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

      const a = (e.target as Element | null)?.closest?.('a')
      if (!a) return

      const href = a.getAttribute('href')
      if (!href || href.startsWith('#')) return
      if (a.hasAttribute('download')) return
      if (a.target && a.target !== '_self') return

      let url: URL
      try { url = new URL(a.href, window.location.href) } catch { return }
      // blob:, data:, mailto:, tel: — nada disso troca de rota.
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return
      if (url.origin !== window.location.origin) return
      // Download não navega: a rota nunca muda e a barra ficaria presa até o
      // timeout. /api/* nunca é página, e as extensões abaixo são anexos.
      if (url.pathname.startsWith('/api/')) return
      if (/\.(pdf|docx?|xlsx?|csv|zip|png|jpe?g|svg|txt)$/i.test(url.pathname)) return
      // Mesma rota: o Next não remonta nada, não há o que aguardar.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return

      start(url.pathname + url.search)
    }

    function onPopState() { start() }

    document.addEventListener('click', onClick, true)
    window.addEventListener('popstate', onPopState)
    return () => {
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('popstate', onPopState)
      clearTimers()
    }
  }, [])

  // ── Término: a rota chegou ao destino ──
  // Sem lista de dependências de propósito: roda a cada commit, então pega
  // também o caso em que a rota chega sem que pathname/searchParams mudem de
  // identidade. pathname e searchParams entram só como gatilho de re-render.
  useEffect(() => {
    void pathname; void searchParams
    if (phaseRef.current !== 'loading') return
    const target = targetRef.current
    // Sem destino conhecido (voltar/avançar), a mudança de rota já basta.
    if (!target) { finish(); return }
    const here = window.location.pathname + window.location.search
    if (here === target) finish()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  })

  if (phase === 'idle') return null

  return (
    <div className={s.bar} aria-hidden="true">
      <div ref={fillRef} className={`${s.fill} ${phase === 'done' ? s.done : s.loading}`} />
    </div>
  )
}
