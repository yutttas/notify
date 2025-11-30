import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Notify - 夫婦の関係性診断サービス',
  description: 'AIが夫婦間の関係性をマイルドに診断します',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <main className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
          {children}
        </main>
      </body>
    </html>
  )
}
