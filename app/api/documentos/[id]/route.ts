import { NextRequest, NextResponse } from 'next/server'
import { sessaoApi } from '@/lib/auth'
import { verifyToken, isManager, effectiveRole } from '@/lib/jwt'
import { db } from '@/lib/db'
import { pushToSchool } from '@/lib/sse-broadcaster'
import { camposFaltando, listarFaltantes, type DocType } from '@/lib/doc-types'

async function auth() {
  const s = await sessaoApi()
  if (!s.ok) return null
  const school = await db.school.findFirst({ where: { organization: { slug: s.payload.orgSlug } } })
  return school ? { payload: s.payload, school } : null
}

async function getDoc(id: number, ctx: Awaited<ReturnType<typeof auth>>) {
  if (!ctx) return null
  const manager = isManager(effectiveRole(ctx.payload))
  return db.lessDocument.findFirst({
    where: {
      id,
      schoolId: ctx.school.id,
      deletedAt: null,
      ...(manager ? {} : { userId: ctx.payload.userId }),
    },
  })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await auth()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const doc = await getDoc(Number(id), ctx)
  if (!doc) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  return NextResponse.json(doc)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await auth()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const doc = await getDoc(Number(id), ctx)
  if (!doc) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  const body = await req.json()

  // Guards de robustez/segurança
  if (body.title !== undefined && typeof body.title !== 'string')
    return NextResponse.json({ error: 'Título inválido' }, { status: 400 })
  if (body.content !== undefined) {
    if (typeof body.content !== 'object' || body.content === null)
      return NextResponse.json({ error: 'Conteúdo inválido' }, { status: 400 })
    if (JSON.stringify(body.content).length > 500_000)
      return NextResponse.json({ error: 'Conteúdo muito grande' }, { status: 413 })
  }
  if (body.status !== undefined && !['DRAFT', 'FINAL'].includes(body.status))
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 })

  // Finalizar é o ponto sem volta: o documento passa a valer como entregue. A
  // tela já barra, mas quem chama a API direto passava batido e finalizava
  // documento vazio. Como diz a v1: o cliente avisa, o servidor garante.
  //
  // O conteúdo conferido é o que ESTE request deixa gravado — senão um PATCH
  // que muda status e conteúdo de uma vez seria validado contra o conteúdo
  // antigo.
  if (body.status === 'FINAL') {
    const conteudo = (body.content ?? doc.content ?? {}) as Record<string, string>
    const faltando = camposFaltando(doc.type as DocType, conteudo)
    if (faltando.length > 0) {
      return NextResponse.json({
        error: `Preencha antes de finalizar: ${listarFaltantes(faltando)}.`,
        faltando: faltando.map(f => ({ key: f.key, label: f.label, passo: f.passo })),
      }, { status: 422 })
    }
  }

  const updated = await db.lessDocument.update({
    where: { id: doc.id },
    data: {
      ...(body.title   !== undefined ? { title:   body.title.trim() } : {}),
      ...(body.content !== undefined ? { content: body.content }     : {}),
      ...(body.status  !== undefined ? { status:  body.status }      : {}),
    },
  })

  if (ctx.school) pushToSchool(ctx.school.id, 'document_updated', { id: updated.id, status: updated.status })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await auth()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const doc = await getDoc(Number(id), ctx)
  if (!doc) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  // Soft delete — preserva o registro para auditoria/retenção (ATA/PEI têm valor legal)
  await db.lessDocument.update({ where: { id: doc.id }, data: { deletedAt: new Date() } })
  return NextResponse.json({ ok: true })
}
