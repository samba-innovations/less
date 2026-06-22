import { NextRequest, NextResponse } from 'next/server'
import { getAuthCookie } from '@/lib/cookie'
import { verifyToken } from '@/lib/jwt'
import { db } from '@/lib/db'
import { generatePdf } from '@/lib/pdf'

type StudentInput = {
  id?: number; name: string; ra: string; turma: string
  diagnostico?: string; profColaborativo?: string; profAee?: string
}

export async function POST(req: NextRequest) {
  const token = await getAuthCookie()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let payload: Awaited<ReturnType<typeof verifyToken>>
  try { payload = await verifyToken(token) } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const school = await db.school.findFirst({
    where:   { organization: { slug: payload.orgSlug } },
    include: { organization: true },
  })
  if (!school) return NextResponse.json({ error: 'Escola não encontrada.' }, { status: 404 })

  const author = await db.user.findUnique({ where: { id: payload.userId }, select: { name: true } })
  const authorName = author?.name ?? ''

  const body = await req.json() as {
    students?: StudentInput[]
    sharedContent?: Record<string, string>
    title?: string
  }

  const students = body.students ?? []
  const shared   = body.sharedContent ?? {}
  const title    = body.title ?? 'PEI'

  if (students.length === 0) {
    return NextResponse.json({ error: 'Nenhum aluno selecionado.' }, { status: 400 })
  }

  const pdfs = await Promise.all(students.map(async (st) => {
    // Merge per-student identity into the shared PEI content
    const profs: string[] = []
    if (st.profAee) profs.push(`Prof. AEE: ${st.profAee}`)
    if (st.profColaborativo) profs.push(`Prof. Colaborativo: ${st.profColaborativo}`)

    const content: Record<string, string> = {
      ...shared,
      aluno:           st.name,
      ra:              st.ra,
      turma:           st.turma,
      diagnostico_cid: st.diagnostico ?? '',
      profissionais:   profs.join('\n'),
    }

    const buffer = await generatePdf({
      type:       'PEI',
      title,
      content,
      schoolName: school.organization.name,
      authorName: authorName,
      createdAt:  new Date(),
    })

    return { studentName: st.name, pdfBase64: buffer.toString('base64') }
  }))

  return NextResponse.json({ pdfs })
}
