"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  ShoppingCart, 
  Settings, 
  Megaphone, 
  Image, 
  BellRing,
  Key,
  Menu,
  X,
  Calendar
} from "lucide-react"
import { Button } from "@/components/ui/button"

const menuItems = [
  { href: "/admin", label: "Дашборд", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Заказы", icon: ShoppingCart },
  { href: "/admin/products", label: "Товары", icon: Package },
  { href: "/admin/drops", label: "Дропы", icon: Calendar },
  { href: "/admin/waitlist", label: "Waitlist", icon: Package },
  { href: "/admin/users", label: "Пользователи", icon: Users },
  { href: "/admin/banners", label: "Баннеры", icon: Image },
  { href: "/admin/promos", label: "Промокоды", icon: Megaphone },
  { href: "/admin/notifications", label: "Уведомления", icon: BellRing },
  { href: "/admin/settings", label: "Настройки сайта", icon: Settings },
  { href: "/admin/integrations", label: "Интеграции", icon: Key },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="bg-gray-900 border-gray-800 text-white"
          aria-label="Toggle menu"
        >
          {isMobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed lg:sticky top-0 left-0 z-40 w-64 bg-gray-900 border-r border-gray-800 h-screen transition-transform duration-300 ease-in-out",
          "lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Overlay for mobile */}
        {isMobileOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-30"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        <div className="p-6">
          <Link 
            href="/admin" 
            className="flex items-center gap-2"
            onClick={() => setIsMobileOpen(false)}
          >
            <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-sm">O</span>
            </div>
            <span className="text-white font-bold text-xl">Oysters Admin</span>
          </Link>
        </div>
        
        <nav className="px-4 pb-6 overflow-y-auto h-[calc(100vh-5rem)]">
          <ul className="space-y-1" role="list">
            {menuItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== "/admin" && pathname.startsWith(item.href))
              
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900",
                      isActive
                        ? "bg-yellow-500/10 text-yellow-500 border-l-2 border-yellow-500"
                        : "text-gray-400 hover:text-white hover:bg-gray-800"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </>
  )
}
