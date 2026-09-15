import { NextResponse } from 'next/server'

// Identidade do processo no ar — é daqui que o painel admin tira "qual versão
// roda onde". GIT_SHA e BUILT_AT entram como build arg na imagem; em dev local
// não existem e viram "dev".
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STARTED_AT = new Date().toISOString()

export async function GET() {
  return NextResponse.json({
    system:    'less',
    sha:       process.env.GIT_SHA   ?? 'dev',
    builtAt:   process.env.BUILT_AT  ?? null,
    startedAt: STARTED_AT,
    uptimeSec: Math.round(process.uptime()),
    env:       process.env.NODE_ENV ?? 'development',
  })
}
