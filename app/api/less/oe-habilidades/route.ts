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

  if (!disciplinaTipo || !ciclo || !serie) {
    return NextResponse.json({ error: 'disciplinaTipo, ciclo e serie são obrigatórios.' }, { status: 400 })
  }

  const habilidades = await db.lessOeHabilidade.findMany({
    where: { disciplinaTipo, ciclo, serie },
    orderBy: [{ eixoCognitivo: 'asc' }, { codigo: 'asc' }],
  })

  return NextResponse.json(habilidades)
}
