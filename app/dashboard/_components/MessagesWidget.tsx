'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X, ArrowLeft, Send, Plus, Users, Search, UserPlus, Loader2 } from 'lucide-react'
import s from './messages-widget.module.css'
import { IconButton } from '../_components/IconButton'
import { Button } from '../_components/Button'
import { Avatar } from '../_components/Avatar'
import { formatName } from '@/lib/format-name'

// ── Types ─────────────────────────────────────────────────────────────────────

type UserLite = { id: number; name: string; avatarUrl: string | null }

type Participant = {
  threadId:   number
  userId:     number
  lastReadAt: string | null
  user:       UserLite
}

type LastMsg = { id: number; body: string; senderId: number; createdAt: string }

type Thread = {
  id:            number
  subject:       string | null
  lastMessageAt: string
  createdAt:     string
  participants:  Participant[]
  messages:      LastMsg[]      // último msg (pra preview no list)
  unread:        number
}

type Message = {
  id:            number
  threadId:      number
  senderId:      number
  body:          string
  attachmentUrl: string | null
  createdAt:     string
  sender?:       UserLite
}

type View = 'home' | 'thread' | 'new' | 'new-group'

// ── Utils ─────────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  if (diff < 60_000)     return 'agora'
  if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)}min`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

// Retorna a "outra pessoa" (num thread 1:1) — usada pra puxar avatar.
function otherParticipant(t: Thread, meId: number) {
  const others = t.participants.filter(p => p.userId !== meId)
  return others.length === 1 ? others[0].user : null
}

function threadTitle(t: Thread, meId: number) {
  if (t.subject) return t.subject
  const others = t.participants.filter(p => p.userId !== meId)
  if (others.length === 0) return '(só você)'
  if (others.length === 1) return others[0].user.name
  return others.map(o => o.user.name.split(' ')[0]).join(', ')
}

// ── Currently-logged-in user id: lê do endpoint /api/notifications (que checa auth)
// ── Alternativa: passar meId como prop do server. Fizemos leve, use um endpoint.
// Como todo widget precisa saber meId, expomos via body do bell primeiro fetch.
// Simplificação: usamos endpoint dedicado /api/me existente ou reusamos thread first
// item's participant. Como nem sempre há thread, criei GET /api/messages/users que
// já sabe quem sou (exclui meu id). Aqui, faço query no thread details pra achar.
//
// Solução pragmática: quando abre um thread, meId vem do próprio server context
// (o unread já está calculado no server usando payload.userId). Guardamos em state
// quando qualquer response vier.

// ── Component ────────────────────────────────────────────────────────────────

export function MessagesWidget() {
  const [meId, setMeId]       = useState<number | null>(null)
  const [open, setOpen]       = useState(false)
  const [view, setView]       = useState<View>('home')
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(false)
  const [active, setActive]   = useState<Thread | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [msgText, setMsgText] = useState('')
  const [sending, setSending] = useState(false)

  // New chat/group state
  const [pickerQ, setPickerQ]           = useState('')
  const [pickerUsers, setPickerUsers]   = useState<UserLite[]>([])
  const [selected, setSelected]         = useState<UserLite[]>([])
  const [groupSubject, setGroupSubject] = useState('')
  const [firstMessage, setFirstMessage] = useState('')
  const [creating, setCreating]         = useState(false)

  const listBottomRef = useRef<HTMLDivElement>(null)
  const inputRef      = useRef<HTMLTextAreaElement>(null)

  // ── Escuta evento externo (do MessageToast) pra abrir thread direto ──────
  useEffect(() => {
    async function onOpenThread(e: Event) {
      const detail = (e as CustomEvent<{ threadId: number }>).detail
      if (!detail?.threadId) return
      setOpen(true)
      // Carrega detalhes do thread + msgs direto
      setLoadingMessages(true); setView('thread'); setMessages([])
      const r = await fetch(`/api/messages/threads/${detail.threadId}`, { cache: 'no-store' })
      if (r.ok) {
        const data = await r.json() as { thread: Thread; messages: Message[] }
        setActive(data.thread)
        setMessages(data.messages)
      }
      setLoadingMessages(false)
      void fetch(`/api/messages/threads/${detail.threadId}/read`, { method: 'PATCH' })
    }
    window.addEventListener('samba:open-messages-thread', onOpenThread as EventListener)
    return () => window.removeEventListener('samba:open-messages-thread', onOpenThread as EventListener)
  }, [])

  // ── Fetch identity on mount ──────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/messages/me')
      .then(r => r.ok ? r.json() : null)
      .then((data: { userId: number } | null) => {
        if (data) setMeId(data.userId)
      })
      .catch(() => {})
  }, [])

  // ── Load threads ──────────────────────────────────────────────────────────
  const loadThreads = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/messages/threads', { cache: 'no-store' })
      if (!r.ok) return
      const data = await r.json() as { threads: Thread[] }
      setThreads(data.threads)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (open && view === 'home') loadThreads()
  }, [open, view, loadThreads])

  // ── Real-time: nova mensagem via SSE ──────────────────────────────────────
  useEffect(() => {
    const es = new EventSource('/api/notifications/stream')
    es.addEventListener('message', (e) => {
      try {
        const m = JSON.parse(e.data) as Message
        // Se estamos vendo este thread, adiciona à lista
        setMessages(prev => prev.some(p => p.id === m.id) ? prev : [...prev, m])
        // Atualiza lista de threads: sobe pro topo, atualiza lastMsg e unread
        setThreads(prev => {
          const idx = prev.findIndex(t => t.id === m.threadId)
          if (idx === -1) { void loadThreads(); return prev }
          const t = prev[idx]
          const updated: Thread = {
            ...t,
            lastMessageAt: m.createdAt,
            messages: [{ id: m.id, body: m.body, senderId: m.senderId, createdAt: m.createdAt }],
            unread: m.senderId === meId ? t.unread : t.unread + 1,
          }
          return [updated, ...prev.filter(x => x.id !== m.threadId)]
        })
      } catch { /* ignore */ }
    })
    return () => es.close()
  }, [meId, loadThreads])

  // ── Load thread + auto-scroll ─────────────────────────────────────────────
  async function openThread(t: Thread) {
    setActive(t); setView('thread'); setMessages([]); setLoadingMessages(true)
    try {
      const r = await fetch(`/api/messages/threads/${t.id}`, { cache: 'no-store' })
      if (!r.ok) return
      const data = await r.json() as { messages: Message[] }
      setMessages(data.messages)
    } finally { setLoadingMessages(false) }
    // marca como lido
    void fetch(`/api/messages/threads/${t.id}/read`, { method: 'PATCH' })
    // reset unread local
    setThreads(prev => prev.map(x => x.id === t.id ? { ...x, unread: 0 } : x))
    setTimeout(() => inputRef.current?.focus(), 80)
  }

  useEffect(() => {
    if (view === 'thread') listBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [view, messages.length])

  // ── Send ─────────────────────────────────────────────────────────────────
  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!active || !msgText.trim() || sending) return
    setSending(true)
    const text = msgText.trim()
    setMsgText('')
    try {
      const r = await fetch(`/api/messages/threads/${active.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      })
      if (r.ok) {
        const data = await r.json() as { message: Message }
        setMessages(prev => prev.some(p => p.id === data.message.id) ? prev : [...prev, data.message])
      }
    } finally { setSending(false); inputRef.current?.focus() }
  }

  // ── User picker ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (view !== 'new' && view !== 'new-group') return
    const ac = new AbortController()
    const t = setTimeout(async () => {
      const r = await fetch(`/api/messages/users?q=${encodeURIComponent(pickerQ)}`, { signal: ac.signal }).catch(() => null)
      if (!r?.ok) return
      const data = await r.json() as { users: UserLite[] }
      setPickerUsers(data.users)
    }, 200)
    return () => { clearTimeout(t); ac.abort() }
  }, [view, pickerQ])

  function toggleSelect(u: UserLite) {
    setSelected(prev => prev.some(p => p.id === u.id) ? prev.filter(p => p.id !== u.id) : [...prev, u])
  }

  async function createNewThread() {
    if (selected.length === 0) return
    const isGroup = view === 'new-group'
    if (isGroup && !groupSubject.trim()) return
    setCreating(true)
    try {
      const r = await fetch('/api/messages/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantIds: selected.map(u => u.id),
          subject:        isGroup ? groupSubject.trim() : undefined,
          firstMessage:   firstMessage.trim() || undefined,
        }),
      })
      if (!r.ok) return
      const data = await r.json() as { threadId: number }
      // Reset e reload
      setSelected([]); setGroupSubject(''); setFirstMessage(''); setPickerQ('')
      await loadThreads()
      // Encontra o thread criado e abre
      const created = threads.find(t => t.id === data.threadId)
      if (created) openThread(created)
      else setView('home')
    } finally { setCreating(false) }
  }

  const totalUnread = threads.reduce((sum, t) => sum + t.unread, 0)

  // Não renderiza até saber quem eu sou (evita flash de dados errados)
  if (meId === null) return null

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={s.root}>
      {open && (
        <div className={s.panel} role="dialog" aria-label="Mensagens">
          {view === 'home' && (
            <>
              <div className={s.head}>
                <MessageCircle size={16} />
                <span className={s.headTitle}>mensagens</span>
                <div className={s.headActions}>
                  <IconButton
                    icon={<Users size={14} />}
                    label="Novo grupo"
                    onClick={() => { setView('new-group'); setSelected([]) }}
                  />
                  <IconButton
                    icon={<Plus size={16} />}
                    label="Nova conversa"
                    onClick={() => { setView('new'); setSelected([]) }}
                  />
                  <IconButton
                    icon={<X size={14} />}
                    label="Fechar"
                    onClick={() => setOpen(false)}
                  />
                </div>
              </div>
              <div className={s.list}>
                {loading ? (
                  <div className={s.empty}><Loader2 size={18} className={s.spin}/></div>
                ) : threads.length === 0 ? (
                  <div className={s.empty}>
                    <MessageCircle size={24} strokeWidth={1.5}/>
                    <span>nenhuma conversa ainda</span>
                    <Button
                      variant="ghost"
                      iconLeft={<Plus size={12}/>}
                      onClick={() => setView('new')}
                    >iniciar conversa</Button>
                  </div>
                ) : (
                  threads.map(t => {
                    const preview = t.messages[0]
                    const isGroup = (t.subject && t.participants.length > 2) || t.participants.length > 2
                    const other   = otherParticipant(t, meId)
                    return (
                      <button key={t.id} className={s.threadItem} onClick={() => openThread(t)}>
                        <div className={`${s.avatar} ${isGroup ? s.avatarGroup : ''}`}>
                          {isGroup
                            ? <Users size={14}/>
                            : (other?.avatarUrl
                                ? <Avatar name={other.name} url={other.avatarUrl} />
                                : initials(threadTitle(t, meId)))}
                        </div>
                        <div className={s.threadBody}>
                          <div className={s.threadHead}>
                            <span className={s.threadTitle}>{threadTitle(t, meId)}</span>
                            <span className={s.threadTime}>{fmtDate(t.lastMessageAt)}</span>
                          </div>
                          <div className={s.threadPreview}>
                            <span>{preview?.body ?? '—'}</span>
                            {t.unread > 0 && <span className={s.unreadBadge}>{t.unread > 9 ? '9+' : t.unread}</span>}
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </>
          )}

          {view === 'thread' && active && (
            <>
              <div className={s.head}>
                <IconButton
                  icon={<ArrowLeft size={14} />}
                  label="arrowleft"
                  onClick={() => { setView('home'); setActive(null) }}
                />
                <span className={s.headTitle}>{threadTitle(active, meId)}</span>
                <div className={s.headActions}>
                  <IconButton
                    icon={<X size={14} />}
                    label="Fechar"
                    onClick={() => setOpen(false)}
                  />
                </div>
              </div>
              {active.participants.length > 2 && (
                <div className={s.subMeta}>
                  {active.participants.length} participantes
                </div>
              )}
              <div className={s.messages}>
                {loadingMessages ? (
                  <div className={s.empty}><Loader2 size={16} className={s.spin}/></div>
                ) : messages.length === 0 ? (
                  <div className={s.empty}><span>envie a primeira mensagem</span></div>
                ) : (
                  messages.map(m => (
                    <div key={m.id} className={`${s.msgRow} ${m.senderId === meId ? s.msgMine : ''}`}>
                      {m.senderId !== meId && (
                        <div className={s.msgAvatar} title={m.sender?.name}>
                          {m.sender?.avatarUrl
                            ? <Avatar name={m.sender.name} url={m.sender.avatarUrl} />
                            : initials(m.sender?.name ?? '?')}
                        </div>
                      )}
                      <div className={s.msgBubble}>
                        {active.participants.length > 2 && m.senderId !== meId && (
                          <span className={s.msgSender}>{m.sender?.name}</span>
                        )}
                        <span className={s.msgBody}>{m.body}</span>
                        <span className={s.msgTime}>{fmtTime(m.createdAt)}</span>
                      </div>
                    </div>
                  ))
                )}
                <div ref={listBottomRef}/>
              </div>
              <form className={s.composer} onSubmit={handleSend}>
                <textarea
                  ref={inputRef}
                  value={msgText}
                  onChange={e => setMsgText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(e as unknown as React.FormEvent) }
                  }}
                  placeholder="escrever mensagem..."
                  rows={1}
                  className={s.composerInput}
                />
                <Button
                  variant="primary"
                  disabled={sending || !msgText.trim()}
                  type="submit"
                >{sending ? <Loader2 size={14} className={s.spin}/> : <Send size={14}/>}</Button>
              </form>
            </>
          )}

          {(view === 'new' || view === 'new-group') && (
            <>
              <div className={s.head}>
                <IconButton
                  icon={<ArrowLeft size={14} />}
                  label="arrowleft"
                  onClick={() => setView('home')}
                />
                <span className={s.headTitle}>
                  {view === 'new-group' ? 'novo grupo' : 'nova conversa'}
                </span>
                <div className={s.headActions}>
                  <IconButton
                    icon={<X size={14} />}
                    label="Fechar"
                    onClick={() => setOpen(false)}
                  />
                </div>
              </div>
              {view === 'new-group' && (
                <input
                  className={s.formInput}
                  placeholder="nome do grupo..."
                  value={groupSubject}
                  onChange={e => setGroupSubject(e.target.value)}
                />
              )}
              <div className={s.pickerSearch}>
                <Search size={12}/>
                <input
                  placeholder="buscar pessoas..."
                  value={pickerQ}
                  onChange={e => setPickerQ(e.target.value)}
                />
              </div>
              {selected.length > 0 && (
                <div className={s.selectedChips}>
                  {selected.map(u => (
                    <button key={u.id} className={s.chip} onClick={() => toggleSelect(u)}>
                      {formatName(u.name)} <X size={10}/>
                    </button>
                  ))}
                </div>
              )}
              <div className={s.pickerList}>
                {pickerUsers.length === 0 ? (
                  <div className={s.empty}><span>{pickerQ ? 'ninguém encontrado' : 'digite pra buscar'}</span></div>
                ) : (
                  pickerUsers.map(u => {
                    const chosen = selected.some(s => s.id === u.id)
                    // Se for 1:1 (view='new'), clicar seleciona e permite finalizar
                    // Se for grupo, toggle na lista
                    return (
                      <button
                        key={u.id}
                        className={`${s.pickerItem} ${chosen ? s.pickerItemChosen : ''}`}
                        onClick={() => {
                          if (view === 'new-group') toggleSelect(u)
                          else { setSelected([u]); void 0 }
                        }}
                      >
                        <div className={s.avatar}>
                          {u.avatarUrl
                            ? <Avatar name={u.name} url={u.avatarUrl} />
                            : initials(u.name)}
                        </div>
                        <span>{formatName(u.name)}</span>
                        {view === 'new-group' && chosen && <span className={s.chosenMark}>✓</span>}
                      </button>
                    )
                  })
                )}
              </div>
              {selected.length > 0 && (
                <>
                  <textarea
                    className={s.formTextarea}
                    placeholder="primeira mensagem (opcional)..."
                    value={firstMessage}
                    onChange={e => setFirstMessage(e.target.value)}
                    rows={2}
                  />
                  <Button
                    variant="primary"
                    onClick={createNewThread}
                    disabled={creating || (view === 'new-group' && !groupSubject.trim())}
                  >{creating ? <Loader2 size={14} className={s.spin}/> : <UserPlus size={13}/>}
                    {view === 'new-group' ? 'criar grupo' : 'iniciar conversa'}</Button>
                </>
              )}
            </>
          )}
        </div>
      )}

      <button
        className={`${s.fab} ${open ? s.fabOpen : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-label="Mensagens"
        title="Mensagens"
      >
        <MessageCircle size={20}/>
        {totalUnread > 0 && (
          <span className={s.fabBadge}>{totalUnread > 9 ? '9+' : totalUnread}</span>
        )}
      </button>
    </div>
  )
}
