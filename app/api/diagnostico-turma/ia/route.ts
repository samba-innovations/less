import { NextRequest, NextResponse } from 'next/server'
import { montarPedidoIA, aplicarRespostaIA } from '@/lib/diagnostico'

export const dynamic = 'force-dynamic'

// POST { action: 'montar', classId } → { prompt }
// POST { action: 'aplicar', texto }  → { diagnostico, planoAcao }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  if (body?.action === 'aplicar') {
    const r = await aplicarRespostaIA(String(body.texto ?? ''))
    return NextResponse.json(r, { status: r.error ? 400 : 200 })
  }
  const r = await montarPedidoIA(Number(body?.classId))
  return NextResponse.json(r, { status: r.error ? 400 : 200 })
}
