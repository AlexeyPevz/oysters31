import type { DeliverySlot, OrderStatus } from "@prisma/client"

export const statusLabels: Record<OrderStatus, string> = {
  NEW: "Новый",
  CONFIRMED: "Подтверждён",
  PREP: "Готовится",
  IN_TRANSIT: "В пути",
  DELIVERED: "Доставлен",
  CANCELLED: "Отменён",
}

export const statusBadgeStyles: Record<OrderStatus, { bg: string; text: string; border: string }> = {
  NEW: { bg: "bg-sky-500/10", text: "text-sky-200", border: "border-sky-500/30" },
  CONFIRMED: { bg: "bg-indigo-500/10", text: "text-indigo-200", border: "border-indigo-500/30" },
  PREP: { bg: "bg-amber-500/10", text: "text-amber-200", border: "border-amber-500/30" },
  IN_TRANSIT: { bg: "bg-lime-500/10", text: "text-lime-200", border: "border-lime-500/30" },
  DELIVERED: { bg: "bg-emerald-500/10", text: "text-emerald-200", border: "border-emerald-500/30" },
  CANCELLED: { bg: "bg-rose-500/10", text: "text-rose-200", border: "border-rose-500/30" },
}

export const slotLabels: Record<DeliverySlot, string> = {
  MORNING: "Утро · 08:00–12:00",
  DAY: "День · 12:00–17:00",
  EVENING: "Вечер · 17:00–22:00",
}

export type StatusAction = {
  status: OrderStatus
  label: string
  tone: "primary" | "success" | "danger"
  hint?: string
}

const courierMatrix: Partial<Record<OrderStatus, StatusAction[]>> = {
  NEW: [
    { status: "CONFIRMED" as OrderStatus, label: "Принял заказ", tone: "primary" },
    { status: "PREP" as OrderStatus, label: "Начал сборку", tone: "primary" },
  ],
  CONFIRMED: [{ status: "IN_TRANSIT" as OrderStatus, label: "Забрал и еду", tone: "primary", hint: "Переводит заказ в доставку" }],
  PREP: [{ status: "IN_TRANSIT" as OrderStatus, label: "Передан, в пути", tone: "primary" }],
  IN_TRANSIT: [
    { status: "DELIVERED" as OrderStatus, label: "Доставлено", tone: "success" },
    { status: "CANCELLED" as OrderStatus, label: "Отмена", tone: "danger", hint: "Свяжитесь с диспетчером" },
  ],
}

const opsMatrix: Partial<Record<OrderStatus, StatusAction[]>> = {
  NEW: [
    { status: "CONFIRMED" as OrderStatus, label: "Подтвердить", tone: "primary" },
    { status: "PREP" as OrderStatus, label: "В работу", tone: "primary" },
  ],
  CONFIRMED: [
    { status: "PREP" as OrderStatus, label: "Собираем", tone: "primary" },
    { status: "CANCELLED" as OrderStatus, label: "Отменить", tone: "danger" },
  ],
  PREP: [
    { status: "IN_TRANSIT" as OrderStatus, label: "Передано курьеру", tone: "success" },
    { status: "CANCELLED" as OrderStatus, label: "Отменить", tone: "danger" },
  ],
}

export function getCourierActions(status: OrderStatus) {
  return courierMatrix[status] ?? []
}

export function getOpsActions(status: OrderStatus) {
  return opsMatrix[status] ?? []
}

export function getSlotLabel(slot: DeliverySlot) {
  return slotLabels[slot] ?? slot
}

