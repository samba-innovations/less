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
