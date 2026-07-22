import { NextRequest, NextResponse } from 'next/server'
import { getAuthCookie } from '@/lib/cookie'
import { verifyToken } from '@/lib/jwt'
import { getSchoolFromPayload } from '@/lib/school'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/messages/users?q=<query> → lista de usuários da mesma organização
// pra picker de "nova conversa" / "novo grupo". Exclui o próprio user.
export async function GET(req: NextRequest) {
  const token = await getAuthCookie()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let payload
  try { payload = await verifyToken(token) }
  catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const school = await getSchoolFromPayload(payload)
  if (!school) return NextResponse.json({ error: 'no school' }, { status: 400 })

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''

  const users = await db.user.findMany({
    where: {
      isActive: true,
      id: { not: payload.userId },
      orgRoles: { some: { organizationId: school.organizationId } },
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
    },
    select: { id: true, name: true, avatarUrl: true },
    orderBy: { name: 'asc' },
    take: 30,
  })

  return NextResponse.json({ users })
}
