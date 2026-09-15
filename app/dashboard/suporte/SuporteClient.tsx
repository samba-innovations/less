'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { Plus, Send, X, ChevronLeft, CheckCircle2, Clock, Play } from 'lucide-react'
import { createTicket, addMessage, closeTicket } from './actions'
import { FormModal, ms } from '../_components/FormModal'
import s from './suporte.module.css'
import { Input } from '../_components/Input'
import { Button } from '../_components/Button'

type Msg    = { id: number; body: string; authorName: string; isFromAdmin: boolean; createdAt: Date }
type Ticket = { id: number; subject: string; status: string; createdAt: Date; updatedAt: Date; messages: Msg[] }

type Props = { tickets: Ticket[]; systemName: string; videoUrl?: string }

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function SuporteClient({ tickets: initial, systemName, videoUrl }: Props) {
  const [tickets, setTickets]   = useState<Ticket[]>(initial)
  const [active, setActive]     = useState<Ticket | null>(null)
  const [showNew, setShowNew]   = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [newBody,    setNewBody]    = useState('')
  const [msgText, setMsgText]   = useState('')
  const [isPending, start]      = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [active?.messages.length])

  // sync active ticket when tickets list updates (server revalidation)
  useEffect(() => {
    if (active) {
      const updated = tickets.find(t => t.id === active.id)
      if (updated) setActive(updated)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets])

  async function handleCreate() {
    await createTicket(newSubject.trim(), newBody.trim())
    setShowNew(false)
    setNewSubject(''); setNewBody('')
    window.location.reload()
  }

  function handleSend() {
    if (!active || !msgText.trim()) return
    const body = msgText.trim()
    setMsgText('')
    start(async () => {
      try {
        await addMessage(active.id, body)
        window.location.reload()
      } catch { /* ignore */ }
    })
  }

  function handleClose() {
    if (!active) return
    start(async () => {
      await closeTicket(active.id)
      window.location.reload()
    })
  }

  return (
    <div className={s.page}>

      {/* ── New ticket modal ── */}
      {showNew && (
        <FormModal
          mode="create"
          entityLabel="chamado"
          subtitle="descreva sua dúvida ou problema"
          size="sm"
          submitLabel="abrir chamado"
          pendingLabel="enviando..."
          onClose={() => { setShowNew(false); setNewSubject(''); setNewBody('') }}
          onSubmit={handleCreate}
          validate={() => {
            if (!newSubject.trim()) return 'Informe o assunto.'
            if (!newBody.trim())    return 'Descreva o problema.'
            return null
          }}
        >
          <Input
            label="assunto *"
            placeholder="Ex: como cadastrar um aluno?"
            value={newSubject}
            onChange={e => setNewSubject(e.target.value)}
            required
            autoFocus
          />
          <div className={ms.field}>
            <label className={ms.label}>mensagem *</label>
            <textarea className={ms.textarea} rows={4} placeholder="Descreva em detalhes..." required
              value={newBody} onChange={e => setNewBody(e.target.value)} />
          </div>
        </FormModal>
      )}

      {/* ── Header ── */}
      <div className={s.header}>
        {active ? (
          <Button
            variant="ghost"
            iconLeft={<ChevronLeft size={16} />}
            onClick={() => setActive(null)}
          >chamados</Button>
        ) : (
          <div>
            <h1 className={s.title}>suporte</h1>
            <p className={s.subtitle}>dúvidas e solicitações</p>
          </div>
        )}
        {!active && (
          <Button
            variant="primary"
            iconLeft={<Plus size={14} />}
            onClick={() => { setShowNew(true); setNewSubject(''); setNewBody('') }}
          >novo chamado</Button>
        )}
      </div>

      {/* ── Content ── */}
      {!active ? (
        <div className={s.layout}>

          {/* Video */}
          <div className={videoUrl ? `${s.videoCard} ${s.videoCardEmbed}` : s.videoCard}>
            {videoUrl ? (
              <div className={s.videoThumbEmbed}>
                <iframe
                  src={videoUrl}
                  title={`Tutorial ${systemName}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className={s.videoIframe}
                />
              </div>
            ) : (
              <div className={s.videoThumb}>
                <div className={s.playBtn}><Play size={28} fill="white" /></div>
              </div>
            )}
            <div className={s.videoInfo}>
              <span className={s.videoLabel}>tutorial</span>
              <p className={s.videoTitle}>como usar o samba {systemName}</p>
              <p className={s.videoDesc}>assista ao vídeo de introdução para entender todas as funcionalidades do sistema.</p>
            </div>
          </div>

          {/* Ticket list */}
          <div className={s.ticketSection}>
            <span className={s.sectionLabel}>meus chamados</span>
            {tickets.length === 0 && (
              <div className={s.empty}>nenhum chamado aberto ainda</div>
            )}
            {tickets.map(t => (
              <button key={t.id} className={s.ticketRow} onClick={() => setActive(t)}>
                <div className={s.ticketMeta}>
                  <span className={t.status === 'OPEN' ? s.statusOpen : s.statusClosed}>
                    {t.status === 'OPEN' ? <Clock size={11} /> : <CheckCircle2 size={11} />}
                    {t.status === 'OPEN' ? 'aberto' : 'encerrado'}
                  </span>
                  <span className={s.ticketDate}>{formatDate(t.updatedAt)}</span>
                </div>
                <p className={s.ticketSubject}>{t.subject}</p>
                <p className={s.ticketPreview}>
                  {t.messages[t.messages.length - 1]?.body ?? ''}
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className={s.chat}>

          {/* Chat header */}
          <div className={s.chatHeader}>
            <p className={s.chatSubject}>{active.subject}</p>
            <div className={s.chatHeaderRight}>
              <span className={active.status === 'OPEN' ? s.statusOpen : s.statusClosed}>
                {active.status === 'OPEN' ? <Clock size={11} /> : <CheckCircle2 size={11} />}
                {active.status === 'OPEN' ? 'aberto' : 'encerrado'}
              </span>
              {active.status === 'OPEN' && (
                <Button
                  variant="ghost"
                  iconLeft={<X size={13} />}
                  onClick={handleClose}
                  disabled={isPending}
                >encerrar</Button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className={s.messages}>
            {active.messages.map(m => (
              <div key={m.id} className={m.isFromAdmin ? s.msgAdmin : s.msgUser}>
                <div className={m.isFromAdmin ? s.bubbleAdmin : s.bubbleUser}>
                  <p className={s.bubbleBody}>{m.body}</p>
                  <span className={s.bubbleMeta}>{m.authorName} · {formatDate(m.createdAt)}</span>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {active.status === 'OPEN' && (
            <div className={s.inputRow}>
              <textarea
                className={s.chatInput}
                placeholder="escrever mensagem..."
                value={msgText}
                onChange={e => setMsgText(e.target.value)}
                rows={2}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                }}
              />
              <Button
                variant="primary"
                onClick={handleSend}
                disabled={isPending || !msgText.trim()}
              ><Send size={16} /></Button>
            </div>
          )}
          {active.status === 'CLOSED' && (
            <p className={s.closedNote}>este chamado foi encerrado.</p>
          )}
        </div>
      )}
    </div>
  )
}
