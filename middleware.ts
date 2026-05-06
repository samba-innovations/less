import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const COOKIE_NAME = 'samba_token'
const secret  = new TextEncoder().encode(process.env.JWT_SECRET!)
const SSO_URL = process.env.NEXT_PUBLIC_SSO_URL ?? 'http://sso.sambainnovations.local'
const HUB_URL = process.env.NEXT_PUBLIC_HUB_URL ?? 'http://admin.sambainnovations.local'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (!pathname.startsWith('/dashboard')) return NextResponse.next()

  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return NextResponse.redirect(`${SSO_URL}/login`)

  try {
    const { payload } = await jwtVerify(token, secret) as {
      payload: { systems?: string[]; isAdmin?: boolean }
    }
    const hasAccess = payload.isAdmin || payload.systems?.includes('less')
    if (!hasAccess) return NextResponse.redirect(HUB_URL + '/painel')
    return NextResponse.next()
  } catch {
    const res = NextResponse.redirect(`${SSO_URL}/login`)
    res.cookies.delete(COOKIE_NAME)
    return res
  }
}

export const config = { matcher: ['/dashboard/:path*'] }
