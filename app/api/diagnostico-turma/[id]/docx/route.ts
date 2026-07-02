import { NextRequest, NextResponse } from 'next/server'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import { getAuthCookie } from '@/lib/cookie'
import { verifyToken, effectiveRole, isManager } from '@/lib/jwt'
import { getSchoolFromPayload } from '@/lib/school'
import { db } from '@/lib/db'
import { periodoLabel } from '@/lib/rs-shared'
import type { DtContent } from '@/lib/diagnostico-shared'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = await getAuthCookie()
  if (!token) return NextResponse.json({ error: 'não autenticado' }, { status: 401 })
  let schoolId: number
  try {
    const payload = await verifyToken(token)
    if (!isManager(effectiveRole(payload))) return NextResponse.json({ error: 'sem permissão' }, { status: 403 })
    const school = await getSchoolFromPayload(payload)
    if (!school) return NextResponse.json({ error: 'sem escola' }, { status: 403 })
    schoolId = school.id
  } catch { return NextResponse.json({ error: 'não autenticado' }, { status: 401 }) }

  const doc = await db.lessDocument.findFirst({ where: { id: Number(id), schoolId, type: 'DIAGNOSTICO_TURMA', deletedAt: null }, select: { title: true, content: true } })
  if (!doc) return NextResponse.json({ error: 'não encontrado' }, { status: 404 })
  const c = (doc.content ?? {}) as unknown as DtContent

  const P = (text: string, opts: { bold?: boolean; size?: number; heading?: boolean } = {}) =>
    new Paragraph(opts.heading
      ? { heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 }, children: [new TextRun({ text, bold: true })] }
      : { spacing: { after: 60 }, children: [new TextRun({ text, bold: opts.bold, size: opts.size })] })

  const body: Paragraph[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: 'Relatório Diagnóstico da Turma' })] }),
    P(`${c.gradeLabel ?? ''} ${c.className ?? ''}`, { bold: true }),
    P(`Período: ${periodoLabel(c.bimestres ?? [])}  ·  Ano: ${c.ano ?? ''}`),
    P(`Completude: ${(c.completude ?? []).filter(x => x.status === 'ok').length} de ${(c.completude ?? []).length} disciplinas`),
  ]

  const con = c.consolidado
  if (con?.padroes?.length) {
    body.push(P('Padrões transversais', { heading: true }))
    for (const p of con.padroes) body.push(P(`• ${p.categoria} — ${p.count} disciplina(s): ${p.disciplinas.join(', ')}`))
  }
  if (con?.fortes?.length) {
    body.push(P('Forças identificadas', { heading: true }))
    for (const f of con.fortes) body.push(P(`✓ ${f.descritor} (${f.disciplina})`))
  }
  if (con?.fracos?.length) {
    body.push(P('Fragilidades identificadas', { heading: true }))
    for (const f of con.fracos) body.push(P(`✗ ${f.descritor} (${f.disciplina})`))
  }

  if (c.diagnostico?.trim()) {
    body.push(P('Diagnóstico da coordenação', { heading: true }))
    for (const line of c.diagnostico.split('\n')) if (line.trim()) body.push(P(line))
  }

  if (c.planoAcao?.length) {
    body.push(P('Plano de ação', { heading: true }))
    for (const a of c.planoAcao) {
      body.push(P(`• ${a.titulo}`, { bold: true }))
      if (a.descricao) body.push(P(`   ${a.descricao}`, { size: 20 }))
      const meta = [a.responsavel && `Responsável: ${a.responsavel}`, a.prazo && `Prazo: ${a.prazo}`].filter(Boolean).join('  ·  ')
      if (meta) body.push(P(`   ${meta}`, { size: 18 }))
    }
  }

  if (c.geradoPorIA) body.push(P('Documento redigido com assistência de IA e revisado pela coordenação.', { size: 16 }))

  const buffer = await Packer.toBuffer(new Document({ sections: [{ children: body }] }))
  const safe = (doc.title || 'diagnostico-turma').replace(/[^\w\-]+/g, '_')
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${safe}.docx"`,
    },
  })
}
