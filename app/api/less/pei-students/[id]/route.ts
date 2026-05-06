import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { isManager } from '@/lib/jwt'

export const dynamic = 'force-dynamic'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !isManager(session.role))
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const school = await db.school.findUnique({ where: { slug: session.schoolSlug } })
  if (!school) return NextResponse.json({ error: 'Escola não encontrada' }, { status: 404 })

  const id = Number((await params).id)
  await db.lessPeiStudent.updateMany({
    where: { id, schoolId: school.id },
    data:  { ativo: false },
  })

  return NextResponse.json({ ok: true })
}
