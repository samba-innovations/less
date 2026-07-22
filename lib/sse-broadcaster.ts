import { db } from './db'

type Controller = ReadableStreamDefaultController<Uint8Array>

type BroadcasterState = {
  subscribers:       Map<number, Set<Controller>>
  schoolSubscribers: Map<number, Set<Controller>>
}

declare global {
  // eslint-disable-next-line no-var
  var __sseBroadcaster: BroadcasterState | undefined
}

if (!global.__sseBroadcaster) {
  global.__sseBroadcaster = {
    subscribers:       new Map(),
    schoolSubscribers: new Map(),
  }
}

const state = global.__sseBroadcaster

// ID único por container. Usado pra deduplicar eventos no listener
// (skipa próprias mensagens vindas de volta pelo pg_notify).
export const CONTAINER_ID =
  globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)

const CHANNEL = 'samba_notifications'

function push(ctrls: Set<Controller>, event: string, data: object) {
  const enc = new TextEncoder()
  const msg = enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  for (const ctrl of ctrls) {
    try { ctrl.enqueue(msg) }
    catch { ctrls.delete(ctrl) }
  }
}

// ── Subscribers ──────────────────────────────────────────────────────────────

export function addSubscriber(userId: number, ctrl: Controller) {
  if (!state.subscribers.has(userId)) state.subscribers.set(userId, new Set())
  state.subscribers.get(userId)!.add(ctrl)
}

export function removeSubscriber(userId: number, ctrl: Controller) {
  state.subscribers.get(userId)?.delete(ctrl)
  if (state.subscribers.get(userId)?.size === 0) state.subscribers.delete(userId)
}

export function addSchoolSubscriber(schoolId: number, ctrl: Controller) {
  if (!state.schoolSubscribers.has(schoolId)) state.schoolSubscribers.set(schoolId, new Set())
  state.schoolSubscribers.get(schoolId)!.add(ctrl)
}

export function removeSchoolSubscriber(schoolId: number, ctrl: Controller) {
  state.schoolSubscribers.get(schoolId)?.delete(ctrl)
  if (state.schoolSubscribers.get(schoolId)?.size === 0) state.schoolSubscribers.delete(schoolId)
}

// ── Delivery LOCAL (chamado pelo pg-listener ao receber de outro container) ──

export function _deliverLocalUser(userId: number, event: string, data: object): boolean {
  const ctrls = state.subscribers.get(userId)
  if (!ctrls?.size) return false
  push(ctrls, event, data)
  return true
}

export function _deliverLocalSchool(schoolId: number, type: string, data: object): boolean {
  const ctrls = state.schoolSubscribers.get(schoolId)
  if (!ctrls?.size) return false
  push(ctrls, 'school_event', { type, ...data })
  return true
}

// ── API pública: local + pg_notify pra cross-container ──────────────────────
// notify() (lib/notify.ts) NÃO chama mais pushToUser — o INSERT dispara trigger
// DB que faz pg_notify automático. pushToUser é usado apenas para eventos
// transientes que não gravam no Notification (ex: 'CONTACT_LIST' no guardian).

export function pushToUser(userId: number, event: string, data: object) {
  _deliverLocalUser(userId, event, data)
  void db.$queryRaw`SELECT pg_notify(${CHANNEL}, ${JSON.stringify({
    kind: 'user', originator: CONTAINER_ID, userId, event, data,
  })})`.catch(() => {})
}

export function pushToSchool(schoolId: number, type: string, data: object) {
  _deliverLocalSchool(schoolId, type, data)
  void db.$queryRaw`SELECT pg_notify(${CHANNEL}, ${JSON.stringify({
    kind: 'school', originator: CONTAINER_ID, schoolId, event: type, data,
  })})`.catch(() => {})
}
