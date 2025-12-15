import { NextRequest, NextResponse } from "next/server"
import { OrderStatus, UserRole } from "@prisma/client"
import { z } from "zod"
import { requireSession } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { getOpsActions } from "@/lib/order-workflow"
import { updateOrderStatus } from "@/lib/services/order"

const allowedRoles = [UserRole.ADMIN, UserRole.STAFF]

const bodySchema = z.object({
  status: z.nativeEnum(OrderStatus),
  note: z.string().max(280).optional(),
})

type RouteParams = {
  params: { orderId: string }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await requireSession(allowedRoles)
  const payload = await request.json()
  const parsed = bodySchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
  }

  const order = await db.order.findUnique({ where: { id: params.orderId } })
  if (!order) {
    return NextResponse.json({ error: "Заказ не найден" }, { status: 404 })
  }

  const allowedStatuses = getOpsActions(order.status).map((action) => action.status)
  if (!allowedStatuses.includes(parsed.data.status)) {
    return NextResponse.json({ error: "Недопустимый переход статуса" }, { status: 400 })
  }

  const updated = await updateOrderStatus({
    orderId: order.id,
    status: parsed.data.status,
    changedBy: session.userId,
    note: parsed.data.note,
  })

  return NextResponse.json({ order: updated })
}
