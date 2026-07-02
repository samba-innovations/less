import { NextRequest, NextResponse } from 'next/server'
import { getMeusRelatorios, salvarRelatorioDraft, excluirRelatorio } from '@/lib/rs'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(await getMeusRelatorios())
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const r = await salvarRelatorioDraft(body)
  return NextResponse.json(r, { status: r.error ? 400 : 200 })
}

export async function DELETE(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get('id'))
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
  const r = await excluirRelatorio(id)
  return NextResponse.json(r, { status: r.error ? 400 : 200 })
}
