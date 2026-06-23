import { NextRequest, NextResponse } from 'next/server'
import { getAuthCookie } from '@/lib/cookie'
import { verifyToken, canCreateAta, effectiveRole } from '@/lib/jwt'
import { db } from '@/lib/db'
import { buildReuniaoPdf } from '@/lib/ata-pdf'
import type { AtaCsvData, ClassTeacher, GenericCsvData } from '@/lib/ata'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getAuthCookie()
  if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  let payload: Awaited<ReturnType<typeof verifyToken>>
  try { payload = await verifyToken(token) } catch { return NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) }
  if (!canCreateAta(effectiveRole(payload))) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { id } = await params
  const school = payload.isAdmin && !payload.orgSlug ? null
    : await db.school.findFirst({ where: { organization: { slug: payload.orgSlug } }, select: { id: true } })
  const doc = await db.lessDocument.findFirst({ where: { id: Number(id), ...(school ? { schoolId: school.id } : {}) } })
  if (!doc) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  let csvData: AtaCsvData | null = null
  let bimestre = '', notas = '', topicos = ''
  let teachers: ClassTeacher[] = []
  let csvData2: GenericCsvData | null = null
  try {
    const body = await req.json() as { csvData?: AtaCsvData; bimestre?: string; notas?: string; topicos?: string; teachers?: ClassTeacher[]; csvData2?: GenericCsvData }
    const content = doc.content as Record<string, unknown>
    csvData  = body.csvData ?? (content.csvRaw ? JSON.parse(String(content.csvRaw)) : null)
    bimestre = body.bimestre ?? String(content.bimestre ?? '')
    notas    = body.notas ?? String(content.notas ?? '')
    topicos  = body.topicos ?? String(content.topicos ?? '')
    teachers = body.teachers ?? []
    csvData2 = body.csvData2 ?? (content.csvRaw2 ? JSON.parse(String(content.csvRaw2)) : null)
  } catch { /* ignore */ }

  const meta = csvData?.meta ?? { anoLetivo: '', diretoria: '', escola: '', tipoEnsino: '', turma: '', tipoFechamento: '', totalAulas: '', totalAulasEletiva: '' }
  const pdf = await buildReuniaoPdf(meta, bimestre, notas, topicos, csvData2, teachers)
  const turma = (meta.turma || 'turma').replace(/\s+/g, '_')
  return new NextResponse(new Uint8Array(pdf), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="reuniao_${turma}.pdf"` },
  })
}
