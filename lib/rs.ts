// =============================================================================
// rs.ts — backend do Relatório-Síntese (migrado do samba-paper v1 → v2)
// Auth por cookie+escola, LessDocument (schoolId), grade EF/EM, tabelas rs_*.
// =============================================================================
import { getAuthCookie } from '@/lib/cookie'
import { verifyToken, effectiveRole, isManager, type JwtPayload } from '@/lib/jwt'
import { getSchoolFromPayload } from '@/lib/school'
import { db } from '@/lib/db'
import { disciplinaElegivel, disciplinaEmMatriz, cicloSerieFromGrade, norm as normDisc } from '@/lib/matriz-curricular'
import {
  ENABLED_BIMESTRES,
  type RsContext, type RsDisciplina, type RsAprendizagem,
  type RsCatalogos, type CoordProfessor, type DesbloqueioPainel, type EstrategiaSel,
} from '@/lib/rs-shared'

const ANO_ATUAL = new Date().getFullYear()

type Ctx = { payload: JwtPayload; userId: number; schoolId: number; name: string }
async function auth(): Promise<Ctx | null> {
  const token = await getAuthCookie()
  if (!token) return null
  try {
    const payload = await verifyToken(token)
    const school = await getSchoolFromPayload(payload)
    if (!school) return null
    const user = await db.user.findUnique({ where: { id: payload.userId }, select: { name: true } })
    return { payload, userId: payload.userId, schoolId: school.id, name: user?.name ?? '' }
  } catch { return null }
}

/** Produz o relatório: professor / professor-coordenador / admin. */
function canCreateRs(p: JwtPayload): boolean {
  const r = (p.role ?? '').toUpperCase()
  return !!p.isAdmin || ['TEACHER', 'TEACHER_COORDINATOR', 'COORDINATOR', 'PRINCIPAL', 'VICE_PRINCIPAL'].includes(r)
}
/** Coordenação/direção/admin: visão ampla. */
function canView(p: JwtPayload): boolean { return isManager(effectiveRole(p)) }
/** Coordenação pura: gerencia recomposição (desbloqueio 4ª fase). */
function canManage(p: JwtPayload): boolean { return isManager(effectiveRole(p)) }

type ActionResult<T> = { error?: string } & T

// ── Fase 1: contexto (disciplinas elegíveis do professor + turmas) ────────────
export async function getRelatorioContext(): Promise<{ error?: string; ctx?: RsContext }> {
  const ctx = await auth()
  if (!ctx) return { error: 'Não autenticado.' }
  if (!canCreateRs(ctx.payload)) return { error: 'Sem permissão.' }

  const assignments = await db.teacherAssignment.findMany({
    where: { userId: ctx.userId, schoolId: ctx.schoolId },
    select: {
      discipline: { select: { id: true, name: true, aulasNome: true } },
      class: { select: { id: true, name: true, grade: { select: { id: true, level: true, order: true, name: true } } } },
    },
  })

  const discMap = new Map<number, RsDisciplina>()
  for (const a of assignments) {
    if (!a.class) continue
    const g = a.class.grade
    const { ciclo, serie } = cicloSerieFromGrade(g)
    if (!disciplinaElegivel(a.discipline.name, ciclo)) continue
    let disc = discMap.get(a.discipline.id)
    if (!disc) {
      disc = { disciplineId: a.discipline.id, name: a.discipline.name, disciplinaNome: a.discipline.aulasNome ?? a.discipline.name, grades: [] }
      discMap.set(a.discipline.id, disc)
    }
    let grade = disc.grades.find(x => x.gradeId === g.id)
    if (!grade) { grade = { gradeId: g.id, gradeLabel: g.name, ciclo, serie, turmas: [] }; disc.grades.push(grade) }
    if (!grade.turmas.some(t => t.classId === a.class!.id)) grade.turmas.push({ classId: a.class.id, name: a.class.name })
  }
  const disciplinas = [...discMap.values()].sort((a, b) => a.name.localeCompare(b.name))
  for (const d of disciplinas) {
    d.grades.sort((a, b) => a.gradeLabel.localeCompare(b.gradeLabel))
    for (const g of d.grades) g.turmas.sort((a, b) => a.name.localeCompare(b.name))
  }
  return { ctx: { professorNome: ctx.name, disciplinas } }
}

// ── Fase 2: AEs + habilidades para (disciplina, série, bimestre) ──────────────
export async function getAprendizagensFase2(disciplineId: number, gradeId: number, bimestres: number | number[]): Promise<{ error?: string; aes?: RsAprendizagem[]; habilidades?: RsAprendizagem[] }> {
  const ctx = await auth()
  if (!ctx) return { error: 'Não autenticado.' }
  if (!canCreateRs(ctx.payload)) return { error: 'Sem permissão.' }
  const bims = [...new Set((Array.isArray(bimestres) ? bimestres : [bimestres]).map(Number))].filter(b => ENABLED_BIMESTRES.includes(b))
  if (bims.length === 0) return { error: 'Bimestre indisponível.' }

  const asg = await db.teacherAssignment.findFirst({
    where: { userId: ctx.userId, schoolId: ctx.schoolId, disciplineId, class: { gradeId } },
    select: { discipline: { select: { name: true, aulasNome: true } }, class: { select: { grade: { select: { level: true, order: true } } } } },
  })
  if (!asg?.class) return { error: 'Disciplina/turma não atribuída a você.' }
  const dn = asg.discipline.aulasNome?.trim() || asg.discipline.name
  const { ciclo, serie } = cicloSerieFromGrade(asg.class.grade)
  const dnc = normDisc(dn)

  const [aeAll, aulaAll] = await Promise.all([
    db.lessAprendizagemEssencial.findMany({ where: { ciclo, serie, bimestre: { in: bims } }, select: { codigo: true, descricao: true, descritores: true, habilidadePriorizada: true, disciplinaNome: true }, orderBy: { codigo: 'asc' } }),
    db.lessAula.findMany({ where: { ciclo, serie, bimestre: { in: bims } }, select: { habilidadeCodigo: true, habilidadeTexto: true, eixo: true, disciplinaNome: true }, orderBy: { habilidadeCodigo: 'asc' } }),
  ])
  const aeRows = aeAll.filter(r => normDisc(r.disciplinaNome) === dnc)
  const aulaRows = aulaAll.filter(r => normDisc(r.disciplinaNome) === dnc)

  const aeSeen = new Set<string>()
  const aes: RsAprendizagem[] = []
  for (const r of aeRows) {
    const key = `${r.codigo}|${r.descricao}`
    if (aeSeen.has(key)) continue
    aeSeen.add(key)
    aes.push({ tipo: 'AE', codigo: r.codigo, descricao: r.descricao, habilidade: r.habilidadePriorizada, descritores: r.descritores })
  }
  const seen = new Set<string>()
  const habilidades: RsAprendizagem[] = []
  for (const a of aulaRows) {
    const cod = a.habilidadeCodigo?.trim(); const txt = a.habilidadeTexto?.trim()
    if (!cod && !txt) continue
    const key = `${cod ?? ''}|${txt ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    habilidades.push({ tipo: 'HAB', codigo: cod || '—', descricao: txt || '', eixo: a.eixo })
  }
  return { aes, habilidades }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RsContent = Record<string, any>

export async function salvarRelatorioDraft(input: { id?: number; content: RsContent; title?: string; finalize?: boolean }): Promise<ActionResult<{ id?: number; title?: string; status?: string }>> {
  const ctx = await auth()
  if (!ctx) return { error: 'Não autenticado.' }
  if (!canCreateRs(ctx.payload)) return { error: 'Sem permissão.' }
  const c = input.content ?? {}
  if (c.bimestre != null && !ENABLED_BIMESTRES.includes(Number(c.bimestre))) return { error: 'Bimestre indisponível.' }
  if (Array.isArray(c.bimestres) && c.bimestres.some((b: unknown) => !ENABLED_BIMESTRES.includes(Number(b)))) return { error: 'Bimestre indisponível.' }

  if (c.disciplineId) {
    const disc = await db.discipline.findFirst({ where: { id: Number(c.disciplineId) || 0, schoolId: ctx.schoolId }, select: { name: true } })
    if (!disc || !disciplinaEmMatriz(disc.name)) return { error: 'Esta disciplina não exige Relatório-Síntese.' }
  }
  // 4ª fase só existe se a coordenação liberou o ciclo (ano+bimestre+série)
  if (c.fase4 && c.gradeId != null && c.bimestre != null) {
    const unlocked = await db.rsRecomposicaoUnlock.findUnique({ where: { ano_bimestre_gradeId: { ano: Number(c.ano) || ANO_ATUAL, bimestre: Number(c.bimestre), gradeId: Number(c.gradeId) } }, select: { id: true } })
    if (!unlocked) delete c.fase4
  }
  if (Array.isArray(c.classIds) && c.classIds.length > 0) {
    const ids = c.classIds.map((n: unknown) => Number(n)).filter((n: number) => Number.isFinite(n))
    const turmas = await db.teacherAssignment.findMany({ where: { userId: ctx.userId, schoolId: ctx.schoolId, disciplineId: Number(c.disciplineId) || 0, classId: { in: ids } }, select: { class: { select: { id: true, gradeId: true } } }, distinct: ['classId'] })
    const gids = new Set(turmas.map(t => t.class.gradeId))
    if (turmas.length !== ids.length || gids.size > 1) return { error: 'Turmas inválidas: precisam ser suas, da disciplina e da mesma série.' }
  }
  if (input.finalize) {
    if (!c.disciplineId || !Array.isArray(c.classIds) || c.classIds.length === 0) return { error: 'Selecione disciplina e turmas antes de finalizar.' }
    if (c.bimestre == null || !Array.isArray(c.aprendizagens) || c.aprendizagens.length === 0) return { error: 'Selecione o bimestre e ao menos uma aprendizagem antes de finalizar.' }
    let totalDescr = 0, pos = 0, neg = 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const a of c.aprendizagens as any[]) {
      if (a?.tipo !== 'AE') continue
      totalDescr += Array.isArray(a.descritores) ? a.descritores.length : 0
      pos += Array.isArray(a.descritoresPos) ? a.descritoresPos.length : 0
      neg += Array.isArray(a.descritoresNeg) ? a.descritoresNeg.length : 0
    }
    if (pos > 2 || neg > 2) return { error: 'No máximo 2 descritores de melhor e 2 de pior desempenho.' }
    if (totalDescr >= 4 && (pos !== 2 || neg !== 2)) return { error: 'Classifique 4 descritores: 2 de melhor desempenho (✓) e 2 de pior desempenho (✗).' }
  }

  const serieTxt = c.serie ? `${c.serie}ª` : ''
  const title = input.title?.trim() || `Relatório-Síntese — ${c.disciplineNome ?? ''} ${serieTxt}`.replace(/\s+/g, ' ').trim()
  const status = input.finalize ? 'FINAL' : 'DRAFT'

  if (input.id) {
    const owned = await db.lessDocument.findFirst({ where: { id: input.id, userId: ctx.userId, schoolId: ctx.schoolId, type: 'RELATORIO_SINTESE', deletedAt: null }, select: { id: true, content: true } })
    if (!owned) return { error: 'Relatório não encontrado.' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prev: any = owned.content ?? {}
    if (!c.fase4 && prev.fase4) c.fase4 = prev.fase4
    await db.lessDocument.update({ where: { id: input.id }, data: { content: c, title, status } })
    return { id: input.id, title, status }
  }
  const doc = await db.lessDocument.create({ data: { schoolId: ctx.schoolId, userId: ctx.userId, type: 'RELATORIO_SINTESE', title, content: c, status } })
  return { id: doc.id, title, status }
}

export async function getCatalogos(): Promise<{ error?: string; catalogos?: RsCatalogos }> {
  const ctx = await auth()
  if (!ctx) return { error: 'Não autenticado.' }
  if (!canCreateRs(ctx.payload) && !canView(ctx.payload)) return { error: 'Sem permissão.' }
  const [cats, difs, ints] = await Promise.all([
    db.rsCategoria.findMany({ orderBy: { nome: 'asc' } }),
    db.rsDificuldade.findMany({ where: { ativo: true }, orderBy: [{ categoriaId: 'asc' }, { id: 'asc' }] }),
    db.rsIntervencao.findMany({ where: { ativo: true }, orderBy: { id: 'asc' } }),
  ])
  return {
    catalogos: {
      categorias: cats.map(c => ({ id: c.id, nome: c.nome, cor: c.cor, icone: c.icone })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dificuldades: difs.map(d => ({ id: d.id, categoriaId: d.categoriaId, titulo: d.titulo, descricaoCurta: d.descricaoCurta, descricaoCompleta: d.descricaoCompleta, textoRelatorio: d.textoRelatorio, nivel: (d.nivel as any) ?? {}, indicadores: d.indicadores, possiveisCausas: d.possiveisCausas, intervencoesSugeridas: d.intervencoesSugeridas, competencias: d.competencias, cor: d.cor, icone: d.icone })),
      intervencoes: ints.map(i => ({ id: i.id, categoria: i.categoria, titulo: i.titulo, objetivo: i.objetivo, textoRelatorio: i.textoRelatorio, indicadaPara: i.indicadaPara })),
    },
  }
}

export async function getMeusRelatorios() {
  const ctx = await auth()
  if (!ctx || !canCreateRs(ctx.payload)) return []
  return db.lessDocument.findMany({ where: { userId: ctx.userId, schoolId: ctx.schoolId, type: 'RELATORIO_SINTESE', deletedAt: null }, select: { id: true, title: true, status: true, updatedAt: true, content: true }, orderBy: { updatedAt: 'desc' } })
}

export async function excluirRelatorio(id: number): Promise<ActionResult<{ ok?: boolean }>> {
  const ctx = await auth()
  if (!ctx) return { error: 'Não autenticado.' }
  if (!canCreateRs(ctx.payload)) return { error: 'Sem permissão.' }
  const owned = await db.lessDocument.findFirst({ where: { id, userId: ctx.userId, schoolId: ctx.schoolId, type: 'RELATORIO_SINTESE' }, select: { id: true } })
  if (!owned) return { error: 'Relatório não encontrado.' }
  await db.lessDocument.update({ where: { id }, data: { deletedAt: new Date() } })
  return { ok: true }
}

export async function getRelatorio(id: number) {
  const ctx = await auth()
  if (!ctx) return null
  return db.lessDocument.findFirst({ where: { id, schoolId: ctx.schoolId, type: 'RELATORIO_SINTESE', deletedAt: null, ...(canView(ctx.payload) ? {} : { userId: ctx.userId }) }, select: { id: true, title: true, status: true, content: true } })
}

// ── Coordenação + desbloqueio ─────────────────────────────────────────────────
export async function getCoordenacaoProfessores(): Promise<{ error?: string; professores?: CoordProfessor[] }> {
  const ctx = await auth()
  if (!ctx) return { error: 'Não autenticado.' }
  if (!canView(ctx.payload)) return { error: 'Sem permissão.' }
  const [assigns, docs] = await Promise.all([
    db.teacherAssignment.findMany({ where: { schoolId: ctx.schoolId }, select: { userId: true, user: { select: { name: true } }, discipline: { select: { name: true } }, class: { select: { grade: { select: { level: true, order: true } } } } } }),
    db.lessDocument.findMany({ where: { schoolId: ctx.schoolId, type: 'RELATORIO_SINTESE', deletedAt: null }, select: { id: true, userId: true, title: true, status: true, updatedAt: true, content: true }, orderBy: { updatedAt: 'desc' } }),
  ])
  const map = new Map<number, CoordProfessor>()
  for (const a of assigns) {
    let p = map.get(a.userId)
    if (!p) { p = { id: a.userId, name: a.user?.name ?? '—', temDisciplinaElegivel: false, relatorios: [] }; map.set(a.userId, p) }
    if (a.class) { const { ciclo } = cicloSerieFromGrade(a.class.grade); if (disciplinaElegivel(a.discipline.name, ciclo)) p.temDisciplinaElegivel = true }
  }
  for (const d of docs) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c: any = d.content ?? {}
    let p = map.get(d.userId)
    if (!p) { p = { id: d.userId, name: '—', temDisciplinaElegivel: false, relatorios: [] }; map.set(d.userId, p) }
    p.relatorios.push({ id: d.id, title: d.title, status: d.status, updatedAt: d.updatedAt.toISOString(), disciplinaLabel: c.disciplineLabel ?? c.disciplineNome ?? '—', serie: c.serie ?? '', bimestre: c.bimestre ?? null })
  }
  const semNome = [...map.values()].filter(p => p.name === '—').map(p => p.id)
  if (semNome.length) {
    const users = await db.user.findMany({ where: { id: { in: semNome } }, select: { id: true, name: true } })
    for (const u of users) { const p = map.get(u.id); if (p) p.name = u.name }
  }
  return { professores: [...map.values()].sort((a, b) => a.name.localeCompare(b.name)) }
}

export async function getRecomposicaoStatus(gradeId: number, bimestre: number): Promise<{ unlocked: boolean }> {
  const ctx = await auth()
  if (!ctx || !canCreateRs(ctx.payload)) return { unlocked: false }
  if (!Number.isFinite(gradeId) || !Number.isFinite(bimestre)) return { unlocked: false }
  const row = await db.rsRecomposicaoUnlock.findUnique({ where: { ano_bimestre_gradeId: { ano: ANO_ATUAL, bimestre: Number(bimestre), gradeId: Number(gradeId) } }, select: { id: true } })
  return { unlocked: !!row }
}

export async function getDesbloqueioPainel(): Promise<{ error?: string; painel?: DesbloqueioPainel }> {
  const ctx = await auth()
  if (!ctx) return { error: 'Não autenticado.' }
  if (!canManage(ctx.payload)) return { error: 'Sem permissão.' }
  const [grades, unlocks] = await Promise.all([
    db.grade.findMany({ where: { schoolId: ctx.schoolId }, select: { id: true, name: true, level: true, order: true }, orderBy: [{ level: 'asc' }, { order: 'asc' }] }),
    db.rsRecomposicaoUnlock.findMany({ where: { schoolId: ctx.schoolId, ano: ANO_ATUAL }, select: { gradeId: true, bimestre: true } }),
  ])
  return { painel: { ano: ANO_ATUAL, grades: grades.map(g => ({ gradeId: g.id, label: g.name, level: String(g.level), yearNumber: g.order })), unlocks: unlocks.map(u => ({ gradeId: u.gradeId, bimestre: u.bimestre })) } }
}

export async function salvarRecomposicaoCoord(documentId: number, intervencoes: EstrategiaSel[]): Promise<ActionResult<{ ok?: boolean }>> {
  const ctx = await auth()
  if (!ctx) return { error: 'Não autenticado.' }
  if (!canManage(ctx.payload)) return { error: 'Sem permissão.' }
  const doc = await db.lessDocument.findFirst({ where: { id: documentId, schoolId: ctx.schoolId, type: 'RELATORIO_SINTESE', deletedAt: null }, select: { id: true, content: true } })
  if (!doc) return { error: 'Relatório não encontrado.' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any = { ...((doc.content as any) ?? {}) }
  content.fase4 = { intervencoes: (Array.isArray(intervencoes) ? intervencoes : []).filter(Boolean) }
  await db.lessDocument.update({ where: { id: documentId }, data: { content } })
  return { ok: true }
}

export async function toggleRecomposicaoUnlock(gradeId: number, bimestre: number): Promise<ActionResult<{ unlocked?: boolean }>> {
  const ctx = await auth()
  if (!ctx) return { error: 'Não autenticado.' }
  if (!canManage(ctx.payload)) return { error: 'Sem permissão.' }
  if (!Number.isFinite(gradeId) || !ENABLED_BIMESTRES.includes(Number(bimestre))) return { error: 'Ciclo inválido.' }
  // valida que a série pertence à escola
  const grade = await db.grade.findFirst({ where: { id: Number(gradeId), schoolId: ctx.schoolId }, select: { id: true } })
  if (!grade) return { error: 'Série inválida.' }
  const key = { ano: ANO_ATUAL, bimestre: Number(bimestre), gradeId: Number(gradeId) }
  const existing = await db.rsRecomposicaoUnlock.findUnique({ where: { ano_bimestre_gradeId: key }, select: { id: true } })
  if (existing) { await db.rsRecomposicaoUnlock.delete({ where: { id: existing.id } }); return { unlocked: false } }
  await db.rsRecomposicaoUnlock.create({ data: { ...key, schoolId: ctx.schoolId, enabledBy: ctx.userId } })
  return { unlocked: true }
}
