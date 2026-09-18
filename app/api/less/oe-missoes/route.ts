import { NextRequest, NextResponse } from 'next/server'
import { sessaoApi } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const s = await sessaoApi()
  if (!s.ok) return s.resposta
  const { payload } = s

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
