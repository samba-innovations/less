import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['sambainnovations.local', '*.sambainnovations.local'],
  // pdfkit carrega arquivos .afm de fontes em runtime — não pode ser bundlado pelo webpack
  serverExternalPackages: ['pdfkit'],
  // ── Hardening / anti-engenharia reversa ──
  productionBrowserSourceMaps: false, // não expõe o código-fonte no browser em produção
  poweredByHeader: false,             // remove o header X-Powered-By: Next.js
  reactStrictMode: true,
  // Headers de segurança adicionais (complementam o nginx)
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
      ],
    }]
  },
}

export default nextConfig
