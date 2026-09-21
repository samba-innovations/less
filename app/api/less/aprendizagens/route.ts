import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Aprendizagens essenciais (SED) — compartilhadas e quase estáticas, sem PII.
// `bimestres` como lista ("2,3"), pelo mesmo motivo da rota de aulas: o plano
// pode cobrir mais de um bimestre, e a string mantém a chave do cache estável.
const getAprendizagens = unstable_cache(
  (disciplina: string, serie: string, ciclo: string, bimestres: string) =>
    db.lessAprendizagemEssencial.findMany({
      where: {
        disciplinaNome: disciplina, serie, ciclo,
        bimestre: { in: bimestres.split(',').map(Number).filter(Number.isFinite) },
      },
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
  const bimestres = [...new Set(
    (searchParams.get('bimestre') ?? '')
      .split(',').map(n => Number(n.trim()))
      .filter(n => Number.isFinite(n) && n > 0),
  )].sort((a, b) => a - b)

  if (!disciplina || !serie || !ciclo || bimestres.length === 0) {
    return NextResponse.json([])
  }

  return NextResponse.json(await getAprendizagens(disciplina, serie, ciclo, bimestres.join(',')))
}
