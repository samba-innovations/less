import { NextRequest, NextResponse } from 'next/server'
import { sessaoApi } from '@/lib/auth'
import { verifyToken, isManager, effectiveRole } from '@/lib/jwt'
import { db } from '@/lib/db'
import { generatePdf } from '@/lib/pdf'
import type { AprendizagemEssencial, AulaSelecionada } from '@/lib/pdf'
import { notify } from '@/lib/notify'
import { camposFaltando, listarFaltantes, type DocType } from '@/lib/doc-types'
import { comNomesDaV2 } from '@/lib/legado-v1'

async function auth() {
  const s = await sessaoApi()
  if (!s.ok) return null
  const school = await db.school.findFirst({ where: { organization: { slug: s.payload.orgSlug } }, include: { organization: true } })
  return school ? { payload: s.payload, school } : null
}

/**
 * Ciclo e série do documento.
 *
 * O editor da v2 grava `_ciclo`/`_serie`; os documentos vindos da v1 trazem os
 * mesmos valores em `ciclo`/`serie`, sem underscore. Sem este fallback, todo
 * guia importado sai do PDF sem aulas e sem aprendizagens essenciais — a busca
 * exige as duas chaves.
 */
function cicloSerie(content: Record<string, string>) {
  return {
    ciclo: (content._ciclo || content.ciclo || '').trim(),
    serie: (content._serie || content.serie || '').trim(),
  }
}

function parseIds(raw: string | undefined): number[] {
  if (!raw) return []
  try {
    const v = JSON.parse(raw)
    if (Array.isArray(v)) return v.map(Number).filter(n => !isNaN(n))
  } catch { /* not json array */ }
  const n = Number(raw)
  return isNaN(n) ? [] : [n]
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await auth()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const manager = isManager(effectiveRole(ctx.payload))

  const doc = await db.lessDocument.findFirst({
    where: {
      id:       Number(id),
      schoolId: ctx.school.id,
      ...(manager ? {} : { userId: ctx.payload.userId }),
    },
    include: { user: { select: { name: true } } },
  })
  if (!doc) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  // A tela já barra antes de chamar aqui, mas a regra vale na rota também: sem
  // isto, uma chamada direta à API emite documento com campo obrigatório vazio.
  const conteudo = comNomesDaV2(doc.content as Record<string, string>)
  const faltando = camposFaltando(doc.type as DocType, conteudo)
  if (faltando.length > 0) {
    return NextResponse.json({
      error: `Preencha antes de emitir: ${listarFaltantes(faltando)}.`,
    }, { status: 422 })
  }

  const content = conteudo

  let aprendizagensEssenciais: AprendizagemEssencial[] | undefined
  let aulasSelecionadas: AulaSelecionada[] | undefined

  if (doc.type === 'PLANO_AULA' || doc.type === 'OE_PLANO_AULA') {
    const aulaIds = parseIds(content.aula_ids ?? content.aula_id)

    if (aulaIds.length > 0) {
      const aulas = await db.lessAula.findMany({
        where: { id: { in: aulaIds } },
        orderBy: { aulaNum: 'asc' },
      })
      aulasSelecionadas = aulas.map(a => ({
        aulaNum:   a.aulaNum,
        titulo:    a.titulo,
        conteudo:  a.conteudo,
        objetivos: a.objetivos,
      }))

      // Fetch AEs based on the first aula's bimestre/disciplina context
      if (aulas.length > 0) {
        const bimestreNum = Number(content.bimestre)
        const disciplinaNome = content.disciplina?.trim()

        if (bimestreNum && disciplinaNome) {
          const { ciclo, serie } = cicloSerie(content)
          const aesRaw = await db.lessAprendizagemEssencial.findMany({
            where: {
              // Nome exato, como no editor e como manda o db/curriculo/README:
              // "Química" e "Aprofundamento em Química" são disciplinas
              // distintas e não podem ser fundidas. Com `contains`, o plano de
              // Química puxava também as AEs do aprofundamento.
              disciplinaNome: disciplinaNome,
              bimestre: bimestreNum,
              ...(ciclo ? { ciclo } : {}),
              ...(serie ? { serie } : {}),
            },
            orderBy: { codigo: 'asc' },
          })
          aprendizagensEssenciais = aesRaw.map(ae => ({
            codigo:   ae.codigo,
            descricao: ae.descricao,
          }))
        }
      }
    }
  } else if (doc.type === 'GUIA_APRENDIZAGEM' || doc.type === 'OE_GUIA_APRENDIZAGEM') {
    // Guia: todas as aulas do bimestre + aprendizagens essenciais
    const bimestreNum      = Number(content.bimestre)
    // `disciplina_aulas_nome` é a ponte que a v1 gravava quando o nome do
    // cadastro difere do nome do currículo ("Liderança-Oratória" x "Liderança e
    // Oratória"); nos guias importados é ela que casa com less_aulas.
    const aulasNome        = (content._aulas_nome || content.disciplina_aulas_nome || content.disciplina || '').trim()
    const { ciclo, serie } = cicloSerie(content)

    if (bimestreNum && aulasNome && ciclo && serie) {
      const aulas = await db.lessAula.findMany({
        where:   { disciplinaNome: aulasNome, ciclo, serie, bimestre: bimestreNum },
        orderBy: { aulaNum: 'asc' },
      })
      aulasSelecionadas = aulas.map(a => ({
        aulaNum:   a.aulaNum,
        titulo:    a.titulo,
        conteudo:  a.conteudo,
        objetivos: a.objetivos,
      }))

      const aesRaw = await db.lessAprendizagemEssencial.findMany({
        where:   { disciplinaNome: aulasNome, bimestre: bimestreNum, ciclo, serie },
        orderBy: { codigo: 'asc' },
      })
      aprendizagensEssenciais = aesRaw.map(ae => ({ codigo: ae.codigo, descricao: ae.descricao }))
    }
  }

  // Pré-carrega SchoolInfo (institucional + logoBuffer do MinIO) no cache do
  // layout — sem isso o header/footer caem em fallback só com o nome da org.
  const { prepareSchoolInfo } = await import('@/lib/pdf/layout')
  const _si = await prepareSchoolInfo(ctx.school.organization.name)
  console.log(`[pdf-route] prepared schoolInfo: officialName=${_si.officialName ?? 'null'} logoBuf=${_si.logoBuffer?.length ?? 0}`)

  // Calendário do ano letivo do documento — o PDF do plano precisa dele para o
  // intervalo do período bimestral e para a janela ao lado do bimestre.
  const ano = Number(content.ano_letivo) || new Date().getFullYear()
  const doAno = await db.lessBimestre.findMany({ where: { ano }, orderBy: { numero: 'asc' } })
  // Documento sem ano letivo, ou de um ano que a escola ainda não cadastrou:
  // usa o calendário mais recente, que é melhor do que nenhuma data.
  const linhas = doAno.length > 0
    ? doAno
    : await db.lessBimestre.findMany({ orderBy: [{ ano: 'desc' }, { numero: 'asc' }], take: 4 })
  const bimestres: Record<number, { inicio: string; fim: string }> = {}
  for (const b of linhas) {
    bimestres[b.numero] ??= {
      inicio: b.dataInicio.toISOString().slice(0, 10),
      fim:    b.dataFim.toISOString().slice(0, 10),
    }
  }

  const buffer = await generatePdf({
    type:       doc.type as DocType,
    title:      doc.title,
    content,
    schoolName: ctx.school.organization.name,
    authorName: doc.user.name,
    createdAt:  new Date(),
    aprendizagensEssenciais,
    aulasSelecionadas,
    bimestres,
  })

  const wasAlreadyFinal = doc.status === 'FINAL'
  await db.lessDocument.update({
    where: { id: doc.id },
    data:  { status: 'FINAL' },
  })

  if (!wasAlreadyFinal) {
    const coordinators = await db.userOrganizationRole.findMany({
      where: {
        organizationId: ctx.school.organizationId,
        role: { in: ['PRINCIPAL', 'VICE_PRINCIPAL', 'COORDINATOR', 'TEACHER_COORDINATOR'] },
      },
      select: { userId: true },
    })
    await Promise.all(coordinators.map(c => notify({
      userId:         c.userId,
      organizationId: ctx.school.organizationId,
      type:           'LESS_DOC_FINAL',
      system:         'less',
      title:          'Documento finalizado',
      body:           `"${doc.title}" finalizado por ${doc.user.name}.`,
      link:           `/dashboard/documentos/${doc.id}`,
    })))
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${doc.id}.pdf"`,
    },
  })
}
