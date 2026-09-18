import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify, importSPKI, type KeyLike } from 'jose'

const COOKIE_NAME = 'samba_token'
// RS256 assíncrono — cache a chave pública decodificada.
let _pubKey: Promise<KeyLike> | null = null
function getPubKey() {
  if (!_pubKey) _pubKey = importSPKI(atob(process.env.JWT_PUBLIC_KEY_B64!), 'RS256')
  return _pubKey
}
const SSO_URL = process.env.NEXT_PUBLIC_SSO_URL ?? 'http://sso.sambainnovations.local'
const HUB_URL = process.env.NEXT_PUBLIC_HUB_URL ?? 'http://admin.sambainnovations.local'

// Pré-autenticação não é sessão. O token de 5 minutos que o SSO emite entre a
// senha e a escolha da organização é assinado com a MESMA chave que a sessão, e
// não carrega papel nem organização — sem esta checagem ele passava por aqui.
// Tokens emitidos antes desta mudança não têm `aud` e seguem valendo até
// expirar; quando a claim vem, tem de ser a de sessão. Lança de propósito: quem
// chama já trata no catch, mandando pro login e limpando o cookie.
function garantirSessao(payload: unknown) {
  const p = payload as { preauth?: boolean; aud?: unknown }
  if (p.preauth) throw new Error('token de pré-autenticação não vale como sessão')
  if (p.aud !== undefined && p.aud !== 'samba:sessao') {
    throw new Error('token emitido para outro público')
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (!pathname.startsWith('/dashboard')) return NextResponse.next()

  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return NextResponse.redirect(`${SSO_URL}/login`)

  try {
    const { payload } = await jwtVerify(token, await getPubKey(), { algorithms: ["RS256"] }) as {
      payload: { systems?: string[]; isAdmin?: boolean }
    }
    garantirSessao(payload)
    // Primeiro acesso pendente: sessão restrita só à troca de senha.
    if ((payload as { pwReset?: boolean }).pwReset) {
      return NextResponse.redirect(`${SSO_URL}/trocar-senha?next=${encodeURIComponent(req.url)}`)
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
