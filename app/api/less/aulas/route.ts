import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Currículo SED é compartilhado e quase estático (sem PII) → cacheado no servidor.
// A autenticação fica FORA do cache (roda por request); só o dado é cacheado.
const getAulas = unstable_cache(
  (disciplina: string, serie: string, ciclo: string, bimestre: number) =>
    db.lessAula.findMany({
      where: { disciplinaNome: disciplina, serie, ciclo, bimestre },
      select: {
        id:                 true,
        aulaNum:            true,
        titulo:             true,
        eixo:               true,
        unidadeTematica:    true,
        habilidadeCodigo:   true,
        habilidadeTexto:    true,
        objetoConhecimento: true,
        conteudo:           true,
        objetivos:          true,
        bloco:              true,
      },
      orderBy: { aulaNum: 'asc' },
    }),
  ['less-aulas'],
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
    return NextResponse.json({ error: 'Parâmetros incompletos' }, { status: 400 })
  }

  return NextResponse.json(await getAulas(disciplina, serie, ciclo, bimestre))
}
