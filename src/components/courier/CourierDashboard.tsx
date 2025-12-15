"use client"

import { useMemo } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Bike, Clock, MapPin, Navigation, Package, Phone, RefreshCcw, ShieldCheck } from "lucide-react"
import { type OrderStatus } from "@prisma/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getCourierActions, getSlotLabel, statusBadgeStyles, statusLabels } from "@/lib/order-workflow"
import { CourierDashboardData, OperationalOrder } from "@/lib/services/operations"

const queryKey = ["courier-dashboard"]

async function fetchCourierDashboard(): Promise<CourierDashboardData> {
  const response = await fetch("/api/courier/orders", { cache: "no-store" })
  if (!response.ok) {
    let message = "Не удалось обновить заказы"
    try {
      const data = await response.json()
      message = data.error ?? message
    } catch {}
    throw new Error(message)
  }
  return response.json()
}

async function updateCourierStatus(orderId: string, status: OrderStatus, note?: string) {
  const response = await fetch(`/api/courier/orders/${orderId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, note }),
  })
  if (!response.ok) {
    let message = "Не удалось обновить статус"
    try {
      const data = await response.json()
      message = data.error ?? message
    } catch {}
    throw new Error(message)
  }
  return response.json()
}

export function CourierDashboard({ initialData }: { initialData: CourierDashboardData }) {
  const { data, isFetching, refetch } = useQuery({
    queryKey,
    queryFn: fetchCourierDashboard,
    initialData,
    refetchOnMount: true,
  })

  const mutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) => updateCourierStatus(orderId, status),
    onSuccess: () => {
      toast.success("Статус обновлён")
      refetch()
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Ошибка обновления")
    },
  })

  const nextOrder = data.activeOrders[0]
  const recentOrders = data.deliveredToday

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-28">
      <div className="mx-auto max-w-5xl px-4 pt-8 space-y-8">
        <CourierHero nextOrder={nextOrder} stats={data.stats} isRefreshing={isFetching} onRefresh={refetch} courierName={data.courier.name} />
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Назначенные доставки</p>
              <h2 className="text-2xl font-semibold">Активные заказы ({data.activeOrders.length})</h2>
            </div>
            <span className="text-xs text-gray-500">Обновлено: {new Date(data.updatedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          {data.activeOrders.length === 0 ? (
            <div className="rounded-3xl border border-gray-900 bg-gradient-to-r from-gray-900/60 to-gray-900/20 p-6 text-center">
              <p className="text-xl font-semibold">Нет заказов в работе</p>
              <p className="text-gray-400 text-sm mt-2">Как только оператор назначит доставку, она появится здесь и придёт push-уведомление.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.activeOrders.map((order) => (
                <CourierOrderCard key={order.id} order={order} onAction={(status) => mutation.mutate({ orderId: order.id, status })} disabled={mutation.isPending} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-300" />
            <h3 className="text-sm uppercase tracking-[0.2em] text-gray-400">Сегодня закрыты</h3>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-gray-500 text-sm">Ещё нет доставленных заказов за сегодня.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {recentOrders.map((order) => (
                <div key={order.id} className="rounded-2xl border border-gray-900 bg-gray-900/40 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">{order.orderNumber}</span>
                    <span className="text-xs text-emerald-300">{statusLabels[order.status]}</span>
                  </div>
                  <p className="text-base font-semibold mt-2">{formatAddress(order)}</p>
                  <p className="text-sm text-gray-400">{new Date(order.updatedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <FloatingActions hasOrder={Boolean(nextOrder)} phone={nextOrder?.customer.phone} onRefresh={refetch} loading={isFetching || mutation.isPending} />
    </div>
  )
}

function CourierHero({
  nextOrder,
  stats,
  isRefreshing,
  onRefresh,
  courierName,
}: {
  nextOrder?: OperationalOrder
  stats: CourierDashboardData["stats"]
  isRefreshing: boolean
  onRefresh: () => void
  courierName: string
}) {
  return (
    <section className="rounded-3xl border border-gray-900 bg-gradient-to-br from-gray-900/60 via-gray-900/20 to-gray-900/40 p-6 space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-400">Добро пожаловать,</p>
          <h1 className="text-3xl font-bold">{courierName}</h1>
        </div>
        <Button onClick={() => onRefresh()} disabled={isRefreshing} variant="outline" className="border-gray-800 bg-black/30 text-gray-200">
          <RefreshCcw className={cn("size-4", { "animate-spin": isRefreshing })} />
          Обновить
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="В работе" value={stats.active.toString()} icon={Bike} accent="from-sky-500/40" />
        <StatCard label="Готовы к выдаче" value={stats.readyForPickup.toString()} icon={Package} accent="from-amber-500/40" />
        <StatCard label="Доставлено сегодня" value={stats.deliveredToday.toString()} icon={ShieldCheck} accent="from-emerald-500/40" />
      </div>
      {nextOrder && (
        <div className="rounded-2xl border border-gray-800 bg-black/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Следующий заказ</span>
            <span className="text-sm text-gray-300">{nextOrder.orderNumber}</span>
          </div>
          <p className="text-xl font-semibold leading-tight">{formatAddress(nextOrder)}</p>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300">
            <div className="flex items-center gap-1"><Clock className="size-4" />{getSlotLabel(nextOrder.slot)}</div>
            <div className="flex items-center gap-1"><Phone className="size-4" />{nextOrder.customer.phone ?? "не указан"}</div>
          </div>
        </div>
      )}
    </section>
  )
}

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: string; icon: typeof Bike; accent: string }) {
  return (
    <div className="rounded-2xl border border-gray-900 bg-gradient-to-br from-gray-900/40 to-transparent p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{label}</p>
        <div className={cn("rounded-full bg-white/10 p-2", accent && `bg-gradient-to-br ${accent}`)}>
          <Icon className="size-4" />
        </div>
      </div>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  )
}

function CourierOrderCard({ order, onAction, disabled }: { order: OperationalOrder; onAction: (status: OrderStatus) => void; disabled: boolean }) {
  const actions = getCourierActions(order.status)
  const badge = statusBadgeStyles[order.status]
  const mapQuery = encodeURIComponent(formatAddress(order))
  const mapEmbed = `https://yandex.ru/map-widget/v1/?text=${mapQuery}`

  return (
    <article className="rounded-3xl border border-gray-900 bg-gray-950/70 p-5 space-y-4">
      <header className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <p className="text-sm text-gray-400">{order.orderNumber}</p>
          <p className="text-lg font-semibold">{order.customer.name}</p>
        </div>
        <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", badge.bg, badge.text, badge.border)}>
          {statusLabels[order.status]}
        </span>
      </header>

      <div className="flex flex-col gap-3 text-sm text-gray-300">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-gray-500" />
          <span>{new Date(order.deliveryDate).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</span>
          <span className="text-gray-500">•</span>
          <span>{getSlotLabel(order.slot)}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-gray-500" />
          <span>{formatAddress(order)}</span>
        </div>
        {order.deliveryComment && (
          <p className="rounded-2xl bg-gray-900/60 border border-gray-800 p-3 text-gray-200 text-sm">
            {order.deliveryComment}
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-900">
        <iframe src={mapEmbed} title={`map-${order.id}`} loading="lazy" className="h-48 w-full" referrerPolicy="no-referrer" allowFullScreen />
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Состав заказа</p>
        <div className="flex flex-wrap gap-2">
          {order.items.map((item) => (
            <span key={item.id} className="rounded-full border border-gray-800 px-3 py-1 text-sm text-gray-200">
              {item.name} · {item.quantity} {item.unit}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-lg font-semibold">
          {order.totalAmount.toLocaleString("ru-RU")} ₽
          <span className="ml-2 text-sm font-normal text-gray-400">{order.paymentMethod === "CASH" ? "наличные" : "онлайн"}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="border-gray-800 bg-transparent text-gray-200">
            <a href={`tel:${order.customer.phone ?? ""}`}><Phone className="size-4" />Позвонить</a>
          </Button>
          <Button asChild variant="outline" className="border-gray-800 bg-transparent text-gray-200">
            <a href={`https://yandex.ru/maps/?text=${mapQuery}`} target="_blank" rel="noreferrer">
              <Navigation className="size-4" />Маршрут
            </a>
          </Button>
        </div>
      </div>

      {actions.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {actions.map((action) => (
            <Button
              key={action.status}
              disabled={disabled}
              onClick={() => onAction(action.status)}
              className={cn(
                "w-full",
                action.tone === "success" && "bg-emerald-500 text-black hover:bg-emerald-400",
                action.tone === "danger" && "bg-rose-500 text-white hover:bg-rose-500/90",
              )}
              variant={action.tone === "danger" ? "destructive" : action.tone === "success" ? "secondary" : "default"}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </article>
  )
}

function FloatingActions({ hasOrder, phone, onRefresh, loading }: { hasOrder: boolean; phone?: string | null; onRefresh: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-2">
      <div className="mx-auto max-w-3xl rounded-3xl border border-gray-900 bg-black/80 backdrop-blur p-4 shadow-2xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Экстренная связь</p>
            <p className="text-xs text-gray-400">Обновляйте статус сразу после действий — клиенты получают push/SMS.</p>
          </div>
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="border-gray-800 bg-transparent text-gray-200" disabled={!hasOrder || !phone} asChild>
              <a href={phone ? `tel:${phone}` : undefined}>
                <Phone className="size-4" />Связаться с клиентом
              </a>
            </Button>
            <Button onClick={() => onRefresh()} disabled={loading} className="bg-yellow-400 text-black hover:bg-yellow-300">
              <RefreshCcw className={cn("size-4", { "animate-spin": loading })} />
              Обновить заказы
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatAddress(order: OperationalOrder) {
  const segments = [order.address.street, `дом ${order.address.house}`]
  if (order.address.flat) segments.push(`кв. ${order.address.flat}`)
  if (order.address.porch) segments.push(`подъезд ${order.address.porch}`)
  return segments.filter(Boolean).join(", ")
}


