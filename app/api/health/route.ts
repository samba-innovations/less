import { NextResponse } from 'next/server'

// Liveness, e só. De propósito NÃO toca no banco: o watchdog reinicia
// container unhealthy, e reiniciar app por causa de banco fora do ar só troca
// uma indisponibilidade por um laço de restart. Quem checa o banco é o painel
// admin, uma vez, porque é o mesmo banco para todos.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ ok: true })
}
