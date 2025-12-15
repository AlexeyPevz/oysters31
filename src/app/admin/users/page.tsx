import { listUsers } from "@/lib/services/user"
import { UserRoleForm } from "@/components/admin/UserRoleForm"
import { CreateUserForm } from "@/components/admin/CreateUserForm"
import { ResetPasswordForm } from "@/components/admin/ResetPasswordForm"
import { BackButton } from "@/components/admin/BackButton"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Key, Plus, Users as UsersIcon } from "lucide-react"
import Link from "next/link"

export default async function AdminUsersPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const page = typeof searchParams.page === "string" ? Number(searchParams.page) : 1
  const result = await listUsers({ page, limit: 20 })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">Команда</p>
          <h1 className="text-4xl font-bold">Пользователи</h1>
        </div>
        
        <div className="flex gap-3">
          <BackButton href="/admin" />
          
          <Dialog>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Создать пользователя
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Создание пользователя</DialogTitle>
                <DialogDescription>
                  Добавьте нового пользователя в систему
                </DialogDescription>
              </DialogHeader>
              <CreateUserForm />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl">
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-6 gap-3 px-4 py-3 border-b border-gray-800 text-sm text-gray-400">
              <span>Имя</span>
              <span>Контакты</span>
              <span>Заказы</span>
              <span>Роль</span>
              <span>Создан</span>
              <span>Действия</span>
            </div>
            {result.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <UsersIcon className="h-12 w-12 text-gray-600 mb-4" />
                <p className="text-gray-400 text-lg mb-2">Пользователи не найдены</p>
                <p className="text-gray-500 text-sm mb-4">Создайте первого пользователя, чтобы начать работу</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {result.items.map((user) => (
                  <div key={user.id} className="grid grid-cols-6 gap-3 px-4 py-4 text-sm hover:bg-gray-800/30 transition-colors">
                    <div>
                      <p className="text-white font-medium">{user.name}</p>
                      <p className="text-gray-500 text-xs truncate" title={user.id}>{user.id}</p>
                    </div>
                    <div className="text-gray-300">
                      <p className="truncate" title={user.phone}>{user.phone}</p>
                      {user.email && (
                        <p className="truncate text-xs" title={user.email}>{user.email}</p>
                      )}
                    </div>
                    <div className="text-white">{user._count.orders}</div>
                    <div>
                      <UserRoleForm userId={user.id} currentRole={user.role} />
                    </div>
                    <div className="text-gray-400 text-xs">
                      {new Date(user.createdAt).toLocaleDateString("ru-RU")}
                    </div>
                    <div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="flex items-center gap-1 w-full sm:w-auto">
                            <Key className="h-3 w-3" />
                            <span className="hidden sm:inline">Пароль</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Сброс пароля</DialogTitle>
                            <DialogDescription>
                              Установите новый пароль для пользователя {user.name}
                            </DialogDescription>
                          </DialogHeader>
                          <ResetPasswordForm userId={user.id} userName={user.name} />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Pagination */}
            {result.pagination.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-4 border-t border-gray-800">
                <p className="text-sm text-gray-400">
                  Показано {((page - 1) * 20) + 1} - {Math.min(page * 20, result.pagination.total)} из {result.pagination.total}
                </p>
                <div className="flex gap-2">
                  {page > 1 && (
                    <Link href={`/admin/users?page=${page - 1}`}>
                      <Button variant="outline" size="sm">
                        Назад
                      </Button>
                    </Link>
                  )}
                  {page < result.pagination.pages && (
                    <Link href={`/admin/users?page=${page + 1}`}>
                      <Button variant="outline" size="sm">
                        Вперед
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
