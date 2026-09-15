import type { Instrumentation } from 'next'

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const hash = async (s: string | undefined) => {
    if (!s) return null
    const buf = new TextEncoder().encode(s)
    const digest = await crypto.subtle.digest('SHA-256', buf)
    return Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 12)
  }

  const parts: string[] = []
  // JWT agora é RS256 (assimétrico). Fingerprint da chave PÚBLICA prova que
  // todos os sistemas verificam contra a mesma chave que sso/hub assinam.
  // Fingerprint da PRIVADA aparece só em sso e hub — descasamento pode indicar
  // que alguém sem autoridade tem a chave privada.
  const jp = await hash(process.env.JWT_PUBLIC_KEY_B64);   if (jp) parts.push(`jwt-pub=${jp}`)
  const js = await hash(process.env.JWT_PRIVATE_KEY_B64);  if (js) parts.push(`jwt-priv=${js}`)
  const f  = await hash(process.env.FACE_ENC_KEY);         if (f)  parts.push(`face=${f}`)
  const c  = await hash(process.env.CRON_SECRET);          if (c)  parts.push(`cron=${c}`)
  const fe = await hash(process.env.FIELD_ENC_KEY);        if (fe) parts.push(`field=${fe}`)
  const m  = await hash(process.env.MINIO_SECRET_KEY);     if (m)  parts.push(`minio=${m}`)

  if (parts.length > 0) console.log(`SECRETS_FINGERPRINT ${parts.join(' ')}`)

  // Notificações cross-container via Postgres LISTEN/NOTIFY
  // (sso não tem SSE — silently skip se lib/pg-listener não existir)
  try {
    const { startNotificationListener } = await import('./lib/pg-listener')
    startNotificationListener()
  } catch { /* sistema sem SSE (ex: sso) */ }
}

/**
 * Todo erro de servidor que ninguém tratou passa por aqui — rota, render,
 * server action e middleware. É o hook oficial do Next, então não precisamos
 * embrulhar handler nenhum: nenhuma rota muda para o erro dela ser registrado.
 *
 * O que NÃO chega aqui é erro engolido por catch. Esses, quando merecem, são
 * relatados explicitamente no ponto em que são tratados.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  try {
    const { reportError } = await import('./lib/report-error')
    const e = err as { message?: string; stack?: string }

    // Identidade é best-effort: um erro sem usuário identificado ainda vale
    // muito mais registrado do que perdido.
    let userId: number | null = null
    let orgSlug: string | null = null
    try {
      const raw = request.headers.cookie
      const cookie = Array.isArray(raw) ? raw.join('; ') : raw
      const token = cookie?.split(/;\s*/).find(c => c.startsWith('samba_token='))?.slice('samba_token='.length)
      if (token) {
        const { verifyToken } = await import('./lib/jwt')
        const payload = await verifyToken(token)
        userId  = payload.userId
        orgSlug = payload.orgSlug || null
      }
    } catch { /* sem sessão, ou token expirado */ }

    await reportError({
      message: e?.message ?? String(err),
      stack:   e?.stack ?? null,
      path:    `${request.method} ${request.path}`,
      origin:  'server',
      userId,
      orgSlug,
    })
    console.error(`[onRequestError] ${context.routeType} ${context.routePath}`, err)
  } catch {
    // Registrar erro nunca pode virar erro.
  }
}
