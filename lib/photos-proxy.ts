import type { NextRequest } from 'next/server'
import { getAuthCookie } from '@/lib/cookie'
import { verifyToken } from '@/lib/jwt'
import { getPhotoStream } from '@/lib/storage'

type Options = {
  prefixes: readonly string[]
}

export function createPhotoRoute({ prefixes }: Options) {
  return async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ key: string[] }> },
  ) {
    const token = await getAuthCookie()
    if (!token) return new Response('Unauthorized', { status: 401 })
    try { await verifyToken(token) } catch { return new Response('Unauthorized', { status: 401 }) }

    const { key } = await params
    const objectKey = key.join('/')

    if (objectKey.includes('..')) return new Response('Not Found', { status: 404 })
    if (!prefixes.some(p => objectKey.startsWith(p))) {
      return new Response('Not Found', { status: 404 })
    }

    try {
      const res = await getPhotoStream(objectKey)
      const stream = res.Body?.transformToWebStream()
      return new Response(stream, {
        headers: {
          'Content-Type':  res.ContentType ?? 'image/jpeg',
          'Cache-Control': 'private, max-age=3600',
        },
      })
    } catch (err) {
      console.error('[photos] getPhotoStream failed', { key: objectKey, err })
      return new Response('Not Found', { status: 404 })
    }
  }
}
