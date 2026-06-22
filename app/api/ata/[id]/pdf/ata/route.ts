import { NextRequest, NextResponse } from 'next/server'
import { getAuthCookie } from '@/lib/cookie'
import { verifyToken, canCreateAta } from '@/lib/jwt'
import { db } from '@/lib/db'
import { buildAtaPdf } from '@/lib/ata-pdf'
import type { AtaCsvData } from '@/lib/ata'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getAuthCookie()
  if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  let payload: Awaited<ReturnType<typeof verifyToken>>
  try { payload = await verifyToken(token) } catch { return NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) }
  if (!canCreateAta(payload.role) && !payload.isAdmin) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { id } = await params
  const school = payload.isAdmin && !payload.orgSlug ? null
    : await db.school.findFirst({ where: { organization: { slug: payload.orgSlug } }, select: { id: true } })
  const doc = await db.lessDocument.findFirst({ where: { id: Number(id), ...(school ? { schoolId: school.id } : {}) } })
  if (!doc) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  let csvData: AtaCsvData | null = null
  let bimestre = ''
  try {
    const body = await req.json() as { csvData?: AtaCsvData; bimestre?: string }
    csvData  = body.csvData ?? null
    bimestre = body.bimestre ?? ''
  } catch { /* ignore */ }

  const content = doc.content as Record<string, unknown>
  if (!csvData && content.csvRaw) { try { csvData = JSON.parse(String(content.csvRaw)) } catch {} }
  if (!bimestre) bimestre = String(content.bimestre ?? '')

  if (!csvData) return NextResponse.json({ error: 'Dados não encontrados' }, { status: 400 })
  if (bimestre !== '5') return NextResponse.json({ error: 'PDF ATA disponível apenas para 5º Conceito' }, { status: 400 })

  const pdf = await buildAtaPdf(csvData)
  const turma = csvData.meta.turma.replace(/\s+/g, '_')
  return new NextResponse(new Uint8Array(pdf), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="ata_${turma}.pdf"` },
  })
}
