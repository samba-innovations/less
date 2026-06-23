import { NextRequest, NextResponse } from 'next/server'
import { getAuthCookie } from '@/lib/cookie'
import { verifyToken, canCreateAta, effectiveRole } from '@/lib/jwt'
import { db } from '@/lib/db'
import { buildMapaoPdf } from '@/lib/ata-pdf'
import type { AtaCsvData } from '@/lib/ata'

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
  try { const body = await req.json() as { csvData?: AtaCsvData }; csvData = body.csvData ?? null } catch {}
  const content = doc.content as Record<string, unknown>
  if (!csvData && content.csvRaw) { try { csvData = JSON.parse(String(content.csvRaw)) } catch {} }
  if (!csvData) return NextResponse.json({ error: 'Dados não encontrados' }, { status: 400 })

  const pdf = await buildMapaoPdf(csvData)
  const turma = csvData.meta.turma.replace(/\s+/g, '_')
  return new NextResponse(new Uint8Array(pdf), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="mapao_${turma}.pdf"` },
  })
}
