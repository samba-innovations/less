import { getAuthCookie } from './cookie'
import { verifyToken, type JwtPayload } from './jwt'
import { db } from './db'

export async function getSession(): Promise<JwtPayload | null> {
  const token = await getAuthCookie()
  if (!token) return null
  try {
    return await verifyToken(token)
  } catch { return null }
}

export async function getSchoolFromSession(payload: JwtPayload) {
  return db.school.findUnique({ where: { slug: payload.schoolSlug } })
}

export async function requireSession(): Promise<JwtPayload> {
  const session = await getSession()
  if (!session) throw new Error('Não autenticado')
  return session
}
