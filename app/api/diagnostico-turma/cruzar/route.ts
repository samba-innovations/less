import { NextRequest, NextResponse } from 'next/server'
import { cruzarTurma } from '@/lib/diagnostico'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const classId = Number(req.nextUrl.searchParams.get('classId'))
  if (!classId) return NextResponse.json({ error: 'classId obrigatório' }, { status: 400 })
  const r = await cruzarTurma(classId)
  return NextResponse.json(r, { status: r.error ? 400 : 200 })
}
