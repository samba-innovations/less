import { NextRequest, NextResponse } from 'next/server'
import { getAuthCookie } from '@/lib/cookie'
import { verifyToken } from '@/lib/jwt'
import { reportError } from '@/lib/report-error'

// Onde o navegador entrega o que o ErrorBoundary capturou.
//
// Exige sessão de propósito: sem isso seria um endpoint aberto escrevendo no
// banco, e qualquer um poderia inventar impressões digitais sem fim. Quem é o
// usuário sai do token, NUNCA do corpo — cliente não é fonte de identidade.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const token = await getAuthCookie()
  if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  let payload
  try { payload = await verifyToken(token) }
  catch { return NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) }

  const body = await req.json().catch(() => null)
  if (!body?.message) return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 })

  await reportError({
    message: String(body.message),
    stack:   body.stack ? String(body.stack).slice(0, 4000) : null,
    path:    body.path  ? String(body.path).slice(0, 300)   : null,
    origin:  'client',
    userId:  payload.userId,
    orgSlug: payload.orgSlug || null,
  })

  return NextResponse.json({ ok: true })
}
