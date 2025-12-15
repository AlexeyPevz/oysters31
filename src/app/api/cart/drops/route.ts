import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getAvailableDropsForProducts } from "@/lib/services/cart"

const productIdsSchema = z.object({
  productIds: z.array(z.string()).min(1),
})

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = productIdsSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const drops = await getAvailableDropsForProducts(parsed.data.productIds)
    return NextResponse.json(drops)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ошибка загрузки дропов" },
      { status: 500 }
    )
  }
}


