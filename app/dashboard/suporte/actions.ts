'use server'

import { db } from '@/lib/db'
import { getAuthCookie } from '@/lib/cookie'
import { verifyToken } from '@/lib/jwt'
import { getSchoolFromPayload } from '@/lib/school'
import { revalidatePath } from 'next/cache'

const SYSTEM = 'less'

async function getContext() {
  const token = await getAuthCookie()
  if (!token) throw new Error('Não autenticado')
  const payload = await verifyToken(token)
  const school  = await getSchoolFromPayload(payload)
  if (!school) throw new Error('Escola não encontrada')
  const user = await db.user.findUnique({ where: { id: payload.userId } })
  if (!user) throw new Error('Usuário não encontrado')
  return { payload, school, user }
}

export async function createTicket(subject: string, body: string) {
  const { school, user } = await getContext()

  const ticket = await db.supportTicket.create({
    data: {
      userId:   user.id,
      organizationId: school.organizationId,
      system:   SYSTEM,
      subject:  subject.trim(),
      messages: {
        create: {
          body:        body.trim(),
          authorId:    user.id,
          authorName:  user.name,
          isFromAdmin: false,
        },
      },
    },
  })

  revalidatePath('/dashboard/suporte')
  return ticket.id
}

export async function addMessage(ticketId: number, body: string) {
  const { school, user } = await getContext()

  const ticket = await db.supportTicket.findFirst({
    where: { id: ticketId, organizationId: school.organizationId, system: SYSTEM },
  })
  if (!ticket) throw new Error('Chamado não encontrado')
  if (ticket.status === 'CLOSED') throw new Error('Chamado encerrado')

  await db.supportMessage.create({
    data: {
      ticketId,
      body:        body.trim(),
      authorId:    user.id,
      authorName:  user.name,
      isFromAdmin: false,
    },
  })

  await db.supportTicket.update({
    where: { id: ticketId },
    data:  { updatedAt: new Date() },
  })

  revalidatePath('/dashboard/suporte')
}

export async function closeTicket(ticketId: number) {
  const { school } = await getContext()

  await db.supportTicket.updateMany({
    where: { id: ticketId, organizationId: school.organizationId, system: SYSTEM },
    data:  { status: 'CLOSED' },
  })

  revalidatePath('/dashboard/suporte')
}
