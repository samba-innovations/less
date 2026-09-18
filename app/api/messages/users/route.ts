import { NextRequest, NextResponse } from 'next/server'
import { apiComEscola } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/messages/users?q=<query> → lista de usuários da mesma organização
// pra picker de "nova conversa" / "novo grupo". Exclui o próprio user.
export async function GET(req: NextRequest) {
  const s = await apiComEscola()
  if (!s.ok) return s.resposta
  const { payload, school } = s

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
