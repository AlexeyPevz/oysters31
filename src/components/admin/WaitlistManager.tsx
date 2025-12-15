"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, Calendar, User, Phone } from "lucide-react"

type WaitlistItem = {
  id: string
  productId: string
  dropId: string | null
  preferredDate: Date | string | null
  preferredSlot: string | null
  notifyBeforeHours: number | null
  autoOrderCreated: boolean
  createdAt: Date | string
  product: {
    id: string
    name: string
    slug: string
  }
  drop: {
    id: string
    dropDate: Date | string
    product: {
      id: string
      name: string
    }
  } | null
  client: {
    id: string
    name: string
    phone: string
  } | null
}

export function WaitlistManager({ initialWaitlist }: { initialWaitlist: WaitlistItem[] }) {
  const active = initialWaitlist.filter((item) => !item.autoOrderCreated)
  const processed = initialWaitlist.filter((item) => item.autoOrderCreated)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-400">Предзаказы</p>
        <h1 className="text-4xl font-bold">Waitlist</h1>
      </div>

      {active.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Активные заявки ({active.length})</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {active.map((item) => (
              <Card key={item.id} className="bg-gray-900/60 border-gray-800">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{item.product.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-2">
                        <Package className="h-4 w-4" />
                        {item.drop ? (
                          <>
                            Дроп: {new Date(item.drop.dropDate).toLocaleDateString("ru-RU")}
                          </>
                        ) : (
                          "Без дропа"
                        )}
                      </CardDescription>
                    </div>
                    <Badge className="bg-yellow-500/20 text-yellow-200">Ожидает</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {item.client && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <User className="h-4 w-4" />
                      {item.client.name}
                    </div>
                  )}
                  {item.client && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Phone className="h-4 w-4" />
                      {item.client.phone}
                    </div>
                  )}
                  {item.preferredDate && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Calendar className="h-4 w-4" />
                      Предпочитаемая дата: {new Date(item.preferredDate).toLocaleDateString("ru-RU")}
                    </div>
                  )}
                  {item.preferredSlot && (
                    <p className="text-sm text-gray-400">Слот: {item.preferredSlot}</p>
                  )}
                  {item.notifyBeforeHours && (
                    <p className="text-sm text-gray-400">Уведомить за {item.notifyBeforeHours} ч.</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {processed.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Обработанные ({processed.length})</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {processed.map((item) => (
              <Card key={item.id} className="bg-gray-900/40 border-gray-800 opacity-60">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{item.product.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-2">
                        <Package className="h-4 w-4" />
                        {item.drop ? (
                          <>
                            Дроп: {new Date(item.drop.dropDate).toLocaleDateString("ru-RU")}
                          </>
                        ) : (
                          "Без дропа"
                        )}
                      </CardDescription>
                    </div>
                    <Badge className="bg-green-500/20 text-green-200">Обработан</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {item.client && (
                    <>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <User className="h-4 w-4" />
                        {item.client.name}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Phone className="h-4 w-4" />
                        {item.client.phone}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {initialWaitlist.length === 0 && (
        <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-10 text-center text-gray-400">
          Заявок в waitlist пока нет.
        </div>
      )}
    </div>
  )
}
