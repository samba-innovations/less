import { db } from './db'
import type { JwtPayload } from './jwt'

export async function getSchoolFromPayload(payload: JwtPayload) {
  if (payload.orgSlug) {
    return db.school.findFirst({
      where:   { organization: { slug: payload.orgSlug } },
      include: { organization: true },
    })
  }
  if (payload.isAdmin) {
    return db.school.findFirst({ orderBy: { id: 'asc' }, include: { organization: true } })
  }
  return null
}
