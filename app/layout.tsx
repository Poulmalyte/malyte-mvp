import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Malyte App',
  description: 'AI-powered marketplace for wellness professionals',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  )
}