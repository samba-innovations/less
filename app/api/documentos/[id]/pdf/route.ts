import { NextRequest, NextResponse } from 'next/server'
import { sessaoApi } from '@/lib/auth'
import { verifyToken, isManager, effectiveRole } from '@/lib/jwt'
import { db } from '@/lib/db'
import { generatePdf } from '@/lib/pdf'
import type { AprendizagemEssencial, AulaSelecionada, MissaoSelecionada } from '@/lib/pdf'
import { notify } from '@/lib/notify'
import { camposFaltando, listarFaltantes, type DocType } from '@/lib/doc-types'
import { oeMissoesForClass } from '@/lib/oe'
import { oeTipoFromNome } from '@/lib/oe-shared'
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
  let missoesOE: MissaoSelecionada[] | undefined

  // ── Currículo de OE ───────────────────────────────────────────────────────
  // O documento de OE não usa `aula_ids`: ele guarda as missões escolhidas em
  // `oe_missoes_sel` e as habilidades em `oe_habilidades_sel`. A rota lia só o
  // currículo regular, então o PDF saía sem nenhuma menção a missão — o tema e
  // os objetivos vinham (o editor os copia para os campos comuns), mas a missão
  // que os originou, não.
  //
  // A fonte é a mesma do editor, `oeMissoesForClass`, para o papel não divergir
  // da tela: é ela que aplica a regra dos livros (6º ao 9º e 1ª série EM usam o
  // livro do Fundamental; 2ª e 3ª, o do Médio).
  if (doc.type === 'OE_PLANO_AULA' || doc.type === 'OE_GUIA_APRENDIZAGEM') {
    const missoesSel = parseIds(content.oe_missoes_sel)
    // `oeClassId` vem da v1; `classId`, de documento criado na v2.
    const classId    = Number(content.oeClassId || content.classId || content._turma_id) || 0
    const disciplina = (content.oeDisciplina || content.disciplina || '').trim()
    const bimestre   = Number(content.bimestre) || undefined

    if (missoesSel.length > 0 && classId && disciplina) {
      const r = await oeMissoesForClass(ctx.school.id, classId, oeTipoFromNome(disciplina), bimestre)
      const escolhidas = (r.missoes ?? []).filter(m => missoesSel.includes(m.missaoNum))

      // Habilidades: as que a pessoa marcou; sem marcação, todas as da missão —
      // é o mesmo padrão do editor, que só filtra quando há escolha.
      const habsSel = new Set((content.oe_habilidades_sel ?? '').split(',').map(s => s.trim()).filter(Boolean))
      const filtra  = (hs: { codigo: string; descricao: string }[]) =>
        habsSel.size > 0 ? hs.filter(h => habsSel.has(h.codigo)) : hs

      missoesOE = escolhidas.map(m => ({
        missaoNum:   m.missaoNum,
        tema:        m.tema,
        semanasLabel: m.semanasLabel,
        aulasLabel:  m.aulasLabel,
        saebDescritores: m.saebDescritores,
        objetivosAprendizagem: m.objetivosAprendizagem,
        objetosConhecimento:   m.objetosConhecimento,
      }))

      // As habilidades do OE ocupam o lugar das aprendizagens essenciais: é o
      // mesmo papel no documento, e a tabela do PDF já existe.
      const habs = escolhidas.flatMap(m => filtra(m.habilidades))
      if (habs.length > 0) {
        const vistas = new Set<string>()
        aprendizagensEssenciais = habs
          .filter(h => !vistas.has(h.codigo) && vistas.add(h.codigo))
          .map(h => ({ codigo: h.codigo, descricao: h.descricao }))
      }
    }
  }

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
          // Um documento de OE que tenha aula_ids nao perde as habilidades do
          // OE resolvidas acima — o curriculo regular so preenche o que falta.
          aprendizagensEssenciais ??= aesRaw.map(ae => ({
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
      aprendizagensEssenciais ??= aesRaw.map(ae => ({ codigo: ae.codigo, descricao: ae.descricao }))
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
    missoesOE,
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
