import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getOrdersByPhone } from "@/lib/services/order"

const querySchema = z.object({
  phone: z.string().min(10, "Укажите телефон"),
})

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
  }

  const orders = await getOrdersByPhone(parsed.data.phone)
  return NextResponse.json({ orders })
}
