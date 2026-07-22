'use client'

import { useEffect, useState } from 'react'
import { X, Keyboard } from 'lucide-react'
import s from './keyboard-shortcuts.module.css'

// Detecta plataforma pra mostrar ⌘ (Mac) ou Ctrl (Win/Linux)
function isMac() {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform)
}

type Shortcut = {
  keys:     string[]  // ex: ['⌘', 'K'] ou ['?']
  action:   string
  scope?:   string    // grupo (Global, Navegação, Listas, ...)
}

const SHORTCUTS: Shortcut[] = [
  { keys: ['MOD', 'K'],       action: 'abrir busca (Command Palette)', scope: 'global' },
  { keys: ['?'],              action: 'este painel',                    scope: 'global' },
  { keys: ['Esc'],            action: 'fechar diálogo/painel',         scope: 'global' },
  { keys: ['G', 'D'],         action: 'ir para visão geral',           scope: 'navegação' },
  { keys: ['J'],              action: 'próximo item da lista',         scope: 'listas' },
  { keys: ['K'],              action: 'item anterior',                  scope: 'listas' },
  { keys: ['Enter'],          action: 'abrir item selecionado',        scope: 'listas' },
  { keys: ['/'],              action: 'focar campo de busca',          scope: 'listas' },
  { keys: ['N'],              action: 'novo item',                      scope: 'ações' },
  { keys: ['E'],              action: 'editar item selecionado',       scope: 'ações' },
]

// Overlay de "Atalhos de teclado" — abre com "?". Discoverable pra power users
// sem intrusão pra usuários normais.
export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false)
  const modKey = isMac() ? '⌘' : 'Ctrl'

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Não abre se usuário estiver digitando em um input
      const target = e.target as HTMLElement
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      if (target?.isContentEditable) return

      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        setOpen(v => !v)
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  // Agrupa por scope
  const groups = SHORTCUTS.reduce<Record<string, Shortcut[]>>((acc, sc) => {
    const g = sc.scope ?? 'outros'
    if (!acc[g]) acc[g] = []
    acc[g].push(sc)
    return acc
  }, {})

  return (
    <div className={s.backdrop} onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-label="Atalhos de teclado">
      <div className={s.panel} onClick={e => e.stopPropagation()}>
        <div className={s.head}>
          <div className={s.headLeft}>
            <Keyboard size={14} />
            <span className={s.title}>atalhos de teclado</span>
          </div>
          <button className={s.close} onClick={() => setOpen(false)} aria-label="Fechar">
            <X size={12} />
          </button>
        </div>
        <div className={s.list}>
          {Object.entries(groups).map(([scope, items]) => (
            <div key={scope} className={s.group}>
              <span className={s.groupLabel}>{scope}</span>
              {items.map((sc, i) => (
                <div key={i} className={s.row}>
                  <div className={s.keys}>
                    {sc.keys.map((k, j) => (
                      <span key={j} className={s.kbd}>{k === 'MOD' ? modKey : k}</span>
                    ))}
                  </div>
                  <span className={s.action}>{sc.action}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className={s.foot}>
          <span>pressione <span className={s.footKbd}>?</span> pra abrir/fechar</span>
        </div>
      </div>
    </div>
  )
}
