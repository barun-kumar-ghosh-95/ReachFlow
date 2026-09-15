// src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'ReachFlow — One place to reach your audience',
    template: '%s | ReachFlow',
  },
  description: 'Create, personalize, schedule and analyze WhatsApp and email campaigns from one powerful workspace. Built for growing businesses.',
  keywords: ['WhatsApp campaigns', 'email marketing', 'campaign management', 'marketing automation', 'SaaS'],
  authors: [{ name: 'ReachFlow' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://reachflow.app',
    siteName: 'ReachFlow',
    title: 'ReachFlow — One place to reach your audience',
    description: 'Create, personalize, schedule and analyze WhatsApp and email campaigns from one powerful workspace.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ReachFlow — One place to reach your audience',
    description: 'Create, personalize, schedule and analyze WhatsApp and email campaigns.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  )
}
