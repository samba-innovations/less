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

function push(ctrls: Set<Controller>, event: string, data: object) {
  const enc = new TextEncoder()
  const msg = enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  for (const ctrl of ctrls) {
    try { ctrl.enqueue(msg) }
    catch { ctrls.delete(ctrl) }
  }
}

export function addSubscriber(userId: number, ctrl: Controller) {
  if (!state.subscribers.has(userId)) state.subscribers.set(userId, new Set())
  state.subscribers.get(userId)!.add(ctrl)
}

export function removeSubscriber(userId: number, ctrl: Controller) {
  state.subscribers.get(userId)?.delete(ctrl)
  if (state.subscribers.get(userId)?.size === 0) state.subscribers.delete(userId)
}

export function pushToUser(userId: number, event: string, data: object) {
  const ctrls = state.subscribers.get(userId)
  if (ctrls?.size) push(ctrls, event, data)
}

export function addSchoolSubscriber(schoolId: number, ctrl: Controller) {
  if (!state.schoolSubscribers.has(schoolId)) state.schoolSubscribers.set(schoolId, new Set())
  state.schoolSubscribers.get(schoolId)!.add(ctrl)
}

export function removeSchoolSubscriber(schoolId: number, ctrl: Controller) {
  state.schoolSubscribers.get(schoolId)?.delete(ctrl)
  if (state.schoolSubscribers.get(schoolId)?.size === 0) state.schoolSubscribers.delete(schoolId)
}

export function pushToSchool(schoolId: number, type: string, data: object) {
  const ctrls = state.schoolSubscribers.get(schoolId)
  if (ctrls?.size) push(ctrls, 'school_event', { type, ...data })
}
