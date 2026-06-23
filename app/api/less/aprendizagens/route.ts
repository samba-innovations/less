import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Aprendizagens essenciais (SED) — compartilhadas e quase estáticas, sem PII.
const getAprendizagens = unstable_cache(
  (disciplina: string, serie: string, ciclo: string, bimestre: number) =>
    db.lessAprendizagemEssencial.findMany({
      where:   { disciplinaNome: disciplina, serie, ciclo, bimestre },
      select:  { id: true, codigo: true, descricao: true },
      orderBy: { codigo: 'asc' },
    }),
  ['less-aprendizagens'],
  { revalidate: 3600, tags: ['less-curriculum'] },
)

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const disciplina = searchParams.get('disciplina') ?? ''
  const serie      = searchParams.get('serie') ?? ''
  const ciclo      = searchParams.get('ciclo') ?? ''
  const bimestre   = Number(searchParams.get('bimestre') ?? 0)

  if (!disciplina || !serie || !ciclo || !bimestre) {
    return NextResponse.json([])
  }

  return NextResponse.json(await getAprendizagens(disciplina, serie, ciclo, bimestre))
}
