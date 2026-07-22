'use client'

import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import s from './search-input.module.css'

// SearchInput — busca inline com ícone lupa + input + botão clear.
// Substitui o padrão comum de "input com lupa + limpar" espalhado em
// filtros, listagens e headers.
//
// Features:
//  - ícone lupa fixa à esquerda
//  - botão X à direita aparece quando há valor
//  - onDebouncedChange dispara após 300ms de idle (opcional)
//  - loading substitui X por spinner
//  - size sm | md
//  - fullWidth ocupa 100%
//  - atalho: Esc limpa

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size' | 'type'> & {
  value:              string
  onChange:           (v: string) => void
  onDebouncedChange?: (v: string) => void
  debounceMs?:        number       // default 300
  loading?:           boolean
  size?:              'sm' | 'md'
  fullWidth?:         boolean
  placeholder?:       string
}

export const SearchInput = forwardRef<HTMLInputElement, Props>(function SearchInput(
  { value, onChange, onDebouncedChange, debounceMs = 300,
    loading, size = 'md', fullWidth, placeholder = 'buscar…',
    className, disabled, ...rest }, ref
) {
  const [inner, setInner] = useState(value)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync valor externo (controlado)
  useEffect(() => { setInner(value) }, [value])

  const handleChange = useCallback((v: string) => {
    setInner(v)
    onChange(v)
    if (onDebouncedChange) {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => onDebouncedChange(v), debounceMs)
    }
  }, [onChange, onDebouncedChange, debounceMs])

  function clear() { handleChange('') }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape' && inner) {
      e.preventDefault()
      clear()
    }
    rest.onKeyDown?.(e)
  }

  const cls = [
    s.wrap,
    s[size],
    fullWidth ? s.fullWidth : '',
    disabled ? s.disabled : '',
    className ?? '',
  ].filter(Boolean).join(' ')

  return (
    <div className={cls}>
      <Search size={size === 'sm' ? 13 : 14} className={s.icon} />
      <input
        ref={ref}
        type="search"
        className={s.input}
        value={inner}
        onChange={e => handleChange(e.target.value)}
        onKeyDown={onKey}
        placeholder={placeholder}
        disabled={disabled}
        {...rest}
      />
      {loading ? (
        <Loader2 size={size === 'sm' ? 12 : 13} className={`${s.trailing} ${s.spin}`} />
      ) : inner ? (
        <button
          type="button"
          className={s.clear}
          onClick={clear}
          aria-label="limpar busca"
          tabIndex={-1}
        >
          <X size={size === 'sm' ? 12 : 13} />
        </button>
      ) : null}
    </div>
  )
})
