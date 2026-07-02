import { NextResponse } from 'next/server'
import { getCoordenacaoProfessores } from '@/lib/rs'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { professores, error } = await getCoordenacaoProfessores()
  if (error) return NextResponse.json({ error }, { status: 403 })
  return NextResponse.json(professores)
}
