import type { Metadata } from 'next'
import { PwaBootstrap } from './_components/PwaBootstrap'
import { Montserrat } from 'next/font/google'
import './globals.css'
import './design-tokens.css'
import { PageLoader, NavigationProgress } from './_components/PageLoader'

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { template: '%s · less', default: 'less' },
  description: 'Sistema de geração de documentos escolares',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={montserrat.variable} suppressHydrationWarning>
      <head>
        {/* PWA_MARKER */}
        <link rel="manifest"             href="/manifest.json" />
        <link rel="apple-touch-icon"     href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        <meta name="apple-mobile-web-app-capable"          content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable"                content="yes" />

        <script dangerouslySetInnerHTML={{
          __html: `
            try {
              const t = localStorage.getItem('samba-theme');
              if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark');
              }
            } catch {}
          `
        }} />
      </head>
      <body>
        <PageLoader />
        <NavigationProgress />
        <PwaBootstrap />
        {children}
      </body>
    </html>
  )
}
