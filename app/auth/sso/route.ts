import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { cookies } from 'next/headers'

const secret  = new TextEncoder().encode(process.env.JWT_SECRET!)
const SSO_URL = process.env.NEXT_PUBLIC_SSO_URL ?? 'http://sso.sambainnovations.local'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.redirect(new URL(`${SSO_URL}/login`))

  try {
    const res = await fetch(`${SSO_URL}/api/sso`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token }),
    })
    if (!res.ok) throw new Error('SSO failed')

    const { user } = await res.json()

    const jwt = await new SignJWT({
      userId:    user.id,
      schoolSlug: user.schoolSlug ?? '',
      role:      user.role,
      systems:   user.systems ?? [],
      isAdmin:   user.isAdmin ?? false,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('8h')
      .sign(secret)

    const jar = await cookies()
    jar.set('samba_token', jwt, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   8 * 60 * 60,
      path:     '/',
    })

    return NextResponse.redirect(new URL('/dashboard', req.url))
  } catch {
    return NextResponse.redirect(new URL(`${SSO_URL}/login`))
  }
}
