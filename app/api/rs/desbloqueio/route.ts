import { NextRequest, NextResponse } from 'next/server'
import { getDesbloqueioPainel, toggleRecomposicaoUnlock } from '@/lib/rs'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { painel, error } = await getDesbloqueioPainel()
  if (error) return NextResponse.json({ error }, { status: 403 })
  return NextResponse.json(painel)
}

export async function PUT(req: NextRequest) {
  const { gradeId, bimestre } = await req.json()
  const r = await toggleRecomposicaoUnlock(Number(gradeId), Number(bimestre))
  return NextResponse.json(r, { status: r.error ? 400 : 200 })
}
