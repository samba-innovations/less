import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Currículo SED é compartilhado e quase estático (sem PII) → cacheado no servidor.
// A autenticação fica FORA do cache (roda por request); só o dado é cacheado.
// `bimestres` chega como lista ordenada ("2,3"): um plano pode cobrir mais de um
// bimestre — recuperação atravessa o fechamento. Vem como string porque é ela
// que forma a chave do unstable_cache; array daria chave instável.
const getAulas = unstable_cache(
  (disciplina: string, serie: string, ciclo: string, bimestres: string) =>
    db.lessAula.findMany({
      where: {
        disciplinaNome: disciplina, serie, ciclo,
        bimestre: { in: bimestres.split(',').map(Number).filter(Number.isFinite) },
      },
      select: {
        id:                 true,
        aulaNum:            true,
        bimestre:           true,
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
      orderBy: [{ bimestre: 'asc' }, { aulaNum: 'asc' }],
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
  // Aceita "3" e "2,3" — o formato antigo continua valendo.
  const bimestres = [...new Set(
    (searchParams.get('bimestre') ?? '')
      .split(',').map(n => Number(n.trim()))
      .filter(n => Number.isFinite(n) && n > 0),
  )].sort((a, b) => a - b)

  if (!disciplina || !serie || !ciclo || bimestres.length === 0) {
    return NextResponse.json({ error: 'Parâmetros incompletos' }, { status: 400 })
  }

  return NextResponse.json(await getAulas(disciplina, serie, ciclo, bimestres.join(',')))
}
