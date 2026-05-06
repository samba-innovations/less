import { db } from './db'
import type { JwtPayload } from './jwt'

export async function getSchoolFromPayload(payload: JwtPayload) {
  if (payload.schoolSlug) {
    return db.school.findUnique({ where: { slug: payload.schoolSlug } })
  }
  if (payload.isAdmin) {
    return db.school.findFirst({ orderBy: { id: 'asc' } })
  }
  return null
}
