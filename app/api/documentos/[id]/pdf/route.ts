import { NextRequest, NextResponse } from 'next/server'
import { getAuthCookie } from '@/lib/cookie'
import { verifyToken, isManager, effectiveRole } from '@/lib/jwt'
import { db } from '@/lib/db'
import { generatePdf } from '@/lib/pdf'
import type { AprendizagemEssencial, AulaSelecionada } from '@/lib/pdf'
import { notify } from '@/lib/notify'
import type { DocType } from '@/lib/doc-types'

async function auth() {
  const token = await getAuthCookie()
  if (!token) return null
  try {
    const payload = await verifyToken(token)
    const school  = await db.school.findFirst({ where: { organization: { slug: payload.orgSlug } }, include: { organization: true } })
    return school ? { payload, school } : null
  } catch { return null }
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

  const content = doc.content as Record<string, string>

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
          const aesRaw = await db.lessAprendizagemEssencial.findMany({
            where: {
              disciplinaNome: { contains: disciplinaNome, mode: 'insensitive' },
              bimestre: bimestreNum,
              ...(content._ciclo ? { ciclo: content._ciclo } : {}),
              ...(content._serie ? { serie: content._serie } : {}),
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
    const bimestreNum    = Number(content.bimestre)
    const aulasNome      = (content._aulas_nome || content.disciplina || '').trim()
    const ciclo          = content._ciclo
    const serie          = content._serie

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
        where:   { disciplinaNome: { contains: aulasNome, mode: 'insensitive' }, bimestre: bimestreNum, ciclo, serie },
        orderBy: { codigo: 'asc' },
      })
      aprendizagensEssenciais = aesRaw.map(ae => ({ codigo: ae.codigo, descricao: ae.descricao }))
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
