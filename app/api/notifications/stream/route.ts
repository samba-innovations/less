import { getAuthCookie } from '@/lib/cookie'
import { verifyToken } from '@/lib/jwt'
import { db } from '@/lib/db'
import { addSubscriber, removeSubscriber, addSchoolSubscriber, removeSchoolSubscriber } from '@/lib/sse-broadcaster'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const token = await getAuthCookie()
  if (!token) return new Response('Unauthorized', { status: 401 })

  let payload
  try { payload = await verifyToken(token) }
  catch { return new Response('Unauthorized', { status: 401 }) }

  const userId = payload.userId
  const school = payload.orgSlug
    ? await db.school.findFirst({ where: { organization: { slug: payload.orgSlug } }, select: { id: true } })
    : null
  const enc = new TextEncoder()

  let ctrl: ReadableStreamDefaultController<Uint8Array>

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      ctrl = c
      addSubscriber(userId, ctrl)
      if (school) addSchoolSubscriber(school.id, ctrl)
      ctrl.enqueue(enc.encode(': connected\n\n'))
    },
    cancel() {
      removeSubscriber(userId, ctrl)
      if (school) removeSchoolSubscriber(school.id, ctrl)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache, no-transform',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
