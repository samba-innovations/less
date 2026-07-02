import { NextResponse } from 'next/server'
import { getCatalogos } from '@/lib/rs'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { catalogos, error } = await getCatalogos()
  if (error) return NextResponse.json({ error }, { status: 403 })
  return NextResponse.json(catalogos)
}
