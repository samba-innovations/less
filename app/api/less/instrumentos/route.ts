import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const instrumentos = await db.lessInstrumentoAvaliativo.findMany({
    orderBy: { nome: 'asc' },
  })

  return NextResponse.json(instrumentos)
}
