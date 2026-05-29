'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { FilePlus, FileText, GraduationCap, HelpCircle, LayoutDashboard, Loader2, School, Search, Users } from 'lucide-react'
import s from './command-palette.module.css'

type PageItem    = { kind: 'page';    label: string; href: string; icon: React.ElementType }
type StudentItem = { kind: 'student'; label: string; href: string; sub: string }
type ClassItem   = { kind: 'class';   label: string; href: string; sub: string }
type TeacherItem = { kind: 'teacher'; label: string; href: string; sub: string }
type Item = PageItem | StudentItem | ClassItem | TeacherItem

const PAGES: PageItem[] = [
{ kind: 'page', label: 'início',           href: '/dashboard',                 icon: LayoutDashboard },
  { kind: 'page', label: 'meus documentos',  href: '/dashboard/documentos',      icon: FileText        },
  { kind: 'page', label: 'novo documento',   href: '/dashboard/documentos/novo', icon: FilePlus        },
  { kind: 'page', label: 'equipe',           href: '/dashboard/coordenacao',     icon: Users           },
  { kind: 'page', label: 'suporte',          href: '/dashboard/suporte',         icon: HelpCircle      },
]

export function CommandPaletteTrigger() {
  const [open, setOpen] = useState(false)
  const [mac, setMac]   = useState(false)

  useEffect(() => {
    setMac(typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform))

    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(v => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <button className={s.trigger} onClick={() => setOpen(true)} aria-label="Buscar">
        <Search size={14} className={s.triggerIcon} />
        <span className={s.triggerText}>buscar...</span>
        <kbd className={s.kbd}>{mac ? 'âŒ˜' : 'Ctrl'} K</kbd>
      </button>
      {open && <CommandPalette onClose={() => setOpen(false)} />}
    </>
  )
}

function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [q, setQ]             = useState('')
  const [students, setStudents] = useState<StudentItem[]>([])
  const [classes, setClasses]   = useState<ClassItem[]>([])
  const [teachers, setTeachers] = useState<TeacherItem[]>([])
  const [loading, setLoading]   = useState(false)
  const [sel, setSel]           = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef  = useRef<HTMLDivElement>(null)

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus() }, [])

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Debounced search
  useEffect(() => {
    if (q.trim().length < 2) {
      setStudents([]); setClasses([]); setTeachers([])
      return
    }
    setLoading(true)
    const ctrl = new AbortController()
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        if (!res.ok) return
        const data = await res.json()
        setStudents(data.students ?? [])
        setClasses(data.classes  ?? [])
        setTeachers(data.teachers ?? [])
      } catch { /* abort */ }
      finally { setLoading(false) }
    }, 180)
    return () => { ctrl.abort(); clearTimeout(id) }
  }, [q])

  // Page filtering (local)
  const filteredPages = useMemo(() => {
    const lq = q.trim().toLowerCase()
    if (!lq) return PAGES.slice(0, 8)
    return PAGES.filter(p => p.label.toLowerCase().includes(lq))
  }, [q])

  // Flat item list for keyboard nav
  const flat: Item[] = useMemo(() => [
    ...filteredPages, ...students, ...classes, ...teachers,
  ], [filteredPages, students, classes, teachers])

  // Reset selection when query changes
  useEffect(() => { setSel(0) }, [q])

  function goTo(item: Item) {
    onClose()
    router.push(item.href)
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(i => Math.min(i + 1, flat.length - 1)); return }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSel(i => Math.max(i - 1, 0)); return }
    if (e.key === 'Enter')     { e.preventDefault(); if (flat[sel]) goTo(flat[sel]); return }
  }

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${sel}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [sel])

  let runningIndex = -1

  return createPortal(
    <div className={s.overlay} onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={s.panel}>
        <div className={s.searchBar}>
          <Search size={16} className={s.searchIcon} />
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="buscar alunos, turmas, professores, pÃ¡ginas..."
            className={s.searchInput}
          />
          {loading && <Loader2 size={14} className={s.spinner} />}
          <kbd className={s.escKbd}>esc</kbd>
        </div>

        <div className={s.list} ref={listRef}>
          {filteredPages.length > 0 && (
            <Group title="pÃ¡ginas">
              {filteredPages.map(p => {
                runningIndex++
                const idx = runningIndex
                const Icon = p.icon
                return (
                  <Row key={`p-${p.href}`} index={idx} active={sel === idx} onClick={() => goTo(p)} onHover={() => setSel(idx)}>
                    <span className={s.iconBox}><Icon size={14} /></span>
                    <span className={s.label}>{p.label}</span>
                  </Row>
                )
              })}
            </Group>
          )}

          {students.length > 0 && (
            <Group title="alunos">
              {students.map(it => {
                runningIndex++
                const idx = runningIndex
                return (
                  <Row key={`s-${it.href}`} index={idx} active={sel === idx} onClick={() => goTo(it)} onHover={() => setSel(idx)}>
                    <span className={s.iconBox}><GraduationCap size={14} /></span>
                    <span className={s.label}>{it.label}</span>
                    <span className={s.sub}>{it.sub}</span>
                  </Row>
                )
              })}
            </Group>
          )}

          {classes.length > 0 && (
            <Group title="turmas">
              {classes.map(it => {
                runningIndex++
                const idx = runningIndex
                return (
                  <Row key={`c-${it.href}`} index={idx} active={sel === idx} onClick={() => goTo(it)} onHover={() => setSel(idx)}>
                    <span className={s.iconBox}><School size={14} /></span>
                    <span className={s.label}>{it.label}</span>
                    <span className={s.sub}>{it.sub}</span>
                  </Row>
                )
              })}
            </Group>
          )}

          {teachers.length > 0 && (
            <Group title="professores">
              {teachers.map(it => {
                runningIndex++
                const idx = runningIndex
                return (
                  <Row key={`t-${it.href}`} index={idx} active={sel === idx} onClick={() => goTo(it)} onHover={() => setSel(idx)}>
                    <span className={s.iconBox}><Users size={14} /></span>
                    <span className={s.label}>{it.label}</span>
                    <span className={s.sub}>{it.sub}</span>
                  </Row>
                )
              })}
            </Group>
          )}

          {q.trim().length >= 2 && !loading && flat.length === 0 && (
            <div className={s.empty}>nenhum resultado para â€œ{q}â€</div>
          )}
          {q.trim().length < 2 && (
            <div className={s.hint}>digite ao menos 2 caracteres para buscar</div>
          )}
        </div>

        <div className={s.footer}>
          <span className={s.fk}><kbd>â†‘</kbd><kbd>â†“</kbd> navegar</span>
          <span className={s.fk}><kbd>â†µ</kbd> abrir</span>
          <span className={s.fk}><kbd>esc</kbd> fechar</span>
        </div>
      </div>
    </div>,
    document.body
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={s.group}>
      <div className={s.groupTitle}>{title}</div>
      {children}
    </div>
  )
}

function Row({ index, active, onClick, onHover, children }: {
  index: number; active: boolean; onClick: () => void; onHover: () => void; children: React.ReactNode
}) {
  return (
    <button
      data-index={index}
      className={`${s.row} ${active ? s.rowActive : ''}`}
      onClick={onClick}
      onMouseMove={onHover}
    >
      {children}
    </button>
  )
}
