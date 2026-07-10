/**
 * Sistema unificado de seleção pro less.
 *
 * Substitui os padrões diferentes espalhados nos editores (optionChip,
 * pillChip, GrupoCheckbox, chipOpt) por uma API consistente.
 *
 * - <ChipSelector> — single OU multi-select de chips flat
 * - <GroupedChipSelector> — chips agrupados em acordeons com contador
 *
 * Recursos:
 *   • Animação stagger na entrada
 *   • Hover lift sutil + active scale
 *   • Check icon animado ao selecionar
 *   • Subtitle opcional ("6ªA" + "6º Ano")
 *   • Locked items (não desselecionáveis)
 *   • Disabled state
 *   • Contagem visual no header dos grupos
 *   • Acordeon com chevron animado
 */

'use client'

import { useState, type ReactNode } from 'react'
import { Check, ChevronDown, type LucideIcon } from 'lucide-react'
import s from './selector.module.css'

// ─── ChipSelector (flat) ─────────────────────────────────────────

type ChipBase = {
  value: string
  label: string
  /** Subtítulo discreto (ex: grade name "6º Ano" embaixo da turma). */
  sub?: string
  /** Ícone opcional à esquerda do label. */
  icon?: ReactNode
  disabled?: boolean
}

type SingleProps<V extends string = string> = {
  options:   Array<ChipBase & { value: V }>
  value:     V | null | undefined
  onChange:  (v: V) => void
  multi?:    false
  size?:     'sm' | 'md' | 'lg'
  className?: string
  emptyLabel?: string
  /** Lista de values que não podem ser desselecionados (sempre on). */
  lockedValues?: V[]
}

type MultiProps<V extends string = string> = {
  options:   Array<ChipBase & { value: V }>
  value:     V[]
  onChange:  (v: V[]) => void
  multi:     true
  size?:     'sm' | 'md' | 'lg'
  className?: string
  emptyLabel?: string
  lockedValues?: V[]
}

export function ChipSelector<V extends string = string>(props: SingleProps<V> | MultiProps<V>) {
  const sizeClass =
    props.size === 'sm' ? s.sizeSm :
    props.size === 'lg' ? s.sizeLg :
    s.sizeMd
  const locked = new Set(props.lockedValues ?? [])

  if (props.options.length === 0) {
    return <p className={s.empty}>{props.emptyLabel ?? 'nenhuma opção disponível'}</p>
  }

  const isMulti = props.multi === true
  const selected = isMulti ? new Set(props.value) : null
  const single = !isMulti ? props.value : null

  function handle(v: V) {
    if (locked.has(v)) return
    if (isMulti) {
      const cur = new Set(props.value)
      cur.has(v) ? cur.delete(v) : cur.add(v)
      ;(props as MultiProps<V>).onChange([...cur] as V[])
    } else {
      ;(props as SingleProps<V>).onChange(v)
    }
  }

  return (
    <div className={`${s.chipRow} ${props.className ?? ''}`}>
      {props.options.map((o, i) => {
        const isLocked = locked.has(o.value)
        const isOn = isLocked || (isMulti ? selected!.has(o.value) : single === o.value)
        return (
          <button
            key={o.value}
            type="button"
            disabled={o.disabled}
            onClick={() => handle(o.value)}
            className={[
              s.chip,
              sizeClass,
              isOn ? s.chipOn : '',
              isLocked ? s.chipLocked : '',
              o.disabled ? s.chipDisabled : '',
            ].filter(Boolean).join(' ')}
            style={{ '--stagger': `${i * 0.018}s` } as React.CSSProperties}
          >
            {isOn && isMulti && (
              <span className={s.chipCheck} aria-hidden>
                <Check size={11} strokeWidth={3} />
              </span>
            )}
            {o.icon && <span className={s.chipIcon}>{o.icon}</span>}
            <span>{o.label}</span>
            {o.sub && <span className={s.chipSub}>{o.sub}</span>}
          </button>
        )
      })}
    </div>
  )
}

// ─── GroupedChipSelector (categorias com acordeão) ──────────────

export type SelectorGroup = {
  id:    string
  label: string
  icon?: LucideIcon
  items: string[]                    // os items são strings simples (compatível com o legado)
  defaultOpen?: boolean
}

type GroupedProps = {
  groups:   SelectorGroup[]
  /** value é uma string com items separados por ", " (formato do banco). */
  value:    string
  onChange: (v: string) => void
  lockedItems?: string[]
  size?:    'sm' | 'md' | 'lg'
}

export function GroupedChipSelector({ groups, value, onChange, lockedItems = [], size = 'md' }: GroupedProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(
    new Set(groups.filter(g => g.defaultOpen).map(g => g.id))
  )
  const selected = new Set(value ? value.split(',').map(x => x.trim()).filter(Boolean) : [])
  const locked = new Set(lockedItems)

  function toggleItem(item: string) {
    if (locked.has(item)) return
    const nx = new Set(selected)
    nx.has(item) ? nx.delete(item) : nx.add(item)
    onChange([...nx].join(', '))
  }

  function toggleGroup(id: string) {
    setOpenIds(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  return (
    <div className={s.groupList}>
      {groups.map(grp => {
        const count = grp.items.filter(i => selected.has(i) || locked.has(i)).length
        const isOpen = openIds.has(grp.id)
        const Icon = grp.icon

        return (
          <div key={grp.id} className={`${s.group} ${isOpen ? s.groupOpen : ''}`}>
            <button
              type="button"
              className={s.groupHeader}
              onClick={() => toggleGroup(grp.id)}
              aria-expanded={isOpen}
            >
              {Icon && (
                <span className={s.groupHeaderIcon} aria-hidden>
                  <Icon size={13} />
                </span>
              )}
              <span className={s.groupLabel}>{grp.label}</span>
              <span className={`${s.groupCount} ${count === 0 ? s.groupCountEmpty : ''}`}>
                {count}
              </span>
              <ChevronDown
                size={14}
                className={`${s.groupChevron} ${isOpen ? s.groupChevronOpen : ''}`}
              />
            </button>
            {isOpen && (
              <div className={s.groupBody}>
                <ChipSelector
                  multi
                  size={size}
                  value={[...selected].filter(v => grp.items.includes(v))}
                  onChange={vals => {
                    const cur = new Set(selected)
                    grp.items.forEach(i => cur.delete(i))
                    vals.forEach(v => cur.add(v))
                    onChange([...cur].join(', '))
                  }}
                  lockedValues={grp.items.filter(i => locked.has(i))}
                  options={grp.items.map(item => ({ value: item, label: item }))}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
