import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const getInstrumentos = unstable_cache(
  () => db.lessInstrumentoAvaliativo.findMany({ orderBy: { nome: 'asc' } }),
  ['less-instrumentos'],
  { revalidate: 3600, tags: ['less-curriculum'] },
)

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  return NextResponse.json(await getInstrumentos())
}
