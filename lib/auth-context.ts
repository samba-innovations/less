import { cache } from 'react'
import { getSession } from './auth'
import { effectiveRole, isManager, type JwtPayload } from './jwt'
import { db } from './db'

export type AuthContext = {
  userId:    number
  role:      string        // role EFETIVO (admin global => 'ADMIN')
  isAdmin:   boolean
  isManager: boolean       // gestor OU admin
  orgSlug:   string | null
  schoolId:  number | null // escola do contexto (null p/ admin sem org)
  payload:   JwtPayload
}

/**
 * Resolve identidade + escopo + autoridade UMA vez por request.
 *
 * `cache()` do React deduplica entre layout, page e múltiplas queries do mesmo
 * request — elimina o `findFirst({ organization: { slug } })` repetido em cada
 * rota. Toda checagem de permissão e todo escopo multi-tenant devem derivar
 * daqui (segurança num ponto único; schoolId nunca vem do input do cliente).
 */
export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  const session = await getSession()
  if (!session) return null

  const role = effectiveRole(session)

  const school = session.orgSlug
    ? await db.school.findFirst({
        where:  { organization: { slug: session.orgSlug } },
        select: { id: true },
      })
    : null

  return {
    userId:    session.userId,
    role,
    isAdmin:   !!session.isAdmin,
    isManager: isManager(role),
    orgSlug:   session.orgSlug ?? null,
    schoolId:  school?.id ?? null,
    payload:   session,
  }
})
