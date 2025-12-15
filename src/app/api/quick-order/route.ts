import { NextRequest, NextResponse } from "next/server"
import { quickOrderSchema } from "@/lib/validation/order"
import { createQuickOrder } from "@/lib/services/order"

export async function POST(request: NextRequest) {
  const json = await request.json()
  const parsed = quickOrderSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const order = await createQuickOrder(parsed.data)
    return NextResponse.json(order, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
