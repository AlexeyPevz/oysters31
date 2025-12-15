import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"

const querySchema = z.object({
  phone: z.string().optional(),
  userId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success || (!parsed.data.phone && !parsed.data.userId)) {
    return NextResponse.json({ error: "Нужно передать phone или userId" }, { status: 400 })
  }

  const where: any = {}
  if (parsed.data.phone) where.phone = parsed.data.phone
  if (parsed.data.userId) where.id = parsed.data.userId

  const user = await db.user.findFirst({
    where,
    include: {
      orders: {
        select: {
          id: true,
          orderNumber: true,
          totalAmount: true,
          status: true,
          createdAt: true,
          items: true, // Для обратной совместимости
        },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  // Загружаем orderItems отдельно для каждого заказа
  if (user) {
    const orderIds = user.orders.map((o) => o.id)
    const orderItemsMap = new Map()
    if (orderIds.length > 0) {
      const orderItems = await db.orderItem.findMany({
        where: { orderId: { in: orderIds } },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              unit: true,
            },
          },
        },
      })
      for (const item of orderItems) {
        if (!orderItemsMap.has(item.orderId)) {
          orderItemsMap.set(item.orderId, [])
        }
        orderItemsMap.get(item.orderId).push(item)
      }
    }
    user.orders = user.orders.map((order) => ({
      ...order,
      orderItems: orderItemsMap.get(order.id) || [],
    }))
  }

  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }

  const totalSpent = user.orders.reduce((sum, order) => sum + Number(order.totalAmount), 0)

  return NextResponse.json({
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    ordersCount: user.orders.length,
    totalSpent,
    orders: user.orders,
  })
}
