import { Prisma, DeliverySlot, OrderStatus, PaymentMethod, type Order } from "@prisma/client"
import { paginationSchema } from "@/lib/validation/common"
import { db } from "@/lib/db"
import { CheckoutPayload, QuickOrderPayload } from "@/lib/validation/order"
import { recordClient } from "@/lib/services/client"
import { sendNewOrderNotification, sendStatusNotification } from "@/lib/services/notification"
import { getSlotLabel } from "@/lib/order-workflow"

function generateOrderNumber(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")}`
}

async function ensureProducts(items: CheckoutPayload["items"]) {
  const ids = items.map((item) => item.productId)
  const products = await db.product.findMany({ where: { id: { in: ids } } })
  const map = new Map(products.map((product) => [product.id, product]))

  return items.map((item) => {
    const product = map.get(item.productId)
    if (!product) {
      throw new Error(`Товар ${item.productId} не найден`)
    }
    return {
      product,
      quantity: item.quantity,
    }
  })
}

async function createHistory(orderId: string, status: OrderStatus, changedBy = "system", comment = "") {
  await db.orderHistory.create({
    data: {
      orderId,
      changedBy,
      oldStatus: status,
      newStatus: status,
      comment,
    },
  })
}

export async function createCheckoutOrder(payload: CheckoutPayload) {
  const products = await ensureProducts(payload.items)

  const client = await recordClient({
    name: payload.customer.name,
    phone: payload.customer.phone,
    email: payload.customer.email,
  })

  const sanitizedItems = products.map((item) => ({
    productId: item.product.id,
    name: item.product.name,
    unit: item.product.unit,
    quantity: item.quantity,
    unitPrice: item.product.price,
  }))

  const orderNumber = generateOrderNumber("ORD")
  const totalAmount = sanitizedItems.reduce(
    (sum, item) => sum + Number(item.unitPrice) * item.quantity,
    0,
  )

  const order = await db.order.create({
    data: {
      orderNumber,
      userId: client.userId,
      items: [], // Пустой массив для обратной совместимости, данные только в orderItems
      totalAmount,
      deliveryStreet: payload.delivery.street,
      deliveryHouse: payload.delivery.house,
      deliveryFlat: payload.delivery.flat,
      deliveryPorch: payload.delivery.porch,
      deliveryFloor: payload.delivery.floor,
      deliveryComment: payload.delivery.comment,
      deliveryDate: new Date(payload.delivery.date),
      slot: payload.delivery.slot as DeliverySlot,
      hourlySlot: payload.delivery.hourlySlot || null,
      paymentMethod: payload.paymentMethod as PaymentMethod,
      status: "NEW",
      notifyBeforeHours: payload.notifyBeforeHours ?? 1,
      ...(payload.dropId && { drop: { connect: { id: payload.dropId } } }),
      history: [
        {
          status: "NEW",
          by: client.id,
          at: new Date().toISOString(),
        },
      ],
      orderItems: {
        create: sanitizedItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      },
    },
    include: {
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
    },
  })

  await createHistory(order.id, "NEW", client.id, "Создан заказ")
  await sendNewOrderNotification(order, {
    email: payload.customer.email,
    phone: payload.customer.phone,
  })

  return order
}

export async function createQuickOrder(payload: QuickOrderPayload) {
  const product = await db.product.findUnique({ where: { id: payload.productId } })
  if (!product) {
    throw new Error("Товар не найден")
  }

  const client = await recordClient({
    name: payload.name,
    phone: payload.phone,
  })

  const sanitizedItem = {
    productId: product.id,
    name: product.name,
    unit: product.unit,
    quantity: payload.quantity,
    unitPrice: product.price,
  }

  const orderNumber = generateOrderNumber("QO")
  const totalAmount = Number(product.price) * payload.quantity

  const order = await db.order.create({
    data: {
      orderNumber,
      userId: client.userId,
      items: [], // Пустой массив для обратной совместимости, данные только в orderItems
      totalAmount,
      deliveryStreet: "",
      deliveryHouse: "",
      deliveryFlat: null,
      deliveryPorch: null,
      deliveryFloor: null,
      deliveryComment: payload.comment,
      deliveryDate: new Date(),
      slot: payload.deliverySlot as DeliverySlot,
      paymentMethod: "CASH",
      status: "NEW",
      history: [
        {
          status: "NEW",
          by: client.id,
          at: new Date().toISOString(),
        },
      ],
      orderItems: {
        create: [
          {
            productId: product.id,
            quantity: payload.quantity,
            unitPrice: product.price,
          },
        ],
      },
    },
    include: {
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
    },
  })

  await createHistory(order.id, "NEW", client.id, "Быстрый заказ")
  await sendNewOrderNotification(order, {
    phone: payload.phone,
  })

  return order
}

export type OrderFilters = {
  status?: OrderStatus | "all"
  courierId?: string
  userId?: string
  startDate?: string
  endDate?: string
  search?: string
  page?: number
  limit?: number
}

export async function listOrders(filters: OrderFilters = {}) {
  const pagination = paginationSchema.parse({ page: filters.page, limit: filters.limit })

  const where: Prisma.OrderWhereInput = {}

  if (filters.status && filters.status !== "all") {
    where.status = filters.status
  }

  if (filters.courierId) {
    where.courierId = filters.courierId
  }

  if (filters.userId) {
    where.userId = filters.userId
  }

  if (filters.search) {
    where.OR = [
      { orderNumber: { contains: filters.search, mode: "insensitive" } },
      {
        user: {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { phone: { contains: filters.search, mode: "insensitive" } },
            { email: { contains: filters.search, mode: "insensitive" } },
          ],
        },
      },
    ]
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {}
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate)
    if (filters.endDate) where.createdAt.lte = new Date(filters.endDate)
  }

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      include: {
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
        user: {
          select: { id: true, name: true, phone: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    }),
    db.order.count({ where }),
  ])

  return {
    items: orders.map(order => ({
      ...order,
      totalAmount: Number(order.totalAmount),
      orderItems: order.orderItems.map(item => ({
        ...item,
        unitPrice: Number(item.unitPrice),
      })),
    })),
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      pages: Math.ceil(total / pagination.limit) || 1,
    },
  }
}

export async function getOrdersByPhone(phone: string) {
  const client = await db.client.findUnique({ where: { phone } })
  if (!client || !client.userId) return []

  return db.order.findMany({
    where: { userId: client.userId },
    include: {
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
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function updateOrderStatus({
  orderId,
  status,
  changedBy,
  note,
  extra,
}: {
  orderId: string
  status: OrderStatus
  changedBy: string
  note?: string
  extra?: Prisma.OrderUpdateInput
}) {
  const existing = await db.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { id: true, email: true, phone: true } },
      courier: { select: { id: true, email: true, phone: true } },
    },
  })
  if (!existing) {
    throw new Error("Заказ не найден")
  }

  const baseHistory = Array.isArray(existing.history) ? (existing.history as Prisma.JsonArray) : []
  const historyEntry = {
    status,
    by: changedBy,
    at: new Date().toISOString(),
    note,
  }

  const order = await db.order.update({
    where: { id: orderId },
    data: {
      ...(extra ?? {}),
      status,
      history: [...baseHistory, historyEntry],
    },
    include: {
      user: { select: { id: true, email: true, phone: true } },
      courier: { select: { id: true, email: true, phone: true } },
    },
  })

  await db.orderHistory.create({
    data: {
      orderId,
      changedBy,
      oldStatus: existing.status,
      newStatus: status,
      comment: note ?? "",
    },
  })

  // Уведомляем клиента
  await sendStatusNotification(order, {
    email: order.user?.email,
    phone: order.user?.phone,
  })

  // Уведомляем курьера при назначении или изменении статуса
  if (order.courier && (status === "PREP" || status === "IN_TRANSIT")) {
    await notifyCourierAboutOrder(order)
  }

  // Уведомляем повара при переходе в PREP
  if (status === "PREP" && existing.status !== "PREP") {
    await notifyStaffAboutOrderStatus(order)
  }

  return order
}

/**
 * Уведомляет курьера о заказе
 */
async function notifyCourierAboutOrder(order: Order & { courier?: { id: string; phone: string | null } | null; slot: DeliverySlot; deliveryDate: Date; orderNumber: string }) {
  try {
    const { broadcastPushNotification } = await import("@/lib/services/push")
    const { sendSMS, sendTelegram } = await import("@/lib/services/notification")

    if (!order.courier) return

    const message = `Заказ №${order.orderNumber} назначен вам. Доставка: ${new Date(order.deliveryDate).toLocaleDateString("ru-RU")}, ${getSlotLabel(order.slot)}`

    await Promise.allSettled([
      broadcastPushNotification(
        {
          title: "Новый заказ",
          body: message,
          url: "/courier",
        },
        { userIds: [order.courier.id] }
      ),
      sendSMS(order.courier.phone, message),
      sendTelegram(`🚴 Курьеру: ${message}`),
    ])
  } catch (error) {
    console.error("notifyCourierAboutOrder: Error", { error })
  }
}

/**
 * Уведомляет повара об изменении статуса заказа
 */
async function notifyStaffAboutOrderStatus(order: Order & { orderNumber: string }) {
  try {
    const { db } = await import("@/lib/db")
    const { UserRole } = await import("@prisma/client")
    const { broadcastPushNotification } = await import("@/lib/services/push")

    const staffUsers = await db.user.findMany({
      where: {
        role: UserRole.STAFF,
        isActive: true,
      },
      select: { id: true },
    })

    if (staffUsers.length === 0) return

    const userIds = staffUsers.map((u) => u.id)
    const message = `Заказ №${order.orderNumber} готов к сборке`

    await broadcastPushNotification(
      {
        title: "Заказ готов к сборке",
        body: message,
        url: "/ops",
      },
      { userIds }
    )
  } catch (error) {
    console.error("notifyStaffAboutOrderStatus: Error", { error })
  }
}



type BulkUpdateInput = {
  orderIds: string[]
  changedBy: string
  status?: OrderStatus
  courierId?: string | null
  note?: string
}

export async function bulkUpdateOrders({ orderIds, changedBy, status, courierId, note }: BulkUpdateInput) {
  if (!orderIds.length) return []

  const orders = await db.order.findMany({ where: { id: { in: orderIds } } })
  if (!orders.length) return []

  const updates = orders.map(async (order) => {
    if (status) {
      return updateOrderStatus({
        orderId: order.id,
        status,
        changedBy,
        note,
        extra: courierId !== undefined && courierId !== null 
          ? { courier: { connect: { id: courierId } } } 
          : courierId === null
          ? { courier: { disconnect: true } }
          : undefined,
      })
    }

    const baseHistory = Array.isArray(order.history) ? (order.history as Prisma.JsonArray) : []
    return db.order.update({
      where: { id: order.id },
      data: {
        ...(courierId !== undefined && courierId !== null 
          ? { courier: { connect: { id: courierId } } }
          : courierId === null
          ? { courier: { disconnect: true } }
          : {}),
        history: [
          ...baseHistory,
          {
            status: order.status,
            by: changedBy,
            at: new Date().toISOString(),
            note,
          },
        ],
      },
    })
  })

  return Promise.all(updates)
}

