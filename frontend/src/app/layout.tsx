import type { Metadata } from 'next'
import './globals.css'
import ToasterWrapper from '@/components/ToasterWrapper'

export const metadata: Metadata = {
  title: 'AI Chatbot Generator',
  description: 'Create and deploy AI chatbots from your documents',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <ToasterWrapper />
      </body>
    </html>
  )
}
