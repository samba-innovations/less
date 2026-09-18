import { NextResponse } from 'next/server'
import { sessaoApi } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/messages/me → { userId } — pra o MessagesWidget renderizar "eu" corretamente
export async function GET() {
  const s = await sessaoApi()
  if (!s.ok) return s.resposta
  const { payload } = s
  return NextResponse.json({ userId: payload.userId })
}
