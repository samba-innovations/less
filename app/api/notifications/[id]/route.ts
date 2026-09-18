import { NextRequest, NextResponse } from 'next/server'
import { sessaoApi } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const s = await sessaoApi()
  if (!s.ok) return s.resposta
  const { payload } = s
  const { id } = await params

  await db.notification.updateMany({
    where: { id: Number(id), userId: payload.userId },
    data:  { read: true },
  })

  return NextResponse.json({ ok: true })
}
