import { NextRequest, NextResponse } from 'next/server'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import { getRelatorio } from '@/lib/rs'
import { db } from '@/lib/db'
import { periodoLabel } from '@/lib/rs-shared'

export const dynamic = 'force-dynamic'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type C = Record<string, any>

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const doc = await getRelatorio(Number(id))
  if (!doc) return NextResponse.json({ error: 'não encontrado' }, { status: 404 })
  const c = (doc.content ?? {}) as C

  // resolve títulos das dificuldades/intervenções
  const [difs, ints] = await Promise.all([
    db.rsDificuldade.findMany({ select: { id: true, titulo: true } }),
    db.rsIntervencao.findMany({ select: { id: true, titulo: true } }),
  ])
  const difTit = new Map(difs.map(d => [d.id, d.titulo]))
  const intTit = new Map(ints.map(i => [i.id, i.titulo]))

  const P = (text: string, opts: { bold?: boolean; size?: number; heading?: boolean } = {}) =>
    new Paragraph(opts.heading
      ? { heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 }, children: [new TextRun({ text, bold: true })] }
      : { spacing: { after: 60 }, children: [new TextRun({ text, bold: opts.bold, size: opts.size })] })

  const body: Paragraph[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: 'Relatório-Síntese' })] }),
    P(`${c.disciplineLabel ?? ''} — ${c.gradeLabel ?? ''}`, { bold: true }),
    P(`Turmas: ${(c.classNames ?? []).join(', ') || '—'}`),
    P(`Período: ${periodoLabel(c.bimestres ?? [])}  ·  Ano: ${c.ano ?? ''}`),
  ]

  const aprend: C[] = Array.isArray(c.aprendizagens) ? c.aprendizagens : []
  if (aprend.length) {
    body.push(P('Aprendizagens', { heading: true }))
    for (const a of aprend) {
      body.push(P(`${a.codigo}  ${a.descricao}`, { bold: true }))
      for (const d of (a.descritoresPos ?? [])) body.push(P(`  ✓ ${d}`))
      for (const d of (a.descritoresNeg ?? [])) body.push(P(`  ✗ ${d}`))
    }
  }

  const difsSel: C[] = Array.isArray(c.dificuldades) ? c.dificuldades : []
  if (difsSel.length) {
    body.push(P('Dificuldades observadas', { heading: true }))
    for (const d of difsSel) {
      if (d.descritorId) body.push(P(`• ${difTit.get(d.descritorId) ?? d.descritorId}${d.nivel ? ` (${d.nivel})` : ''}`))
      else if (d.outro) body.push(P(`• ${d.outro}`))
    }
  }

  const estr: C[] = Array.isArray(c.estrategias) ? c.estrategias : []
  if (estr.length) {
    body.push(P('Estratégias', { heading: true }))
    for (const e of estr) {
      if (e.intervencaoId) body.push(P(`• ${intTit.get(e.intervencaoId) ?? e.intervencaoId}`))
      else if (e.outro) body.push(P(`• ${e.outro}`))
    }
  }

  const f4: C[] = Array.isArray(c.fase4?.intervencoes) ? c.fase4.intervencoes : []
  if (f4.length) {
    body.push(P('Recomposição (4ª fase — coordenação)', { heading: true }))
    for (const e of f4) {
      if (e.intervencaoId) body.push(P(`• ${intTit.get(e.intervencaoId) ?? e.intervencaoId}`))
      else if (e.outro) body.push(P(`• ${e.outro}`))
    }
  }

  if (c.referencias) {
    body.push(P('Referências', { heading: true }))
    for (const line of String(c.referencias).split('\n')) if (line.trim()) body.push(P(line, { size: 18 }))
  }

  const buffer = await Packer.toBuffer(new Document({ sections: [{ children: body }] }))
  const safe = (doc.title || 'relatorio-sintese').replace(/[^\w\-]+/g, '_')
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${safe}.docx"`,
    },
  })
}
