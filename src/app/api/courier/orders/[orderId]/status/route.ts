import { NextRequest, NextResponse } from "next/server"
import { OrderStatus, Prisma, UserRole } from "@prisma/client"
import { z } from "zod"
import { requireSession } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { getCourierActions } from "@/lib/order-workflow"
import { updateOrderStatus } from "@/lib/services/order"

const bodySchema = z.object({
  status: z.nativeEnum(OrderStatus),
  note: z.string().max(280).optional(),
})

type RouteParams = {
  params: { orderId: string }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await requireSession(UserRole.COURIER)
  const payload = await request.json()
  const parsed = bodySchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
  }

  const order = await db.order.findUnique({ where: { id: params.orderId } })
  if (!order) {
    return NextResponse.json({ error: "Заказ не найден" }, { status: 404 })
  }

  if (order.courierId && order.courierId !== session.userId) {
    return NextResponse.json({ error: "Нет доступа к заказу" }, { status: 403 })
  }

  const allowedStatuses = getCourierActions(order.status).map((action) => action.status)
  if (!allowedStatuses.includes(parsed.data.status)) {
    return NextResponse.json({ error: "Недопустимый переход статуса" }, { status: 400 })
  }

  const extra: Prisma.OrderUpdateInput | undefined = !order.courierId ? { courier: { connect: { id: session.userId } } } : undefined

  const updated = await updateOrderStatus({
    orderId: order.id,
    status: parsed.data.status,
    changedBy: session.userId,
    note: parsed.data.note,
    extra,
  })

  return NextResponse.json({ order: updated })
}
