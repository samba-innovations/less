import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const SSO_URL = process.env.NEXT_PUBLIC_SSO_URL ?? 'http://sso.sambainnovations.local'

export async function POST() {
  const jar = await cookies()
  jar.delete('samba_token')
  return NextResponse.redirect(new URL(`${SSO_URL}/login`))
}
