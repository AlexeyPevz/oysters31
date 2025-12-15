import type { Metadata } from "next"
import type { ReactNode } from "react"
import Script from "next/script"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { AppProviders } from "./providers"
import { serverEnv } from "@/lib/env"

const geistSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Oysters — фермерские деликатесы и премиальная доставка",
  description:
    "Фермерские устрицы, икра, крабы и морепродукты с доставкой день в день. Быстрый заказ, предзаказы и оповещения об остатках.",
  keywords: [
    "устрицы",
    "икра",
    "морепродукты",
    "доставка",
    "премиум",
    "oysters",
  ],
  authors: [{ name: "Oysters" }],
  metadataBase: new URL("https://oysters31.ru"),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/images/logo.png", sizes: "32x32", type: "image/png" },
      { url: "/images/logo.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/images/logo.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title: "Oysters — доставка морских деликатесов",
    description: "Фермерские устрицы и икра с быстрой доставкой по Москве",
    type: "website",
    locale: "ru_RU",
    images: [
      {
        url: "/images/logo.png",
        width: 1200,
        height: 630,
        alt: "Oysters Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Oysters",
    description: "Премиальная доставка морепродуктов",
    images: ["/images/logo.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  const yandexId = serverEnv.YANDEX_METRICA_ID
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        <AppProviders>{children}</AppProviders>
        {yandexId ? (
          <>
            <Script id="ym-tracker" strategy="afterInteractive">
              {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t);a=e.getElementsByTagName(t)[0];k.async=1;k.src=r;a.parentNode.insertBefore(k,a)})(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
ym(${yandexId}, "init", {clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true});`}
            </Script>
            <noscript>
              <div>
                <img src={`https://mc.yandex.ru/watch/${yandexId}`} style={{ position: "absolute", left: "-9999px" }} alt="" />
              </div>
            </noscript>
          </>
        ) : null}
      </body>
    </html>
  )
}





