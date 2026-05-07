import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { isManager } from '@/lib/jwt'
import { EditorClient } from './EditorClient'

export const dynamic = 'force-dynamic'

export default async function DocumentoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session) redirect(process.env.NEXT_PUBLIC_SSO_URL + '/login')

  const { id } = await params

  let school = null
  if (!session.isAdmin || session.schoolSlug) {
    school = await db.school.findUnique({ where: { slug: session.schoolSlug } })
    if (!school) redirect(process.env.NEXT_PUBLIC_SSO_URL + '/login')
  }

  const manager = isManager(session.role)

  const doc = await db.lessDocument.findFirst({
    where: {
      id:       Number(id),
      ...(school ? { schoolId: school.id } : {}),
      ...(manager || session.isAdmin ? {} : { userId: session.userId }),
    },
    include: {
      feedbacks: {
        orderBy: { createdAt: 'desc' },
        include:  { coordinator: { select: { name: true } } },
      },
    },
  })

  if (!doc) notFound()

  return (
    <>
      <EditorClient
        doc={{
          id:        doc.id,
          type:      doc.type,
          title:     doc.title,
          content:   doc.content as Record<string, string>,
          status:    doc.status,
          feedbacks: doc.feedbacks.map(f => ({
            id:          f.id,
            text:        f.text,
            createdAt:   f.createdAt.toISOString(),
            coordinator: f.coordinator,
          })),
        }}
        canFeedback={manager}
        isAdmin={session.isAdmin}
      />
    </>
  )
}
