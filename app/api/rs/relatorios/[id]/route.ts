import { NextRequest, NextResponse } from 'next/server'
import { getRelatorio } from '@/lib/rs'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const doc = await getRelatorio(Number(id))
  if (!doc) return NextResponse.json({ error: 'não encontrado' }, { status: 404 })
  return NextResponse.json(doc)
}
