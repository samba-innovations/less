import { NextResponse } from 'next/server'
import { getRelatorioContext } from '@/lib/rs'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { ctx, error } = await getRelatorioContext()
  if (error) return NextResponse.json({ error }, { status: 403 })
  return NextResponse.json(ctx)
}
