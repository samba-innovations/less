import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * Catálogo BNCC por nível de ensino, para o seletor de habilidades da eletiva.
 *
 * Lido por SQL direto: `skill_catalog` é tabela global e já existe no banco, mas
 * não está no recorte do schema Prisma do less. Consultar assim evita mexer no
 * schema por uma leitura de catálogo — é o mesmo dado, sem PII, compartilhado
 * por todas as escolas.
 */
type Habilidade = { codigo: string; descricao: string; area: string }

const porNivel = unstable_cache(
  async (level: string) => {
    const rows = await db.$queryRaw<Array<{ code: string; description: string; area: string | null }>>`
      SELECT code, description, area
        FROM skill_catalog
       WHERE level = ${level}
       ORDER BY area NULLS LAST, code`
    return rows.map(r => ({ codigo: r.code, descricao: r.description, area: r.area ?? 'Outras' }))
  },
  ['less-skill-catalog'],
  { revalidate: 3600, tags: ['less-curriculum'] },
)

/** O editor guarda `nivel_ensino` como 'medio'/'fundamental'; o catálogo, por extenso. */
const NIVEL: Record<string, string> = {
  medio:       'Ensino Médio',
  fundamental: 'Ensino Fundamental',
}

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const nivel = new URL(req.url).searchParams.get('nivel') ?? ''
  const level = NIVEL[nivel]
  if (!level) return NextResponse.json([] as Habilidade[])

  return NextResponse.json(await porNivel(level))
}
