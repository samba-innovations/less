import { jwtVerify } from 'jose'

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

export const MANAGER_ROLES = ['PRINCIPAL', 'VICE_PRINCIPAL', 'COORDINATOR']
export const TEACHER_ROLES = ['TEACHER', 'TEACHER_COORDINATOR']

export function isManager(role: string) { return MANAGER_ROLES.includes(role) }
export function isTeacher(role: string)  { return TEACHER_ROLES.includes(role) }
export function canCreateDoc(role: string) {
  return role !== 'SECRETARY'
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET!)

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, secret)
  return payload as unknown as JwtPayload
}
