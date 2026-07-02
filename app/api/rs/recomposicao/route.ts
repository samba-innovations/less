import { NextRequest, NextResponse } from 'next/server'
import { getRecomposicaoStatus, salvarRecomposicaoCoord } from '@/lib/rs'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const gradeId = Number(req.nextUrl.searchParams.get('gradeId'))
  const bimestre = Number(req.nextUrl.searchParams.get('bimestre'))
  return NextResponse.json(await getRecomposicaoStatus(gradeId, bimestre))
}

export async function POST(req: NextRequest) {
  const { documentId, intervencoes } = await req.json()
  const r = await salvarRecomposicaoCoord(Number(documentId), intervencoes ?? [])
  return NextResponse.json(r, { status: r.error ? 400 : 200 })
}
