import { NextResponse } from 'next/server'
import { getAuthCookie } from '@/lib/cookie'
import { verifyToken } from '@/lib/jwt'

export const dynamic = 'force-dynamic'

// GET /api/messages/me → { userId } — pra o MessagesWidget renderizar "eu" corretamente
export async function GET() {
  const token = await getAuthCookie()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let payload
  try { payload = await verifyToken(token) }
  catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  return NextResponse.json({ userId: payload.userId })
}
