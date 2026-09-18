import { NextResponse } from 'next/server'
import { sessaoApi } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function getUser() {
  const s = await sessaoApi()
  return s.ok ? s.payload : null
}

export async function GET() {
  const payload = await getUser()
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const notifications = await db.notification.findMany({
    where:   { userId: payload.userId, system: 'less' },
    orderBy: { createdAt: 'desc' },
    take:    40,
  })

  return NextResponse.json(notifications)
}

export async function PATCH() {
  const payload = await getUser()
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await db.notification.updateMany({
    where: { userId: payload.userId, read: false, system: 'less' },
    data:  { read: true },
  })

  return NextResponse.json({ ok: true })
}
