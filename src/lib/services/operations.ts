import { DeliverySlot, Order, OrderStatus, PaymentMethod, Prisma } from "@prisma/client"
import { db } from "@/lib/db"

export type OrderLineItem = {
  id: string
  name: string
  quantity: number
  unit: string
  unitPrice: number
}

export type OperationalOrder = {
  id: string
  orderNumber: string
  status: OrderStatus
  slot: DeliverySlot
  deliveryDate: string
  totalAmount: number
  paymentMethod: PaymentMethod
  deliveryComment?: string | null
  customer: {
    id?: string
    name: string
    phone?: string | null
  }
  courier?: {
    id: string
    name: string | null
    phone?: string | null
  }
  address: {
    street: string
    house: string
    flat?: string | null
    porch?: string | null
    floor?: string | null
  }
  items: OrderLineItem[]
  history: Prisma.JsonValue
  updatedAt: string
}

function normalizeItems(
  order: Order & {
    orderItems?: Array<{
      id: string
      quantity: number
      unitPrice: Prisma.Decimal
      product?: { id: string; name: string; unit: string } | null
    }>
  },
): OrderLineItem[] {
  if (!order.orderItems || !Array.isArray(order.orderItems)) {
    return []
  }
  return order.orderItems.map((item) => ({
    id: item.id,
    name: item.product?.name ?? "Товар",
    quantity: item.quantity,
    unit: item.product?.unit ?? "шт",
    unitPrice: Number(item.unitPrice),
  }))
}

function serializeOrder(
  order: Order & {
    user?: { id: string; name: string; phone: string }
    courier?: { id: string; name: string | null; phone: string }
    orderItems?: Array<{
      id: string
      quantity: number
      unitPrice: Prisma.Decimal
      product?: { id: string; name: string; unit: string } | null
    }>
  },
): OperationalOrder {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    slot: order.slot,
    deliveryDate: order.deliveryDate.toISOString(),
    totalAmount: Number(order.totalAmount),
    paymentMethod: order.paymentMethod,
    deliveryComment: order.deliveryComment,
    customer: {
      id: order.user?.id,
      name: order.user?.name ?? "Клиент",
      phone: order.user?.phone,
    },
    courier: order.courier
      ? {
          id: order.courier.id,
          name: order.courier.name,
          phone: order.courier.phone,
        }
      : undefined,
    address: {
      street: order.deliveryStreet,
      house: order.deliveryHouse,
      flat: order.deliveryFlat,
      porch: order.deliveryPorch,
      floor: order.deliveryFloor,
    },
    items: normalizeItems(order),
    history: order.history,
    updatedAt: order.updatedAt.toISOString(),
  }
}

const baseInclude = {
  user: {
    select: { id: true, name: true, phone: true },
  },
  courier: {
    select: { id: true, name: true, phone: true },
  },
  orderItems: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          unit: true,
        },
      },
    },
  },
}

const courierActiveStatuses: OrderStatus[] = [
  OrderStatus.NEW,
  OrderStatus.CONFIRMED,
  OrderStatus.PREP,
  OrderStatus.IN_TRANSIT,
]

export type CourierDashboardData = {
  courier: {
    id: string
    name: string
    phone: string
  }
  activeOrders: OperationalOrder[]
  deliveredToday: OperationalOrder[]
  stats: {
    active: number
    deliveredToday: number
    readyForPickup: number
  }
  updatedAt: string
}

export async function getCourierDashboardData(userId: string): Promise<CourierDashboardData> {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const [courier, activeOrdersRaw, deliveredRaw] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, name: true, phone: true } }),
    db.order.findMany({
      where: {
        courierId: userId,
        status: { in: courierActiveStatuses },
      },
      include: baseInclude,
      orderBy: [{ status: "asc" }, { deliveryDate: "asc" }],
    }),
    db.order.findMany({
      where: {
        courierId: userId,
        status: OrderStatus.DELIVERED,
        updatedAt: { gte: startOfDay },
      },
      include: baseInclude,
      orderBy: { updatedAt: "desc" },
    }),
  ])

  const activeOrders = activeOrdersRaw.map(serializeOrder)
  const deliveredToday = deliveredRaw.map(serializeOrder)

  const stats = {
    active: activeOrders.length,
    deliveredToday: deliveredToday.length,
    readyForPickup: activeOrders.filter((order) => order.status === OrderStatus.PREP).length,
  }

  return {
    courier,
    activeOrders,
    deliveredToday,
    stats,
    updatedAt: new Date().toISOString(),
  }
}

export type OpsDashboardData = {
  queue: OperationalOrder[]
  prep: OperationalOrder[]
  inTransit: OperationalOrder[]
  summary: {
    queue: number
    prep: number
    inTransit: number
    deliveredToday: number
  }
  slots: Record<DeliverySlot, number>
  updatedAt: string
}

export async function getOpsDashboardData(): Promise<OpsDashboardData> {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const [queueRaw, prepRaw, inTransitRaw, deliveredTodayCount] = await Promise.all([
    db.order.findMany({
      where: { status: { in: [OrderStatus.NEW, OrderStatus.CONFIRMED] } },
      include: baseInclude,
      orderBy: { deliveryDate: "asc" },
    }),
    db.order.findMany({
      where: { status: OrderStatus.PREP },
      include: baseInclude,
      orderBy: { updatedAt: "asc" },
    }),
    db.order.findMany({
      where: { status: OrderStatus.IN_TRANSIT },
      include: baseInclude,
      orderBy: { updatedAt: "desc" },
    }),
    db.order.count({
      where: {
        status: OrderStatus.DELIVERED,
        updatedAt: { gte: startOfDay },
      },
    }),
  ])

  const queue = queueRaw.map(serializeOrder)
  const prep = prepRaw.map(serializeOrder)
  const inTransit = inTransitRaw.map(serializeOrder)

  const summary = {
    queue: queue.length,
    prep: prep.length,
    inTransit: inTransit.length,
    deliveredToday: deliveredTodayCount,
  }

  const slots: Record<DeliverySlot, number> = {
    MORNING: 0,
    DAY: 0,
    EVENING: 0,
  }

  for (const order of [...queue, ...prep]) {
    slots[order.slot] += 1
  }

  return {
    queue,
    prep,
    inTransit,
    summary,
    slots,
    updatedAt: new Date().toISOString(),
  }
}
