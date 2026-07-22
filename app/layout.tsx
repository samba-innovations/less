import type { Metadata } from 'next'
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
        {children}
      </body>
    </html>
  )
}
