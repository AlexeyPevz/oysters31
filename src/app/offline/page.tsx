import Link from "next/link"
import type { Metadata } from "next"
import { WifiOff, Smartphone, ShieldCheck } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { RefreshButton } from "./RefreshButton"

export const metadata: Metadata = {
  title: "Нет подключения — Oysters",
  description: "Вы офлайн. Проверьте соединение и обновите страницу.",
}

const tips = [
  {
    title: "Проверьте интернет",
    description: "Убедитесь, что Wi-Fi либо мобильные данные активны и работает VPN, если он используется.",
    Icon: WifiOff,
  },
  {
    title: "Обновите страницу",
    description: "Как только связь восстановится, обновите экран или заново откройте приложение.",
    Icon: Smartphone,
  },
  {
    title: "Данные сохранятся",
    description: "Корзина, черновики заказов и маршруты курьеров вернутся сразу после подключения.",
    Icon: ShieldCheck,
  },
]

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black px-4 py-16 text-white">
      <div className="w-full max-w-xl space-y-8 rounded-3xl border border-gray-900 bg-gray-950/80 p-8 text-center">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.4em] text-gray-500">Oysters</p>
          <h1 className="text-3xl font-semibold">Мы не можем подключиться</h1>
          <p className="text-gray-400">
            Похоже, устройство офлайн. Проверьте сеть и вернитесь — мы сохраним корзину и заказы.
          </p>
        </div>
        <div className="space-y-4 text-left">
          {tips.map((tip) => (
            <div key={tip.title} className="flex items-start gap-3 rounded-2xl border border-gray-900/80 bg-gray-900/40 p-4">
              <tip.Icon className="size-5 text-yellow-400" />
              <div>
                <p className="font-medium">{tip.title}</p>
                <p className="text-sm text-gray-400">{tip.description}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <RefreshButton />
          <Link
            href="/"
            prefetch={false}
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "border-yellow-500/40 bg-transparent text-white hover:bg-yellow-500/10"
            )}
          >
            На главную
          </Link>
        </div>
      </div>
    </main>
  )
}
