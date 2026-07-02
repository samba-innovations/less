import { NextRequest, NextResponse } from 'next/server'
import { getTurmasParaDiagnostico, salvarDiagnosticoTurma, excluirDiagnosticoTurma } from '@/lib/diagnostico'

export const dynamic = 'force-dynamic'

export async function GET() {
  const r = await getTurmasParaDiagnostico()
  return NextResponse.json(r, { status: r.error ? 400 : 200 })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const r = await salvarDiagnosticoTurma(body)
  return NextResponse.json(r, { status: r.error ? 400 : 200 })
}

export async function DELETE(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get('id'))
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
  const r = await excluirDiagnosticoTurma(id)
  return NextResponse.json(r, { status: r.error ? 400 : 200 })
}
