'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { HelpCircle, X, Plus, Send, ArrowLeft, ChevronRight, CheckCircle2, Clock, Loader2 } from 'lucide-react'
import s from './support-widget.module.css'
import { Button } from '../_components/Button'
import { IconButton } from '../_components/IconButton'
import { Chip } from '../_components/Chip'

type Msg    = { id: number; body: string; authorName: string; isFromAdmin: boolean; createdAt: string }
type Ticket = { id: number; subject: string; status: string; updatedAt: string; messages: Msg[] }
type View   = 'home' | 'new' | 'chat'

function fmtDate(d: string) {
  const date = new Date(d)
  const now  = new Date()
  const diff = now.getTime() - date.getTime()
  if (diff < 60_000)     return 'agora'
  if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)}min`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function SupportWidget() {
  const [open,    setOpen]    = useState(false)
  const [view,    setView]    = useState<View>('home')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [active,  setActive]  = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [msgText, setMsgText] = useState('')
  const [subject, setSubject] = useState('')
  const [newBody, setNewBody] = useState('')
  const [newErr,  setNewErr]  = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  const loadTickets = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/suporte', { cache: 'no-store' })
      const data = await res.json()
      setTickets(data.tickets ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) loadTickets()
  }, [open, loadTickets])

  useEffect(() => {
    if (view === 'chat') bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [view, active?.messages.length])

  useEffect(() => {
    if (view === 'chat' || view === 'new') {
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [view])

  function openChat(t: Ticket) {
    setActive(t)
    setView('chat')
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !newBody.trim()) return
    setNewErr(null)
    setSending(true)
    try {
      const res  = await fetch('/api/suporte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim(), body: newBody.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao criar chamado')
      const ticket: Ticket = data.ticket
      setTickets(prev => [ticket, ...prev])
      setActive(ticket)
      setSubject('')
      setNewBody('')
      setView('chat')
    } catch (err) {
      setNewErr(err instanceof Error ? err.message : 'Erro ao criar chamado')
    } finally {
      setSending(false)
    }
  }

  async function handleSend() {
    if (!active || !msgText.trim() || sending) return
    const body = msgText.trim()
    setMsgText('')
    const optimistic: Msg = {
      id: Date.now(),
      body,
      authorName:  'você',
      isFromAdmin: false,
      createdAt:   new Date().toISOString(),
    }
    const updated = { ...active, messages: [...active.messages, optimistic] }
    setActive(updated)
    setTickets(prev => prev.map(t => t.id === active.id ? updated : t))

    setSending(true)
    try {
      const res  = await fetch(`/api/suporte/${active.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      if (!res.ok) throw new Error()
      const r2   = await fetch('/api/suporte', { cache: 'no-store' })
      const data = await r2.json()
      const refreshed = (data.tickets as Ticket[]).find(t => t.id === active.id)
      if (refreshed) {
        setActive(refreshed)
        setTickets(data.tickets)
      }
    } finally {
      setSending(false)
    }
  }

  async function handleClose() {
    if (!active) return
    setSending(true)
    try {
      await fetch(`/api/suporte/${active.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CLOSED' }),
      })
      const closed = { ...active, status: 'CLOSED' }
      setActive(closed)
      setTickets(prev => prev.map(t => t.id === active.id ? closed : t))
    } finally {
      setSending(false)
    }
  }

  function toggleOpen() {
    if (!open) { setOpen(true); setView('home') }
    else setOpen(false)
  }

  const openCount = tickets.filter(t => t.status === 'OPEN').length

  return (
    <div className={s.root}>

      {open && (
        <div className={s.panel}>

          <div className={s.header}>
            {view !== 'home' ? (
              <Button variant="ghost" onClick={() => { setView('home'); setActive(null) }}><ArrowLeft size={15} /></Button>
            ) : (
              <div className={s.headerIcon}>
                <HelpCircle size={16} />
              </div>
            )}
            <div className={s.headerMid}>
              <span className={s.headerTitle}>
                {view === 'home' ? 'suporte' : view === 'new' ? 'novo chamado' : active?.subject ?? ''}
              </span>
              {view === 'home' && (
                <span className={s.headerSub}>como podemos ajudar?</span>
              )}
            </div>
            <div className={s.headerActions}>
              {view === 'home' && (
                <Button
                  variant="primary"
                  onClick={() => { setNewErr(null); setView('new') }}
                  title="novo chamado"
                ><Plus size={15} /></Button>
              )}
              {view === 'chat' && active?.status === 'OPEN' && (
                <Button
                  variant="danger"
                  onClick={handleClose}
                  disabled={sending}
                  title="encerrar chamado"
                ><CheckCircle2 size={15} /></Button>
              )}
              <IconButton
                icon={<X size={15} />}
                label="x"
                onClick={() => setOpen(false)}
              />
            </div>
          </div>

          <div className={s.body}>

            {view === 'home' && (
              <div className={s.homeView}>
                {loading && (
                  <div className={s.loadingRow}>
                    <Loader2 size={18} className={s.spinner} />
                  </div>
                )}
                {!loading && tickets.length === 0 && (
                  <div className={s.emptyState}>
                    <p className={s.emptyTitle}>sem chamados</p>
                    <p className={s.emptyText}>clique em <strong>+</strong> para abrir sua primeira conversa.</p>
                  </div>
                )}
                {!loading && tickets.length > 0 && (
                  <div className={s.ticketList}>
                    {tickets.map(t => (
                      <button key={t.id} className={s.ticketItem} onClick={() => openChat(t)}>
                        <div className={s.ticketItemTop}>
                          <span className={t.status === 'OPEN' ? s.dot : s.dotClosed} />
                          <span className={s.ticketItemSubject}>{t.subject}</span>
                          <span className={s.ticketItemDate}>{fmtDate(t.updatedAt)}</span>
                        </div>
                        <div className={s.ticketItemBottom}>
                          <span className={s.ticketItemPreview}>
                            {t.messages[t.messages.length - 1]?.body ?? ''}
                          </span>
                          <ChevronRight size={13} className={s.chevron} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {view === 'new' && (
              <form className={s.newView} onSubmit={handleCreate}>
                {newErr && <p className={s.errMsg}>{newErr}</p>}
                <div className={s.field}>
                  <label className={s.fieldLabel}>assunto</label>
                  <input
                    className={s.fieldInput}
                    placeholder="Ex: como criar um documento?"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className={s.field}>
                  <label className={s.fieldLabel}>mensagem</label>
                  <textarea
                    ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                    className={s.fieldTextarea}
                    placeholder="Descreva sua dúvida..."
                    value={newBody}
                    onChange={e => setNewBody(e.target.value)}
                    rows={4}
                    required
                  />
                </div>
                <Button
                  variant="primary"
                  iconLeft={<Send size={14} />}
                  disabled={sending}
                  type="submit"
                >{sending ? 'enviando...' : 'iniciar conversa'}</Button>
              </form>
            )}

            {view === 'chat' && active && (
              <div className={s.chatView}>
                <div className={s.messages}>
                  {active.messages.length === 0 && (
                    <div className={s.noMsgs}>sem mensagens</div>
                  )}
                  {active.messages.map(m => (
                    <div key={m.id} className={m.isFromAdmin ? s.rowAdmin : s.rowUser}>
                      <div className={m.isFromAdmin ? s.bubbleAdmin : s.bubbleUser}>
                        <p className={s.bubbleText}>{m.body}</p>
                        <span className={s.bubbleTime}>{fmtTime(m.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                {active.status === 'OPEN' ? (
                  <div className={s.inputRow}>
                    <textarea
                      ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                      className={s.chatInput}
                      placeholder="escrever mensagem..."
                      value={msgText}
                      onChange={e => setMsgText(e.target.value)}
                      rows={1}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                      }}
                    />
                    <Button
                      variant="primary"
                      onClick={handleSend}
                      disabled={sending || !msgText.trim()}
                    ><Send size={14} /></Button>
                  </div>
                ) : (
                  <div className={s.closedBanner}>
                    <CheckCircle2 size={13} /> chamado encerrado
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      <button className={`${s.fab} ${open ? s.fabOpen : ''}`} onClick={toggleOpen} aria-label="suporte">
        {open ? <X size={20} /> : <HelpCircle size={22} />}
        {!open && openCount > 0 && <Chip>{openCount}</Chip>}
      </button>

    </div>
  )
}
