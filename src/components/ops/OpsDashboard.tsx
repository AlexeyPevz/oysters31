"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { ChefHat, Flame, Loader2, MapPin, MessageSquare, PackageCheck, Radio, RefreshCcw, Signal, Timer, UtensilsCrossed } from "lucide-react"
import { type OrderStatus } from "@prisma/client"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getOpsActions, getSlotLabel, statusBadgeStyles, statusLabels } from "@/lib/order-workflow"
import { OpsDashboardData, OperationalOrder } from "@/lib/services/operations"

const queryKey = ["ops-dashboard"]

async function fetchOpsDashboard(): Promise<OpsDashboardData> {
  const response = await fetch("/api/ops/orders", { cache: "no-store" })
  if (!response.ok) {
    let message = "Не удалось загрузить очередь кухни"
    try {
      const data = await response.json()
      message = data.error ?? message
    } catch {}
    throw new Error(message)
  }
  return response.json()
}

async function updateKitchenStatus(orderId: string, status: OrderStatus, note?: string) {
  const response = await fetch(`/api/ops/orders/${orderId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, note }),
  })
  if (!response.ok) {
    let message = "Не удалось изменить статус"
    try {
      const data = await response.json()
      message = data.error ?? message
    } catch {}
    throw new Error(message)
  }
  return response.json()
}

export function OpsDashboard({ initialData }: { initialData: OpsDashboardData }) {
  const [tab, setTab] = useState("queue")
  const { data, refetch, isFetching } = useQuery({ queryKey, queryFn: fetchOpsDashboard, initialData, refetchOnMount: true })

  const mutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) => updateKitchenStatus(orderId, status),
    onSuccess: () => {
      toast.success("Обновлено")
      refetch()
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Ошибка"),
  })

  const sections = useMemo(
    () => [
      { key: "queue", title: `Очередь (${data.queue.length})`, description: "Новые и ожидающие подтверждения", orders: data.queue },
      { key: "prep", title: `Готовим (${data.prep.length})`, description: "На кухне / упаковка", orders: data.prep },
      { key: "handoff", title: `Передача (${data.inTransit.length})`, description: "У курьеров", orders: data.inTransit },
    ],
    [data.queue, data.prep, data.inTransit],
  )

  return (
    <div className="min-h-screen bg-slate-950 pb-28 text-white">
      <div className="mx-auto max-w-6xl px-4 pt-10 space-y-8">
        <OpsHero data={data} isRefreshing={isFetching} onRefresh={refetch} />

        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="flex w-full justify-start overflow-auto bg-slate-900/60">
            {sections.map((section) => (
              <TabsTrigger key={section.key} value={section.key} className="data-[state=active]:bg-white data-[state=active]:text-black">
                {section.title}
              </TabsTrigger>
            ))}
          </TabsList>

          {sections.map((section) => (
            <TabsContent key={section.key} value={section.key} className="space-y-4">
              <p className="text-sm text-slate-400">{section.description}</p>
              {section.orders.length === 0 ? (
                <div className="rounded-3xl border border-slate-900 bg-slate-900/40 p-6 text-center text-slate-400">
                  Нет заказов в этом состоянии
                </div>
              ) : (
                <div className="space-y-4">
                  {section.orders.map((order) => (
                    <OpsOrderCard key={order.id} order={order} disabled={mutation.isPending} onAction={(status) => mutation.mutate({ orderId: order.id, status })} />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <OpsStickyBar isRefreshing={isFetching || mutation.isPending} onRefresh={refetch} />
    </div>
  )
}

function OpsHero({ data, isRefreshing, onRefresh }: { data: OpsDashboardData; isRefreshing: boolean; onRefresh: () => void }) {
  const slotEntries = Object.entries(data.slots)
  return (
    <section className="rounded-3xl border border-slate-900 bg-gradient-to-br from-slate-900/70 via-slate-900/20 to-slate-900/60 p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-slate-400">Производственный контур</p>
          <h1 className="text-3xl font-bold">Кухня и сборка</h1>
        </div>
        <Button onClick={onRefresh} disabled={isRefreshing} className="bg-white text-black hover:bg-white/90">
          {isRefreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
          Синхронизировать
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Очередь" value={data.summary.queue} icon={Radio} accent="from-sky-500/30" />
        <SummaryCard label="На кухне" value={data.summary.prep} icon={Flame} accent="from-amber-500/30" />
        <SummaryCard label="Передано" value={data.summary.inTransit} icon={UtensilsCrossed} accent="from-emerald-500/30" />
        <SummaryCard label="Закрыто сегодня" value={data.summary.deliveredToday} icon={PackageCheck} accent="from-purple-500/30" />
      </div>

      <div className="rounded-2xl border border-slate-900/60 bg-black/30 p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-3">Слоты на приготовление</p>
        <div className="grid gap-3 md:grid-cols-3">
          {slotEntries.map(([slot, count]) => (
            <div key={slot} className="rounded-xl border border-slate-900/60 bg-slate-900/30 p-3">
              <p className="text-sm text-slate-400">{getSlotLabel(slot as keyof typeof data.slots)}</p>
              <p className="text-2xl font-semibold">{count}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SummaryCard({ label, value, icon: Icon, accent }: { label: string; value: number; icon: typeof Radio; accent: string }) {
  return (
    <div className="rounded-2xl border border-slate-900 bg-gradient-to-br from-slate-900/50 to-transparent p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{label}</p>
        <div className={cn("rounded-full bg-white/10 p-2 text-white", accent && `bg-gradient-to-br ${accent}`)}>
          <Icon className="size-4" />
        </div>
      </div>
      <p className="text-3xl font-semibold mt-2">{value}</p>
    </div>
  )
}

function OpsOrderCard({ order, onAction, disabled }: { order: OperationalOrder; onAction: (status: OrderStatus) => void; disabled: boolean }) {
  const actions = getOpsActions(order.status)
  const badge = statusBadgeStyles[order.status]

  return (
    <article className="rounded-3xl border border-slate-900 bg-slate-950/80 p-5 space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-slate-400">{order.orderNumber}</p>
          <p className="text-lg font-semibold">{order.customer.name}</p>
        </div>
        <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", badge.bg, badge.text, badge.border)}>{statusLabels[order.status]}</span>
      </header>

      <div className="grid gap-3 text-sm text-slate-200 md:grid-cols-2">
        <div className="flex items-center gap-2">
          <Timer className="size-4 text-slate-500" />
          <span>{new Date(order.deliveryDate).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
          <span className="text-slate-500">•</span>
          <span>{getSlotLabel(order.slot)}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-slate-500" />
          <span className="truncate">{formatAddress(order)}</span>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-900 bg-black/30 p-4 space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Состав</p>
        <div className="flex flex-wrap gap-2">
          {order.items.map((item) => (
            <span key={item.id} className="rounded-full border border-slate-800 px-3 py-1 text-sm">
              {item.name} · {item.quantity} {item.unit}
            </span>
          ))}
        </div>
      </div>

      {order.deliveryComment && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-100 flex items-start gap-2">
          <MessageSquare className="size-4 mt-0.5" />
          <span>{order.deliveryComment}</span>
        </div>
      )}

      {order.courier && (
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <ChefHat className="size-4 text-slate-500" />
          Курьер: {order.courier.name ?? "назначается"} ({order.courier.phone})
        </div>
      )}

      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button
              key={action.status}
              disabled={disabled}
              onClick={() => onAction(action.status)}
              className={cn(
                action.tone === "primary" && "bg-sky-500 text-black hover:bg-sky-400",
                action.tone === "success" && "bg-emerald-500 text-black hover:bg-emerald-400",
                action.tone === "danger" && "bg-rose-500 text-white hover:bg-rose-500/90",
              )}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </article>
  )
}

function OpsStickyBar({ isRefreshing, onRefresh }: { isRefreshing: boolean; onRefresh: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 px-4 pb-4">
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-900 bg-slate-950/90 backdrop-blur p-4 shadow-2xl">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold">Мониторинг в реальном времени</p>
            <p className="text-xs text-slate-400">Система пушит курьеров и клиентов сразу после смены статуса.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-slate-800 bg-transparent text-slate-200">
              <Signal className="size-4" />Звук уведомлений
            </Button>
            <Button onClick={onRefresh} disabled={isRefreshing} className="bg-white text-black hover:bg-white/90">
              {isRefreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
              Обновить очередь
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatAddress(order: OperationalOrder) {
  const parts = [order.address.street, `дом ${order.address.house}`]
  if (order.address.flat) parts.push(`кв. ${order.address.flat}`)
  return parts.filter(Boolean).join(", ")
}


