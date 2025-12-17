import type React from "react"
import type { Metadata } from "next"
import { Jua, Roboto_Mono } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const jua = Jua({ weight: "400", subsets: ["latin"], variable: "--font-sans" })
const robotoMono = Roboto_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "떡락도 rock이다",
  description: "공공데이터포털 API와 지도 API를 활용한 부동산 가격 추적/비교 대시보드",
  icons: {
    icon: [
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`${jua.variable} ${robotoMono.variable}`}>
      <head>
        <link rel="preconnect" href="https://dapi.kakao.com" />
        <link rel="dns-prefetch" href="https://dapi.kakao.com" />
        <link rel="preconnect" href="https://apis.data.go.kr" />
        <link rel="dns-prefetch" href="https://apis.data.go.kr" />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
