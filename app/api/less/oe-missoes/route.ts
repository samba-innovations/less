import { NextRequest, NextResponse } from 'next/server'
import { getAuthCookie } from '@/lib/cookie'
import { verifyToken } from '@/lib/jwt'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const token = await getAuthCookie()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try { await verifyToken(token) } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { searchParams } = new URL(req.url)
  const disciplinaTipo = searchParams.get('disciplinaTipo') ?? ''
  const ciclo          = searchParams.get('ciclo') ?? ''
  const serie          = searchParams.get('serie') ?? ''
  const bimestre       = searchParams.get('bimestre') ? Number(searchParams.get('bimestre')) : undefined

  if (!disciplinaTipo || !ciclo || !serie) {
    return NextResponse.json({ error: 'disciplinaTipo, ciclo e serie são obrigatórios.' }, { status: 400 })
  }

  const missoes = await db.lessOeMissao.findMany({
    where: {
      disciplinaTipo,
      ciclo,
      serie,
      ...(bimestre ? { bimestre } : {}),
    },
    orderBy: { missaoNum: 'asc' },
  })

  return NextResponse.json(missoes)
}
