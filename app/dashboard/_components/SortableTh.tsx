'use client'

import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { useUrlState } from './useUrlState'
import s from './sortable-th.module.css'

type SortDir = 'asc' | 'desc' | null

type Props = {
  column:   string
  children: React.ReactNode
  align?:   'left' | 'center' | 'right'
}

// SortableTh — <th> clicável que atualiza URL params ?sort=col&dir=asc.
// Uso combinado com hook useSortedItems() abaixo pra ordenar client-side.
export function SortableTh({ column, children, align = 'left' }: Props) {
  const [sort, setSort] = useUrlState<string>('sort', '')
  const [dir,  setDir]  = useUrlState<string>('dir',  'asc')

  const isActive = sort === column
  const currentDir: SortDir = isActive ? (dir === 'desc' ? 'desc' : 'asc') : null

  function toggle() {
    if (!isActive) {
      setSort(column)
      setDir('asc')
    } else if (dir === 'asc') {
      setDir('desc')
    } else {
      setSort(null)
      setDir(null)
    }
  }

  return (
    <th className={`${s.th} ${s[`align-${align}`]}`}>
      <button className={s.btn} onClick={toggle} aria-label={`ordenar por ${column}`}>
        <span>{children}</span>
        <span className={s.iconWrap}>
          {currentDir === 'asc'  ? <ArrowUp   size={11} className={s.iconActive}/> :
           currentDir === 'desc' ? <ArrowDown size={11} className={s.iconActive}/> :
                                   <ArrowUpDown size={11} className={s.iconIdle}/>}
        </span>
      </button>
    </th>
  )
}

// Hook helper pra aplicar sort baseado nos URL params
export function useSortedItems<T>(items: T[], getters: Record<string, (item: T) => unknown>) {
  const [sort] = useUrlState<string>('sort', '')
  const [dir]  = useUrlState<string>('dir', 'asc')
  if (!sort || !getters[sort]) return items
  const getter = getters[sort]
  const sorted = [...items].sort((a, b) => {
    const av = getter(a)
    const bv = getter(b)
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    if (typeof av === 'number' && typeof bv === 'number') return av - bv
    return String(av).localeCompare(String(bv), 'pt-BR', { sensitivity: 'base' })
  })
  return dir === 'desc' ? sorted.reverse() : sorted
}
