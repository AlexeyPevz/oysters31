import { z } from "zod"
import Link from "next/link"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const searchSchema = z.object({
  phone: z.string().optional(),
  userId: z.string().optional(),
})

async function fetchProfile(searchParams: Record<string, string | string[] | undefined>) {
  const parsed = searchSchema.safeParse({
    phone: typeof searchParams.phone === "string" ? searchParams.phone : undefined,
    userId: typeof searchParams.userId === "string" ? searchParams.userId : undefined,
  })

  if (!parsed.success || (!parsed.data.phone && !parsed.data.userId)) {
    return null
  }

  const params = new URLSearchParams(parsed.data as Record<string, string>)
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/profile?${params.toString()}`, {
    next: { revalidate: 0 },
    cache: "no-store",
  })

  if (!response.ok) {
    return null
  }

  return response.json()
}

export default async function ProfilePage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const profile = await fetchProfile(searchParams)

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 space-y-8">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h1 className="text-4xl font-bold">Личный кабинет</h1>
            <p className="text-gray-400">Введите номер телефона или ID, чтобы посмотреть историю заказов и повторить самые любимые позиции.</p>
            <form className="flex flex-col gap-3" action="/profile">
              <Input name="phone" placeholder="Телефон" className="bg-gray-900 border-gray-800 text-white" />
              <Input name="userId" placeholder="ID клиента (по желанию)" className="bg-gray-900 border-gray-800 text-white" />
              <Button className="bg-yellow-500 text-black hover:bg-yellow-400">Показать заказы</Button>
            </form>
          </div>

          {profile ? (
            <section className="space-y-6">
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
                <div className="grid gap-4 lg:grid-cols-3">
                  <div>
                    <p className="text-gray-400 text-sm">Имя</p>
                    <p className="text-xl font-semibold">{profile.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Телефон</p>
                    <p className="text-lg">{profile.phone}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Всего заказов</p>
                    <p className="text-lg">{profile.ordersCount}</p>
                  </div>
                </div>
                <div className="text-right text-yellow-400 text-sm mt-4">
                  В сумме {profile.totalSpent.toLocaleString('ru-RU')} ₽</div>
              </div>
              <Tabs defaultValue="orders" className="space-y-4">
                <TabsList className="bg-gray-900 border border-gray-800">
                  <TabsTrigger value="orders">Заказы</TabsTrigger>
                  <TabsTrigger value="info">Настройки</TabsTrigger>
                </TabsList>
                <TabsContent value="orders" className="space-y-4">
                  {profile.orders.length === 0 ? (
                    <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 text-center text-gray-400">
                      Пока нет заказов.
                    </div>
                  ) : (
                    profile.orders.map((order: any) => (
                      <div key={order.id} className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-white font-semibold">Заказ {order.orderNumber}</p>
                            <p className="text-gray-400 text-sm">
                              {new Date(order.createdAt).toLocaleDateString('ru-RU')} • {order.status}
                            </p>
                          </div>
                          <Button variant="outline" className="border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black">Повторить</Button>
                        </div>
                        <div className="space-y-2">
                          {(order.orderItems && order.orderItems.length > 0
                            ? order.orderItems.map((item: any) => ({
                                name: item.product?.name ?? "Товар",
                                quantity: item.quantity,
                                unitPrice: Number(item.unitPrice),
                              }))
                            : order.items || []
                          ).map((item: any, index: number) => (
                            <div key={index} className="flex items-center justify-between text-sm text-gray-300">
                              <span>{item.name}</span>
                              <span>{item.quantity} × {Number(item.unitPrice).toLocaleString('ru-RU')} ₽</span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between border-t border-gray-800 pt-3 text-white font-semibold">
                            <span>Итого</span>
                            <span>{Number(order.totalAmount).toLocaleString('ru-RU')} ₽</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>
                <TabsContent value="info">
                  <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6">
                    <p className="text-gray-400">Редактирование профиля и адресов будет доступно в следующем релизе.</p>
                  </div>
                </TabsContent>
              </Tabs>
            </section>
          ) : (
            <section className="text-center text-gray-500">
              Введите телефон, чтобы увидеть историю покупок.
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
