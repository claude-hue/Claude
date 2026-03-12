import type { Metadata, Viewport } from 'next'
import './globals.css'
import { PushNotificationManager } from '@/components/PushNotificationManager'

export const metadata: Metadata = {
  title: 'PWA Supabase App',
  description: 'Progressive Web App with Supabase and push notifications',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PWA App',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    title: 'PWA Supabase App',
    description: 'Progressive Web App with Supabase and push notifications',
  },
}

export const viewport: Viewport = {
  themeColor: '#6366f1',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* iOS-specific meta tags — required for PWA + push on Safari */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="PWA App" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png" />
      </head>
      <body>
        {children}
        <PushNotificationManager />
      </body>
    </html>
  )
}
