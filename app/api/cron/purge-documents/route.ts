import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Expurgo definitivo de documentos na lixeira há mais de RETENTION_DAYS dias.
// Protegido por CRON_SECRET (mesmo padrão do gate-cron). Agendar via cron externo:
//   POST /api/cron/purge-documents  com header x-cron-secret: $CRON_SECRET
const RETENTION_DAYS = 90

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('x-cron-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)
  const result = await db.lessDocument.deleteMany({
    where: { deletedAt: { not: null, lt: cutoff } },
  })

  return NextResponse.json({ purged: result.count, retentionDays: RETENTION_DAYS, cutoff: cutoff.toISOString() })
}
