import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'THERMOTECH-OPS - 復古工業操作系統',
  description: 'Windows 95 風格的工廠管理系統',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  )
}
