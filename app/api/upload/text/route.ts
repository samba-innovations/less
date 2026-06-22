import { NextRequest, NextResponse } from 'next/server'
import { getAuthCookie } from '@/lib/cookie'
import { verifyToken } from '@/lib/jwt'
import mammoth from 'mammoth'

export async function POST(req: NextRequest) {
  const token = await getAuthCookie()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try { await verifyToken(token) } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })

  const allowed = ['text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  if (!allowed.includes(file.type) && !file.name.endsWith('.txt') && !file.name.endsWith('.docx')) {
    return NextResponse.json({ error: 'Formato inválido. Envie .txt ou .docx.' }, { status: 422 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  let text: string
  if (file.name.endsWith('.docx') || file.type.includes('wordprocessingml')) {
    const result = await mammoth.extractRawText({ buffer })
    text = result.value
  } else {
    text = buffer.toString('utf-8')
  }

  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()

  return NextResponse.json({ text })
}
