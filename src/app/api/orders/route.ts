import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { OrderStatus, UserRole } from "@prisma/client"
import { requireSession } from "@/lib/auth/session"
import { createCheckoutOrder, listOrders } from "@/lib/services/order"
import { checkoutSchema } from "@/lib/validation/order"
import { rateLimit, rateLimitConfigs } from "@/lib/middleware/rate-limit"

const adminQuerySchema = z.object({
  status: z.nativeEnum(OrderStatus).or(z.literal("all")).optional(),
  courierId: z.string().optional(),
  userId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
})

export async function GET(request: NextRequest) {
  await requireSession(UserRole.ADMIN)
  const { searchParams } = new URL(request.url)
  const parsed = adminQuerySchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
  }

  const result = await listOrders(parsed.data)
  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  // Rate limiting для создания заказов
  const limitResult = await rateLimit(request, rateLimitConfigs.strict)
  if (!limitResult.allowed) {
    return NextResponse.json(
      { error: "Слишком много запросов. Попробуйте позже." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(rateLimitConfigs.strict.maxRequests),
          "X-RateLimit-Remaining": String(limitResult.remaining),
          "X-RateLimit-Reset": new Date(limitResult.resetAt).toISOString(),
        },
      }
    )
  }

  const json = await request.json()
  const parsed = checkoutSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const order = await createCheckoutOrder(parsed.data)
    return NextResponse.json(order, {
      status: 201,
      headers: {
        "X-RateLimit-Limit": String(rateLimitConfigs.strict.maxRequests),
        "X-RateLimit-Remaining": String(limitResult.remaining),
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
