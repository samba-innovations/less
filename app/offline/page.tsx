export const metadata = { title: 'sem conexão · samba innovations' }
export default function OfflinePage() {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f6f9', color: '#0a0e1a', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif', padding: '2rem', textAlign: 'center' }}>
        <div style={{ maxWidth: 380 }}>
          <div style={{ width: 72, height: 72, margin: '0 auto 24px', borderRadius: '50%', background: '#e5eaf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6b7590" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>
            </svg>
          </div>
          <h1 style={{ margin: '0 0 12px', fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>sem conexão.</h1>
          <p style={{ margin: '0 0 28px', fontSize: 15, color: '#3a4256', lineHeight: 1.6 }}>você está offline. o app só funciona online — quando a conexão voltar, recarregue.</p>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 22px', border: 0, borderRadius: 10, background: '#b8860b', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>tentar de novo</button>
        </div>
      </body>
    </html>
  )
}
