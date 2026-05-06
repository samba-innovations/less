type Controller = ReadableStreamDefaultController<Uint8Array>

const subscribers = new Map<number, Set<Controller>>()

export function addSubscriber(userId: number, ctrl: Controller) {
  if (!subscribers.has(userId)) subscribers.set(userId, new Set())
  subscribers.get(userId)!.add(ctrl)
}

export function removeSubscriber(userId: number, ctrl: Controller) {
  subscribers.get(userId)?.delete(ctrl)
  if (subscribers.get(userId)?.size === 0) subscribers.delete(userId)
}

export function pushToUser(userId: number, event: string, data: object) {
  const ctrls = subscribers.get(userId)
  if (!ctrls?.size) return
  const enc = new TextEncoder()
  const msg = enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  for (const ctrl of ctrls) {
    try { ctrl.enqueue(msg) }
    catch { ctrls.delete(ctrl) }
  }
}
