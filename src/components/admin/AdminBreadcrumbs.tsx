"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ChevronRight, Home } from "lucide-react"

interface BreadcrumbItem {
  label: string
  href?: string
}

export function AdminBreadcrumbs() {
  const pathname = usePathname()
  
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = pathname.split("/").filter(Boolean)
    
    if (pathSegments.length === 0 || pathSegments[0] !== "admin") {
      return []
    }
    
    const breadcrumbs: BreadcrumbItem[] = [
      { label: "Панель управления", href: "/admin" }
    ]
    
    // Обрабатываем пути админки
    if (pathSegments.length > 1) {
      const segment = pathSegments[1]
      
      const pageLabels: Record<string, string> = {
        orders: "Заказы",
        products: "Товары",
        users: "Пользователи",
        banners: "Баннеры",
        promos: "Промокоды",
        notifications: "Уведомления",
        settings: "Настройки",
        integrations: "Интеграции",
      }
      
      if (pageLabels[segment]) {
        breadcrumbs.push({
          label: pageLabels[segment],
          href: `/admin/${segment}`
        })
      }
    }
    
    // Если есть ID в пути, это страница детализации
    if (pathSegments.length > 2 && pathSegments[2]) {
      breadcrumbs.push({
        label: "Детали"
      })
    }
    
    return breadcrumbs
  }
  
  const breadcrumbs = getBreadcrumbs()
  
  if (breadcrumbs.length <= 1) {
    return null
  }
  
  return (
    <nav 
      className="flex items-center space-x-1 text-sm text-gray-400" 
      aria-label="Навигационная цепочка"
    >
      <Link 
        href="/admin" 
        className="flex items-center hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 rounded"
        aria-label="Главная страница админки"
      >
        <Home className="h-4 w-4" />
      </Link>
      
      {breadcrumbs.slice(1).map((item, index) => {
        const isLast = index === breadcrumbs.length - 2
        
        return (
          <div key={index} className="flex items-center">
            <ChevronRight className="h-4 w-4 mx-1 flex-shrink-0" aria-hidden="true" />
            {item.href ? (
              <Link
                href={item.href}
                className={cn(
                  "hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 rounded px-1",
                  isLast && "text-white font-medium"
                )}
                aria-current={isLast ? "page" : undefined}
              >
                {item.label}
              </Link>
            ) : (
              <span 
                className={cn(
                  "px-1",
                  isLast && "text-white font-medium"
                )}
                aria-current="page"
              >
                {item.label}
              </span>
            )}
          </div>
        )
      })}
    </nav>
  )
}
