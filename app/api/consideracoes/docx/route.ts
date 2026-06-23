import { NextRequest, NextResponse } from 'next/server'
import { getAuthCookie } from '@/lib/cookie'
import { verifyToken, canCreateAta, effectiveRole } from '@/lib/jwt'
import { db } from '@/lib/db'
import { generateConsideracoesDocx, type ConsideracoesInput } from '@/lib/docx-consideracoes'

export async function POST(req: NextRequest) {
  const token = await getAuthCookie()
  if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  let payload: Awaited<ReturnType<typeof verifyToken>>
  try { payload = await verifyToken(token) } catch { return NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) }

  if (!canCreateAta(effectiveRole(payload))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const school = await db.school.findFirst({
    where:   { organization: { slug: payload.orgSlug } },
    include: { organization: true },
  })

  try {
    const body = await req.json() as ConsideracoesInput
    if (!body.turma || !body.lgg || !body.chs || !body.cnt) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const input: ConsideracoesInput = {
      ...body,
      schoolName: school?.organization.name,
    }

    const buffer = await generateConsideracoesDocx(input)
    const safe   = body.turma.replace(/[^a-zA-ZÀ-ÿ0-9\s-]/g, '').replace(/\s+/g, '_').slice(0, 60)

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="consideracoes_${safe}.docx"`,
      },
    })
  } catch (err) {
    console.error('[consideracoes/docx]', err)
    return NextResponse.json({ error: 'Falha ao gerar DOCX' }, { status: 500 })
  }
}
