import { NextRequest, NextResponse } from "next/server"
import { OrderStatus, UserRole } from "@prisma/client"
import { z } from "zod"
import { requireSession } from "@/lib/auth/session"
import { bulkUpdateOrders } from "@/lib/services/order"

const bodySchema = z
  .object({
    orderIds: z.array(z.string().min(8)).min(1),
    status: z.nativeEnum(OrderStatus).optional(),
    courierId: z.string().nullable().optional(),
    note: z.string().max(280).optional(),
  })
  .refine((data) => data.status || data.courierId !== undefined, {
    message: "Нужно выбрать статус или курьера",
    path: ["status"],
  })

export async function PATCH(request: NextRequest) {
  const session = await requireSession(UserRole.ADMIN)
  const json = await request.json()
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
  }

  const updated = await bulkUpdateOrders({
    orderIds: parsed.data.orderIds,
    changedBy: session.userId,
    status: parsed.data.status,
    courierId: parsed.data.courierId === undefined ? undefined : parsed.data.courierId,
    note: parsed.data.note,
  })

  return NextResponse.json({ count: updated.length })
}
