// =============================================================================
// diagnostico.ts — Relatório Diagnóstico da Turma (migrado do samba-paper v1 → v2)
// Cruza os Relatórios-Síntese de uma turma (coordenação). Consome rs_* + LessDocument.
// =============================================================================
import { getAuthCookie } from '@/lib/cookie'
import { verifyToken, effectiveRole, isManager, type JwtPayload } from '@/lib/jwt'
import { getSchoolFromPayload } from '@/lib/school'
import { db } from '@/lib/db'
import { disciplinaElegivel, cicloSerieFromGrade } from '@/lib/matriz-curricular'
import { periodoLabel } from '@/lib/rs-shared'
import type { DtTurma, DtCruzamento, DtConsolidado, DtCompletudeItem, DtFonte, DtPadrao, DtContent, DtPlanoAcaoItem } from '@/lib/diagnostico-shared'

const ANO_ATUAL = new Date().getFullYear()
type Ctx = { payload: JwtPayload; userId: number; schoolId: number }
async function auth(): Promise<Ctx | null> {
  const token = await getAuthCookie(); if (!token) return null
  try {
    const payload = await verifyToken(token)
    const school = await getSchoolFromPayload(payload)
    return school ? { payload, userId: payload.userId, schoolId: school.id } : null
  } catch { return null }
}
const canView = (p: JwtPayload) => isManager(effectiveRole(p))
const canManage = (p: JwtPayload) => isManager(effectiveRole(p))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyC = Record<string, any>
const classIdsOf = (c: AnyC): number[] => Array.isArray(c?.classIds) ? c.classIds.map(Number).filter(Number.isFinite) : []

export async function getTurmasParaDiagnostico(): Promise<{ error?: string; turmas?: DtTurma[] }> {
  const ctx = await auth()
  if (!ctx) return { error: 'Não autenticado.' }
  if (!canView(ctx.payload)) return { error: 'Sem permissão.' }

  const [assigns, relatorios, diagnosticos] = await Promise.all([
    db.teacherAssignment.findMany({ where: { schoolId: ctx.schoolId }, select: { disciplineId: true, discipline: { select: { name: true } }, class: { select: { id: true, name: true, grade: { select: { id: true, level: true, order: true, name: true } } } } } }),
    db.lessDocument.findMany({ where: { schoolId: ctx.schoolId, type: 'RELATORIO_SINTESE', deletedAt: null }, select: { userId: true, content: true } }),
    db.lessDocument.findMany({ where: { schoolId: ctx.schoolId, type: 'DIAGNOSTICO_TURMA', deletedAt: null }, select: { id: true, status: true, content: true, updatedAt: true }, orderBy: { updatedAt: 'desc' } }),
  ])

  const turmas = new Map<number, DtTurma & { _elig: Set<number> }>()
  for (const a of assigns) {
    if (!a.class) continue
    const g = a.class.grade; const { ciclo, serie } = cicloSerieFromGrade(g)
    if (!disciplinaElegivel(a.discipline.name, ciclo)) continue
    let t = turmas.get(a.class.id)
    if (!t) { t = { classId: a.class.id, className: a.class.name, gradeId: g.id, gradeLabel: g.name, ciclo, serie, totalDisciplinas: 0, entregues: 0, diagnosticoId: null, diagnosticoStatus: null, _elig: new Set() }; turmas.set(a.class.id, t) }
    t._elig.add(a.disciplineId)
  }
  const entregues = new Map<number, Set<number>>()
  for (const d of relatorios) {
    const c = (d.content ?? {}) as AnyC; const discId = Number(c.disciplineId)
    if (!Number.isFinite(discId)) continue
    for (const cid of classIdsOf(c)) {
      const t = turmas.get(cid); if (!t || !t._elig.has(discId)) continue
      let set = entregues.get(cid); if (!set) { set = new Set(); entregues.set(cid, set) }
      set.add(discId)
    }
  }
  const diagPorTurma = new Map<number, { id: number; status: string }>()
  for (const d of diagnosticos) { const cid = Number((d.content as AnyC)?.classId); if (Number.isFinite(cid) && !diagPorTurma.has(cid)) diagPorTurma.set(cid, { id: d.id, status: d.status }) }

  const out: DtTurma[] = [...turmas.values()].map(t => {
    const diag = diagPorTurma.get(t.classId)
    return { classId: t.classId, className: t.className, gradeId: t.gradeId, gradeLabel: t.gradeLabel, ciclo: t.ciclo, serie: t.serie, totalDisciplinas: t._elig.size, entregues: entregues.get(t.classId)?.size ?? 0, diagnosticoId: diag?.id ?? null, diagnosticoStatus: diag?.status ?? null }
  }).sort((a, b) => a.gradeLabel.localeCompare(b.gradeLabel) || a.className.localeCompare(b.className))
  return { turmas: out }
}

export async function cruzarTurma(classId: number): Promise<{ error?: string; cruzamento?: DtCruzamento }> {
  const ctx = await auth()
  if (!ctx) return { error: 'Não autenticado.' }
  if (!canView(ctx.payload)) return { error: 'Sem permissão.' }
  if (!Number.isFinite(classId)) return { error: 'Turma inválida.' }

  const cls = await db.class.findFirst({ where: { id: Number(classId), schoolId: ctx.schoolId }, select: { id: true, name: true, grade: { select: { id: true, level: true, order: true, name: true } } } })
  if (!cls) return { error: 'Turma não encontrada.' }
  const { ciclo, serie } = cicloSerieFromGrade(cls.grade)

  const [assigns, relatorios, diagnosticos, cats, difs, ints] = await Promise.all([
    db.teacherAssignment.findMany({ where: { schoolId: ctx.schoolId, classId: Number(classId) }, select: { userId: true, disciplineId: true, discipline: { select: { name: true } }, user: { select: { name: true } } } }),
    db.lessDocument.findMany({ where: { schoolId: ctx.schoolId, type: 'RELATORIO_SINTESE', deletedAt: null }, select: { id: true, userId: true, status: true, content: true, user: { select: { name: true } } }, orderBy: { updatedAt: 'desc' } }),
    db.lessDocument.findMany({ where: { schoolId: ctx.schoolId, type: 'DIAGNOSTICO_TURMA', deletedAt: null }, select: { id: true, status: true, content: true }, orderBy: { updatedAt: 'desc' } }),
    db.rsCategoria.findMany({ select: { id: true, nome: true } }),
    db.rsDificuldade.findMany({ select: { id: true, categoriaId: true } }),
    db.rsIntervencao.findMany({ select: { id: true, titulo: true } }),
  ])
  const existente = diagnosticos.find(d => Number((d.content as AnyC)?.classId) === Number(classId)) ?? null
  const catNome = new Map(cats.map(c => [c.id, c.nome]))
  const difCat = new Map(difs.map(d => [d.id, d.categoriaId]))
  const intTitulo = new Map(ints.map(i => [i.id, i.titulo]))

  const daTurma = relatorios.filter(d => classIdsOf((d.content ?? {}) as AnyC).includes(Number(classId)))
  const elig = assigns.filter(a => disciplinaElegivel(a.discipline.name, ciclo))
  const completude: DtCompletudeItem[] = elig.map(a => {
    const doc = daTurma.find(d => d.userId === a.userId && Number((d.content as AnyC)?.disciplineId) === a.disciplineId)
    return { disciplinaLabel: a.discipline.name, professor: a.user?.name ?? '—', status: (doc ? 'ok' : 'pendente') as 'ok' | 'pendente', docId: doc?.id ?? null }
  }).sort((x, y) => x.disciplinaLabel.localeCompare(y.disciplinaLabel))

  const fortes: DtConsolidado['fortes'] = []; const fracos: DtConsolidado['fracos'] = []; const estrategias: DtConsolidado['estrategias'] = []
  const padroesMap = new Map<string, Set<string>>(); const fontes: DtFonte[] = []; const bimSet = new Set<number>()
  for (const d of daTurma) {
    const c = (d.content ?? {}) as AnyC; const disc = c.disciplineLabel || c.disciplineNome || '—'
    fontes.push({ docId: d.id, professor: d.user?.name ?? '—', disciplinaLabel: disc, status: d.status })
    for (const b of (Array.isArray(c.bimestres) ? c.bimestres : c.bimestre ? [c.bimestre] : [])) { const n = Number(b); if (Number.isFinite(n)) bimSet.add(n) }
    for (const a of (Array.isArray(c.aprendizagens) ? c.aprendizagens : [])) {
      for (const p of (Array.isArray(a.descritoresPos) ? a.descritoresPos : [])) fortes.push({ descritor: String(p), disciplina: disc })
      for (const n of (Array.isArray(a.descritoresNeg) ? a.descritoresNeg : [])) fracos.push({ descritor: String(n), disciplina: disc })
    }
    for (const dif of (Array.isArray(c.dificuldades) ? c.dificuldades : [])) {
      const catId = dif?.descritorId ? difCat.get(dif.descritorId) : undefined
      const cat = catId ? (catNome.get(catId) ?? 'Outros') : (dif?.outro ? 'Outros (registro do professor)' : null)
      if (!cat) continue
      let set = padroesMap.get(cat); if (!set) { set = new Set(); padroesMap.set(cat, set) }
      set.add(disc)
    }
    for (const e of (Array.isArray(c.estrategias) ? c.estrategias : [])) {
      const titulo = e?.intervencaoId ? intTitulo.get(e.intervencaoId) : (e?.outro ? String(e.outro) : null)
      if (titulo) estrategias.push({ titulo, disciplina: disc })
    }
  }
  const padroes: DtPadrao[] = [...padroesMap.entries()].map(([categoria, set]) => ({ categoria, count: set.size, disciplinas: [...set].sort() })).sort((a, b) => b.count - a.count || a.categoria.localeCompare(b.categoria))
  const ex = (existente?.content ?? {}) as AnyC
  return {
    cruzamento: {
      classId: cls.id, className: cls.name, gradeId: cls.grade.id, gradeLabel: cls.grade.name, ciclo, serie,
      bimestres: [...bimSet].sort((a, b) => a - b), completude, consolidado: { fortes, fracos, padroes, estrategias }, fontes,
      diagnosticoId: existente?.id ?? null, diagnosticoStatus: existente?.status ?? null,
      diagnostico: typeof ex.diagnostico === 'string' ? ex.diagnostico : '', planoAcao: Array.isArray(ex.planoAcao) ? ex.planoAcao : [],
    },
  }
}

export async function salvarDiagnosticoTurma(input: { id?: number; classId: number; diagnostico: string; planoAcao: DtPlanoAcaoItem[]; finalize?: boolean; geradoPorIA?: boolean }): Promise<{ error?: string; id?: number; status?: string }> {
  const ctx = await auth()
  if (!ctx) return { error: 'Não autenticado.' }
  if (!canManage(ctx.payload)) return { error: 'Sem permissão para fechar diagnóstico da turma.' }
  const cr = await cruzarTurma(Number(input.classId))
  if (cr.error || !cr.cruzamento) return { error: cr.error ?? 'Falha ao cruzar dados da turma.' }
  const x = cr.cruzamento
  const planoAcao = (Array.isArray(input.planoAcao) ? input.planoAcao : []).map(p => ({ titulo: String(p?.titulo ?? '').trim(), descricao: String(p?.descricao ?? '').trim(), ...(p?.responsavel ? { responsavel: String(p.responsavel).trim() } : {}), ...(p?.prazo ? { prazo: String(p.prazo).trim() } : {}), ...(p?.meta && typeof p.meta === 'object' ? { meta: p.meta } : {}) })).filter(p => p.titulo || p.descricao)
  const content: DtContent = { classId: x.classId, className: x.className, gradeId: x.gradeId, gradeLabel: x.gradeLabel, ciclo: x.ciclo, serie: x.serie, ano: ANO_ATUAL, bimestres: x.bimestres, fontes: x.fontes, completude: x.completude, consolidado: x.consolidado, diagnostico: String(input.diagnostico ?? '').trim(), planoAcao, geradoPorIA: !!input.geradoPorIA }
  const status = input.finalize ? 'FINAL' : 'DRAFT'
  const title = `Diagnóstico da Turma — ${x.gradeLabel} ${x.className}`
  if (input.id) {
    const owned = await db.lessDocument.findFirst({ where: { id: Number(input.id), schoolId: ctx.schoolId, type: 'DIAGNOSTICO_TURMA' }, select: { id: true } })
    if (!owned) return { error: 'Diagnóstico não encontrado.' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.lessDocument.update({ where: { id: Number(input.id) }, data: { title, status, content: content as any } })
    return { id: Number(input.id), status }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const created = await db.lessDocument.create({ data: { schoolId: ctx.schoolId, type: 'DIAGNOSTICO_TURMA', title, status, userId: ctx.userId, content: content as any }, select: { id: true } })
  return { id: created.id, status }
}

export async function excluirDiagnosticoTurma(id: number): Promise<{ error?: string; ok?: boolean }> {
  const ctx = await auth()
  if (!ctx) return { error: 'Não autenticado.' }
  if (!canManage(ctx.payload)) return { error: 'Sem permissão.' }
  const doc = await db.lessDocument.findFirst({ where: { id: Number(id), schoolId: ctx.schoolId, type: 'DIAGNOSTICO_TURMA' }, select: { id: true } })
  if (!doc) return { error: 'Diagnóstico não encontrado.' }
  await db.lessDocument.update({ where: { id: Number(id) }, data: { deletedAt: new Date() } })
  return { ok: true }
}

// ── IA assistida (Copilot): monta o pedido; sem Azure, é o fluxo padrão ──
const JSON_FORMATO = 'Responda SOMENTE com JSON válido: {"diagnostico":"<2 a 4 parágrafos>","planoAcao":[{"titulo":"","descricao":"","responsavel":"","prazo":""}]}. Inclua 3 a 6 ações, priorizando padrões transversais.'
const SYSTEM_IA = 'Você é coordenador(a) pedagógico(a) redigindo um Relatório Diagnóstico de TURMA para escola pública estadual de SP. Baseie-se ESTRITAMENTE nos dados; priorize padrões transversais; português do Brasil, técnico e construtivo.'
function montarContexto(x: DtCruzamento): { contexto: string; vazio: boolean } {
  const { fortes, fracos, padroes, estrategias } = x.consolidado
  const vazio = !fortes.length && !fracos.length && !padroes.length && !estrategias.length
  const linhas = (arr: { descritor?: string; titulo?: string; disciplina: string }[]) => arr.map(i => `- ${i.descritor ?? i.titulo} (${i.disciplina})`).join('\n') || '(nenhum)'
  const pend = x.completude.filter(c => c.status === 'pendente').map(c => c.disciplinaLabel)
  const contexto = [
    `Turma: ${x.gradeLabel} ${x.className} (${x.ciclo === 'medio' ? 'EM' : 'EF'})`,
    `Período: ${x.bimestres.length ? periodoLabel(x.bimestres) : 'não informado'}`,
    `Completude: ${x.completude.filter(c => c.status === 'ok').length} de ${x.completude.length} disciplinas.`,
    pend.length ? `SEM relatório: ${pend.join(', ')}.` : 'Todas entregaram.', '',
    'PADRÕES TRANSVERSAIS:', padroes.length ? padroes.map(p => `- ${p.categoria}: ${p.count} disc. — ${p.disciplinas.join(', ')}`).join('\n') : '(nenhum)',
    '', 'FORÇAS:', linhas(fortes), '', 'FRAGILIDADES:', linhas(fracos), '', 'ESTRATÉGIAS QUE FUNCIONARAM:', linhas(estrategias),
  ].join('\n')
  return { contexto, vazio }
}
export async function montarPedidoIA(classId: number): Promise<{ error?: string; prompt?: string }> {
  const ctx = await auth(); if (!ctx) return { error: 'Não autenticado.' }
  if (!canManage(ctx.payload)) return { error: 'Sem permissão.' }
  const cr = await cruzarTurma(Number(classId)); if (cr.error || !cr.cruzamento) return { error: cr.error ?? 'Falha ao cruzar.' }
  const { contexto, vazio } = montarContexto(cr.cruzamento)
  if (vazio) return { error: 'Sem dados de relatórios suficientes nesta turma.' }
  return { prompt: `${SYSTEM_IA}\n\nDados da turma:\n\n${contexto}\n\n${JSON_FORMATO}` }
}
function parseDiagnostico(text: string): { diagnostico: string; planoAcao: DtPlanoAcaoItem[] } | null {
  if (!text) return null
  let raw = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  const a = raw.indexOf('{'), b = raw.lastIndexOf('}'); if (a >= 0 && b > a) raw = raw.slice(a, b + 1)
  try {
    const out = JSON.parse(raw)
    const planoAcao: DtPlanoAcaoItem[] = (Array.isArray(out.planoAcao) ? out.planoAcao : []).map((p: AnyC) => ({ titulo: String(p?.titulo ?? '').trim(), descricao: String(p?.descricao ?? '').trim(), ...(p?.responsavel ? { responsavel: String(p.responsavel).trim() } : {}), ...(p?.prazo ? { prazo: String(p.prazo).trim() } : {}) })).filter((p: DtPlanoAcaoItem) => p.titulo || p.descricao)
    const diagnostico = String(out.diagnostico ?? '').trim()
    if (!diagnostico && planoAcao.length === 0) return null
    return { diagnostico, planoAcao }
  } catch { return null }
}
export async function aplicarRespostaIA(texto: string): Promise<{ error?: string; diagnostico?: string; planoAcao?: DtPlanoAcaoItem[] }> {
  const ctx = await auth(); if (!ctx) return { error: 'Não autenticado.' }
  if (!canManage(ctx.payload)) return { error: 'Sem permissão.' }
  const parsed = parseDiagnostico(String(texto ?? ''))
  if (!parsed) return { error: 'Não consegui ler a resposta. Cole o JSON que o Copilot devolveu.' }
  return parsed
}
