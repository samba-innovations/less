import { jwtVerify, importSPKI } from 'jose'
import type { KeyLike } from 'jose'

export type Role =
  | 'PRINCIPAL'
  | 'VICE_PRINCIPAL'
  | 'COORDINATOR'
  | 'TEACHER_COORDINATOR'
  | 'TEACHER'
  | 'SECRETARY'

export type JwtPayload = {
  userId:    number
  orgSlug:   string
  role:      string
  systems:   string[]
  isAdmin:   boolean
}

export const MANAGER_ROLES = ['ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL', 'COORDINATOR']
export const TEACHER_ROLES = ['TEACHER', 'TEACHER_COORDINATOR']

/**
 * Role efetivo de uma sessão. Um admin global de plataforma (isAdmin) não tem
 * vínculo por-organização, então o tratamos como o topo da hierarquia ('ADMIN').
 * Use SEMPRE este resolver nas checagens de permissão — assim a autoridade fica
 * num único ponto e nunca depende de lembrar do `|| isAdmin` em cada call site.
 */
export function effectiveRole(s: { role: string; isAdmin?: boolean }): string {
  return s.isAdmin ? 'ADMIN' : s.role
}

export function isManager(role: string) { return MANAGER_ROLES.includes(role) }
export function isTeacher(role: string)  { return TEACHER_ROLES.includes(role) }
export function canCreateDoc(role: string) { return role === 'ADMIN' || role !== 'SECRETARY' }

/** Pode criar/editar documentos próprios */
export function canWrite(role: string) {
  return ['ADMIN', 'TEACHER', 'TEACHER_COORDINATOR', 'COORDINATOR', 'PRINCIPAL'].includes(role)
}

/** Pode criar, visualizar e exportar ATAs */
export function canCreateAta(role: string) {
  return ['ADMIN', 'COORDINATOR', 'TEACHER_COORDINATOR', 'PRINCIPAL', 'VICE_PRINCIPAL'].includes(role)
}

/** Pode ver documentos de todos e dar devolutivas */
export function canAdmin(role: string) {
  return ['ADMIN', 'COORDINATOR', 'TEACHER_COORDINATOR', 'PRINCIPAL', 'VICE_PRINCIPAL'].includes(role)
}

/** Pode ver o card de Produção OE */
export function canAccessOECard(role: string) {
  return ['ADMIN', 'TEACHER', 'TEACHER_COORDINATOR', 'COORDINATOR', 'PRINCIPAL', 'VICE_PRINCIPAL'].includes(role)
}

/** Pode produzir documentos OE */
export function canProduceOEDocuments(role: string) {
  return ['ADMIN', 'TEACHER', 'TEACHER_COORDINATOR', 'COORDINATOR'].includes(role)
}

// RS256 (assimétrico) — chave pública base64-encoded no env.
// Só sso e hub têm a privada; este sistema apenas verifica.
let _publicKey: Promise<KeyLike> | null = null
async function getPublicKey() {
  if (!_publicKey) {
    const b64 = process.env.JWT_PUBLIC_KEY_B64
    if (!b64) throw new Error('JWT_PUBLIC_KEY_B64 não setada')
    _publicKey = importSPKI(Buffer.from(b64, 'base64').toString('utf8'), 'RS256')
  }
  return _publicKey
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const key = await getPublicKey()
  const { payload } = await jwtVerify(token, key, { algorithms: ['RS256'] })
  return payload as unknown as JwtPayload
}
