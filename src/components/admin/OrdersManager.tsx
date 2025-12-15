"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { DeliverySlot, OrderStatus } from "@prisma/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getSlotLabel, statusLabels } from "@/lib/order-workflow"

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Неизвестная ошибка")

export type AdminOrder = {
  id: string
  orderNumber: string
  status: OrderStatus
  totalAmount: number
  deliveryStreet: string
  deliveryHouse: string
  deliveryFlat?: string | null
  deliveryPorch?: string | null
  deliveryFloor?: string | null
  deliveryComment?: string | null
  deliveryDate: string | Date
  slot: DeliverySlot
  paymentMethod?: PaymentMethod
  createdAt: string | Date
  updatedAt: string | Date
  courierId?: string | null
  dropId?: string | null
  hourlySlot?: string | null
  notifyBeforeHours?: number | null
  user?: { id: string; name: string | null; phone: string | null } | null
  courier?: { id: string; name: string | null; phone: string | null } | null
  items?: unknown // Устаревшее поле, используем orderItems
  orderItems?: Array<{
    id: string
    productId: string
    quantity: number
    unitPrice: number
    orderId: string
    product?: { id: string; name: string; unit: string } | null
  }>
}

type OrderResponse = {
  items: AdminOrder[]
  pagination: { page: number; limit: number; total: number; pages: number }
}

type CourierOption = { id: string; name: string | null; phone: string | null }

type FilterState = {
  status: string
  courierId: string
  search: string
  dateFrom: string
  dateTo: string
  page: number
}

const defaultFilters: FilterState = {
  status: "all",
  courierId: "all",
  search: "",
  dateFrom: "",
  dateTo: "",
  page: 1,
}

async function fetchOrders(filters: FilterState): Promise<OrderResponse> {
  const params = new URLSearchParams()
  if (filters.status !== "all") params.set("status", filters.status)
  if (filters.courierId && filters.courierId !== "all") params.set("courierId", filters.courierId)
  if (filters.search) params.set("search", filters.search)
  if (filters.dateFrom) params.set("startDate", filters.dateFrom)
  if (filters.dateTo) params.set("endDate", filters.dateTo)
  params.set("page", String(filters.page))
  params.set("limit", "50")
  const response = await fetch(`/api/orders?${params.toString()}` , { cache: "no-store" })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Не удалось загрузить заказы" }))
    throw new Error(error.error ?? "Ошибка загрузки")
  }
  return response.json()
}

async function bulkAction(body: { orderIds: string[]; status?: OrderStatus; courierId?: string | null }) {
  const response = await fetch("/api/admin/orders/bulk", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Не удалось применить действие" }))
    throw new Error(error.error ?? "Ошибка массового действия")
  }
  return response.json()
}

export function OrdersManager({ initialData, couriers }: { initialData: OrderResponse; couriers: CourierOption[] }) {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [selection, setSelection] = useState<Set<string>>(new Set())
  const [details, setDetails] = useState<AdminOrder | null>(null)
  const [bulkStatus, setBulkStatus] = useState<string>("none")
  const [bulkCourier, setBulkCourier] = useState<string>("none")

  const query = useQuery({
    queryKey: ["admin-orders", filters],
    queryFn: () => fetchOrders(filters),
    initialData,
    keepPreviousData: true,
  })

  const mutation = useMutation({
    mutationFn: bulkAction,
    onSuccess: ({ count }) => {
      toast.success(`Обновлено ${count} заказов`)
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] })
      setSelection(new Set())
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const allChecked = query.data.items.length > 0 && query.data.items.every((order) => selection.has(order.id))

  const toggleRow = (id: string, checked: boolean) => {
    setSelection((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const toggleAll = (checked: boolean) => {
    if (checked) setSelection(new Set(query.data.items.map((order) => order.id)))
    else setSelection(new Set())
  }

  const applyBulk = () => {
    if (!selection.size) {
      toast.error("Выберите заказы")
      return
    }
    if ((!bulkStatus || bulkStatus === "none") && (!bulkCourier || bulkCourier === "none")) {
      toast.error("Укажите новое значение")
      return
    }
    mutation.mutate({
      orderIds: Array.from(selection),
      status: bulkStatus && bulkStatus !== "none" ? (bulkStatus as OrderStatus) : undefined,
      courierId: bulkCourier && bulkCourier !== "none" ? bulkCourier : undefined,
    })
  }

  const csvData = useMemo(() => {
    const header = ["orderNumber", "status", "amount", "client", "phone", "createdAt"]
    const rows = query.data.items.map((order) => [
      order.orderNumber,
      statusLabels[order.status] ?? order.status,
      Number(order.totalAmount).toString(),
      order.user?.name ?? "Гость",
      order.user?.phone ?? "-",
      new Date(order.createdAt).toLocaleString("ru-RU"),
    ])
    return [header, ...rows].map((columns) => columns.join(";"))
  }, [query.data.items])

  const exportCsv = () => {
    const blob = new Blob([csvData.join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `orders-${Date.now()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <FilterRow filters={filters} setFilters={setFilters} couriers={couriers} />

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-900 bg-gray-950/80 p-4 text-sm">
        <Checkbox checked={allChecked} onCheckedChange={(checked) => toggleAll(Boolean(checked))} />
        <span className="text-gray-300">Выбрано {selection.size}</span>
        <Select value={bulkStatus} onValueChange={setBulkStatus}>
          <SelectTrigger className="w-48 bg-gray-900 border-gray-800 text-white">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-gray-800 text-white">
            <SelectItem value="none">Без изменений</SelectItem>
            {Object.keys(statusLabels).map((status) => (
              <SelectItem key={status} value={status} className="text-white">
                {statusLabels[status as OrderStatus] ?? status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={bulkCourier} onValueChange={setBulkCourier}>
          <SelectTrigger className="w-48 bg-gray-900 border-gray-800 text-white">
            <SelectValue placeholder="Курьер" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-gray-800 text-white">
            <SelectItem value="none">Без изменений</SelectItem>
            {couriers.map((courier) => (
              <SelectItem key={courier.id} value={courier.id} className="text-white">
                {courier.name ?? courier.phone ?? courier.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button className="bg-yellow-500 text-black hover:bg-yellow-400" disabled={mutation.isPending} onClick={applyBulk}>
          Применить
        </Button>
        <Button variant="outline" className="border-gray-800" onClick={exportCsv}>
          Экспорт CSV
        </Button>
      </div>

      <div className="rounded-2xl border border-gray-900 bg-gray-950/70 overflow-x-auto">
        <table className="w-full min-w-[768px] text-sm">
          <thead className="bg-gray-900 text-gray-400">
            <tr>
              <th className="px-4 py-3"></th>
              <th className="px-4 py-3 text-left">Заказ</th>
              <th className="px-4 py-3 text-left">Клиент</th>
              <th className="px-4 py-3 text-left">Слот</th>
              <th className="px-4 py-3 text-right">Сумма</th>
              <th className="px-4 py-3 text-right">Дата</th>
              <th className="px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-900">
            {query.data.items.map((order) => (
              <tr key={order.id} className="hover:bg-gray-900/40">
                <td className="px-4 py-3">
                  <Checkbox checked={selection.has(order.id)} onCheckedChange={(checked) => toggleRow(order.id, Boolean(checked))} />
                </td>
                <td className="px-4 py-3">
                  <p className="text-white font-semibold">{order.orderNumber}</p>
                  <p className="text-xs text-gray-500">{statusLabels[order.status] ?? order.status}</p>
                </td>
                <td className="px-4 py-3 text-gray-300">
                  <p>{order.user?.name ?? "Гость"}</p>
                  <p className="text-xs text-gray-500">{order.user?.phone ?? "-"}</p>
                </td>
                <td className="px-4 py-3 text-gray-300">
                  <p>{getSlotLabel(order.slot)}</p>
                  <p className="text-xs text-gray-500">{order.deliveryStreet}, {order.deliveryHouse}</p>
                </td>
                <td className="px-4 py-3 text-right text-white font-semibold">{Number(order.totalAmount).toLocaleString("ru-RU")} ₽</td>
                <td className="px-4 py-3 text-right text-gray-400">{new Date(order.createdAt).toLocaleString("ru-RU")}</td>
                <td className="px-4 py-3 text-right">
                  <Button variant="outline" size="sm" className="border-gray-800 text-gray-100" onClick={() => setDetails(order)}>
                    Подробнее
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PaginationBar filters={filters} totalPages={query.data.pagination.pages} setFilters={setFilters} />

      <Dialog open={Boolean(details)} onOpenChange={(open) => !open && setDetails(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border border-gray-800 bg-gray-950 text-white">
          {details && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>{details.orderNumber}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 text-sm text-gray-300">
                <p>
                  <span className="text-gray-500">Статус:</span> {statusLabels[details.status] ?? details.status}
                </p>
                <p>
                  <span className="text-gray-500">Адрес:</span> {details.deliveryStreet}, {details.deliveryHouse}
                </p>
                <p>
                  <span className="text-gray-500">Слот:</span> {getSlotLabel(details.slot)}
                </p>
                <p>
                  <span className="text-gray-500">Клиент:</span> {details.user?.name ?? "Гость"} ({details.user?.phone ?? "-"})
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-2">Состав заказа</p>
                <div className="space-y-2">
                  {resolveItems(details).map((item, index) => (
                    <div key={`${details.id}-${index}`} className="flex items-center justify-between rounded-xl border border-gray-800 bg-black/40 px-3 py-2 text-sm">
                      <div>
                        <p className="text-white">{item.name ?? `Позиция ${index + 1}`}</p>
                        <p className="text-gray-500 text-xs">
                          {item.quantity ?? 1} {item.unit ?? "шт"}
                        </p>
                      </div>
                      <div className="text-white font-semibold">{Number(item.unitPrice ?? 0).toLocaleString("ru-RU")} ₽</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

type FilterProps = {
  filters: FilterState
  setFilters: (updater: (prev: FilterState) => FilterState) => void
  couriers: CourierOption[]
}

function FilterRow({ filters, setFilters, couriers }: FilterProps) {
  return (
    <div className="grid gap-4 md:grid-cols-5">
      <div className="md:col-span-2">
        <label className="text-sm text-gray-400">Поиск (номер, клиент, телефон)</label>
        <Input value={filters.search} onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value, page: 1 }))} className="bg-gray-900 border-gray-800" />
      </div>
      <div>
        <label className="text-sm text-gray-400">Статус</label>
        <Select value={filters.status} onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value, page: 1 }))}>
          <SelectTrigger className="bg-gray-900 border-gray-800">
            <SelectValue placeholder="Все" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-gray-800 text-white">
            <SelectItem value="all">Все</SelectItem>
            {Object.keys(statusLabels).map((status) => (
              <SelectItem key={status} value={status} className="text-white">
                {statusLabels[status as OrderStatus] ?? status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm text-gray-400">Курьер</label>
        <Select value={filters.courierId} onValueChange={(value) => setFilters((prev) => ({ ...prev, courierId: value, page: 1 }))}>
          <SelectTrigger className="bg-gray-900 border-gray-800">
            <SelectValue placeholder="Все" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-gray-800 text-white">
            <SelectItem value="all">Все</SelectItem>
            {couriers.map((courier) => (
              <SelectItem key={courier.id} value={courier.id} className="text-white">
                {courier.name ?? courier.phone ?? courier.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-sm text-gray-400">С</label>
          <Input type="date" value={filters.dateFrom} onChange={(event) => setFilters((prev) => ({ ...prev, dateFrom: event.target.value, page: 1 }))} className="bg-gray-900 border-gray-800" />
        </div>
        <div className="flex-1">
          <label className="text-sm text-gray-400">По</label>
          <Input type="date" value={filters.dateTo} onChange={(event) => setFilters((prev) => ({ ...prev, dateTo: event.target.value, page: 1 }))} className="bg-gray-900 border-gray-800" />
        </div>
      </div>
    </div>
  )
}

type PaginationProps = {
  filters: FilterState
  totalPages: number
  setFilters: (updater: (prev: FilterState) => FilterState) => void
}

function PaginationBar({ filters, totalPages, setFilters }: PaginationProps) {
  return (
    <div className="flex items-center justify-between text-sm text-gray-400">
      <span>
        Страница {filters.page} из {totalPages}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="border-gray-800"
          disabled={filters.page === 1}
          onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
        >
          Назад
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-gray-800"
          disabled={filters.page >= totalPages}
          onClick={() => setFilters((prev) => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))}
        >
          Далее
        </Button>
      </div>
    </div>
  )
}

function resolveItems(order: AdminOrder | null) {
  if (!order) return [] as Array<{ name?: string; quantity?: number; unit?: string; unitPrice?: number }>
  // Используем orderItems как основной источник данных
  if (Array.isArray(order.orderItems) && order.orderItems.length > 0) {
    return order.orderItems.map((item) => ({
      name: item.product?.name ?? "Товар",
      quantity: item.quantity,
      unit: item.product?.unit ?? "шт",
      unitPrice: Number(item.unitPrice),
    }))
  }
  // Fallback для старых данных (обратная совместимость)
  if (Array.isArray(order.items)) {
    return order.items.map((item: any) => ({
      name: typeof item?.name === "string" ? item.name : undefined,
      quantity: typeof item?.quantity === "number" ? item.quantity : Number(item?.quantity) || 1,
      unit: typeof item?.unit === "string" ? item.unit : undefined,
      unitPrice: typeof item?.unitPrice === "number" ? item.unitPrice : Number(item?.unitPrice) || 0,
    }))
  }
  return []
}

