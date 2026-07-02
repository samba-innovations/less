import { NextRequest, NextResponse } from 'next/server'
import { getAprendizagensFase2 } from '@/lib/rs'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const disciplineId = Number(sp.get('disciplineId'))
  const gradeId = Number(sp.get('gradeId'))
  const bimestres = (sp.get('bimestres') ?? '').split(',').map(Number).filter(Number.isFinite)
  if (!disciplineId || !gradeId || bimestres.length === 0) return NextResponse.json({ error: 'params obrigatórios' }, { status: 400 })
  const r = await getAprendizagensFase2(disciplineId, gradeId, bimestres)
  if (r.error) return NextResponse.json({ error: r.error }, { status: 400 })
  return NextResponse.json(r)
}
