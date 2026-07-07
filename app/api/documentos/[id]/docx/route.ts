// DOCX do Projeto de Pesquisa (ABNT) — migrado do samba-paper v1. Gera e envia
// direto (sem persistir em disco, diferente do v1 que salvava em STORAGE_DIR).
import { NextRequest, NextResponse } from 'next/server'
import { getAuthCookie } from '@/lib/cookie'
import { verifyToken, canWrite, effectiveRole } from '@/lib/jwt'
import { db } from '@/lib/db'
import { generateProjetoDocx } from '@/lib/docx-projeto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getAuthCookie()
  if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  let payload: Awaited<ReturnType<typeof verifyToken>>
  try { payload = await verifyToken(token) } catch { return NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) }
  if (!canWrite(effectiveRole(payload))) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { id } = await params
  const docId = Number(id)
  if (!Number.isFinite(docId) || docId <= 0) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const school = payload.isAdmin && !payload.orgSlug ? null
    : await db.school.findFirst({ where: { organization: { slug: payload.orgSlug } }, select: { id: true } })
  const doc = await db.lessDocument.findFirst({
    where: { id: docId, type: 'PROJETO', deletedAt: null, ...(school ? { schoolId: school.id } : {}) },
  })
  if (!doc) return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })

  const user = await db.user.findUnique({ where: { id: payload.userId }, select: { name: true } })
  const content = (doc.content ?? {}) as Record<string, string>

  const buffer = await generateProjetoDocx({
    content,
    userName: user?.name ?? 'Professor(a)',
    createdAt: doc.createdAt.toISOString(),
  })

  const safe = (String(content.titulo ?? doc.title ?? 'projeto')).replace(/[^\w\-]+/g, '_').slice(0, 60)
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="projeto_${safe}.docx"`,
      'Cache-Control': 'no-store',
    },
  })
}
