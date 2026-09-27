import type { Metadata, Viewport } from 'next'
import { Nunito } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { PwaManager } from '@/components/pwa/pwa-manager'

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'Akselera.Tech - Chat Internal',
  description: 'Aplikasi Web Chat Internal 1-on-1 Akselera.Tech',
  applicationName: 'AkseleraChat',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Akselera.Tech',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${nunito.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          storageKey="akselera-theme"
        >
          {children}
          <PwaManager />
        </ThemeProvider>
      </body>
    </html>
  )
}
