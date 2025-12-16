"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Instagram, Send, UsersRound } from "lucide-react"
import type { SiteSettings } from "@/lib/services/settings"

const menuLinks = [
  { href: "/catalog", label: "Каталог товаров" },
  { href: "/catalog?status=PREORDER", label: "Доставка и оплата" },
  { href: "#about", label: "О компании" },
  { href: "#reviews", label: "Отзывы" },
  { href: "#blog", label: "Блог" },
]

const serviceLinks = [
  { href: "#corporate", label: "Корпоративным клиентам" },
  { href: "#events", label: "Оформление мероприятий" },
  { href: "#subscription", label: "Подписка на устрицы" },
  { href: "#gift", label: "Подарочные сертификаты" },
  { href: "#wholesale", label: "Оптовые поставки" },
]

const paymentBadges = ["МИР", "СБП"]

interface FooterProps {
  settings: SiteSettings
}

export default function Footer({ settings }: FooterProps) {
  const currentYear = new Date().getFullYear()

  const socialLinksData = settings?.socialLinks || {}
  const socialLinks = [
    socialLinksData.vk && { href: socialLinksData.vk, label: "ВКонтакте", icon: UsersRound },
    socialLinksData.instagram && { href: socialLinksData.instagram, label: "Instagram", icon: Instagram },
    socialLinksData.telegram && { href: socialLinksData.telegram, label: "Telegram", icon: Send },
  ].filter(Boolean) as Array<{ href: string; label: string; icon: typeof UsersRound }>

  const phone = settings?.contactPhone || "+7 (4722) 55-35-55"
  const email = settings?.contactEmail || "info@oysters31.ru"
  const address = settings?.address || "г. Белгород"
  return (
    <footer className="bg-black border-t border-gray-800">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="relative w-10 h-10 flex-shrink-0">
                <Image
                  src="/images/logo.png?v=2"
                  alt="Oysters Logo"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Oysters Белгород</h3>
                <p className="text-xs text-yellow-400">Премиальные морепродукты</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Свежие устрицы и деликатесы с доставкой день-в-день. Контроль температуры, персональные сомелье и поддержка 24/7.
            </p>
            <div className="flex space-x-3">
              {socialLinks.map(({ href, label, icon: Icon }) => (
                <Button
                  key={href}
                  asChild
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-yellow-400"
                >
                  <a href={href} target="_blank" rel="noreferrer" aria-label={label}>
                    <Icon className="w-5 h-5" />
                  </a>
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-white font-semibold text-lg">Меню</h4>
            <nav className="space-y-2">
              {menuLinks.map((link) => (
                <a key={link.href} href={link.href} className="block text-gray-400 hover:text-yellow-400 transition-colors">
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="space-y-4">
            <h4 className="text-white font-semibold text-lg">Услуги</h4>
            <nav className="space-y-2">
              {serviceLinks.map((link) => (
                <a key={link.href} href={link.href} className="block text-gray-400 hover:text-yellow-400 transition-colors">
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="space-y-4">
            <h4 className="text-white font-semibold text-lg">Контакты</h4>
            <div className="space-y-3 text-sm text-gray-300">
              <div>
                <p className="text-white text-base">{phone}</p>
                <p className="text-gray-400 text-xs">Ежедневно 9:00 — 22:00</p>
              </div>
              <div>
                <p className="text-white">{email}</p>
                <p className="text-gray-400 text-xs">Ответ в течение 15 минут</p>
              </div>
              <div>
                <p className="text-white">{address}</p>
                <p className="text-gray-400 text-xs">Работаем на доставку</p>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-8 border-gray-800" />

        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 text-sm text-gray-400">
          <p>© {currentYear} Oysters Белгород. Все права защищены.</p>
          <div className="flex items-center gap-6">
            <a href="#privacy" className="hover:text-yellow-400">Политика конфиденциальности</a>
            <a href="#terms" className="hover:text-yellow-400">Условия использования</a>
            <a href="#payment" className="hover:text-yellow-400">Способы оплаты</a>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-800">
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-gray-400">
            <span>Принимаем к оплате:</span>
            <div className="flex gap-3">
              {paymentBadges.map((label) => (
                <div key={label} className="w-12 h-8 bg-gray-800 rounded flex items-center justify-center uppercase">
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

