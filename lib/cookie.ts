import { cookies } from 'next/headers'

const COOKIE_NAME = 'samba_token'

export async function getAuthCookie(): Promise<string | undefined> {
  const jar = await cookies()
  return jar.get(COOKIE_NAME)?.value
}
