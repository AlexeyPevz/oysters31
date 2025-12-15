"use client"

import { ReactNode, useEffect, useState } from "react"
import { ThemeProvider } from "next-themes"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@/components/ui/sonner"

const queryClientConfig = {
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 30,
    },
    mutations: {
      retry: 1,
    },
  },
}

async function registerServiceWorker() {
  if (typeof window === "undefined" || !('serviceWorker' in navigator)) return
  try {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  } catch (error) {
    console.error('SW registration failed', error)
  }
}

async function subscribePush(publicKey?: string | null) {
  if (typeof window === "undefined") return
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
  if (!publicKey) return

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return

  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  if (existing) return

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })

  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  })
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient(queryClientConfig))

  useEffect(() => {
    async function initPush() {
      await registerServiceWorker()
      let publicKey: string | undefined | null = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY
      try {
        const response = await fetch('/api/config', { cache: 'no-store' })
        if (response.ok) {
          const data = await response.json()
          publicKey = data.webPushPublicKey ?? publicKey
        }
      } catch (error) {
        console.warn('Failed to load push config', error)
      }
      await subscribePush(publicKey)
    }
    initPush().catch((error) => console.error(error))
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster position="top-center" richColors />
      </QueryClientProvider>
    </ThemeProvider>
  )
}
