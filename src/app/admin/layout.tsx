import type { ReactNode } from "react"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { AdminBreadcrumbs } from "@/components/admin/AdminBreadcrumbs"

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white flex">
      <AdminSidebar />
      <div className="flex-1 flex flex-col lg:ml-0">
        <header className="h-16 border-b border-gray-800 flex items-center justify-between px-4 lg:px-6 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <AdminBreadcrumbs />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 hidden sm:inline">Административная панель</span>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
