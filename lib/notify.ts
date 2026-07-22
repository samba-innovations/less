import { db } from './db'

// notify() só faz o INSERT. O broadcast pg_notify é disparado por trigger
// no Postgres (migration 20260715_notifications_v2). Isso garante:
//   - atomicidade: se transação faz rollback, ninguém recebe evento
//   - single source of truth: qualquer INSERT via Prisma, SQL raw, ou outro
//     serviço dispara broadcast
//   - código de app simplificado

type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'

type NotifyParams = {
  userId:          number
  organizationId:  number
  type:            string
  title:           string
  body:            string
  link?:           string
  system?:         string
  priority?:       Priority
  meta?:           Record<string, unknown>
  dedupKey?:       string
}

// Checa preferência do usuário. Se ele desligou esse tipo (ou '*'), não grava.
async function isEnabledForUser(userId: number, type: string): Promise<boolean> {
  const prefs = await db.notificationPreference.findMany({
    where: { userId, type: { in: [type, '*'] } },
    select: { type: true, inApp: true },
  }).catch(() => [])

  // Preferência específica pro tipo tem precedência sobre '*'
  const specific = prefs.find(p => p.type === type)
  if (specific) return specific.inApp
  const wildcard = prefs.find(p => p.type === '*')
  if (wildcard) return wildcard.inApp
  return true // default: receber
}

export async function notify(params: NotifyParams) {
  if (!await isEnabledForUser(params.userId, params.type)) return null

  return db.notification.create({
    data: {
      userId:         params.userId,
      organizationId: params.organizationId,
      type:           params.type,
      title:          params.title,
      body:           params.body,
      link:           params.link,
      system:         params.system,
      priority:       params.priority ?? 'NORMAL',
      meta:           params.meta as never,
      dedupKey:       params.dedupKey,
    },
  })
}

// ── Fanout helpers ───────────────────────────────────────────────────────────

type BaseFanoutParams = Omit<NotifyParams, 'userId'> & { excludeUserId?: number }

// Notifica todos os usuários com determinado papel na organização.
export async function notifyRoles(params: BaseFanoutParams & {
  organizationId: number
  roles:          string[]
}) {
  const roles = await db.userOrganizationRole.findMany({
    where: { organizationId: params.organizationId, role: { in: params.roles } },
    select: { userId: true },
  })
  const uniqueIds = [...new Set(roles.map(r => r.userId))]
    .filter(id => id !== params.excludeUserId)
  await Promise.all(uniqueIds.map(userId => notify({ ...params, userId })))
  return uniqueIds.length
}

// Alias comum: managers da escola. Usa os papéis padrão do ecossistema.
export async function notifyManagers(params: BaseFanoutParams & { organizationId: number }) {
  return notifyRoles({
    ...params,
    roles: ['PRINCIPAL', 'VICE_PRINCIPAL', 'COORDINATOR', 'TEACHER_COORDINATOR'],
  })
}
