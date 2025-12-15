import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { UserRole } from "@prisma/client"
import { requireSession } from "@/lib/auth/session"
import { createDrop, listDrops } from "@/lib/services/drop"

const createDropSchema = z.object({
  productId: z.string().min(1),
  dropDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  quantity: z.number().int().positive().optional(),
})

export async function GET(request: NextRequest) {
  await requireSession(UserRole.ADMIN)
  const { searchParams } = new URL(request.url)
  const productId = searchParams.get("productId")
  const isActive = searchParams.get("isActive")

  const drops = await listDrops({
    productId: productId || undefined,
    isActive: isActive === null ? undefined : isActive === "true",
  })

  return NextResponse.json(drops)
}

export async function POST(request: NextRequest) {
  await requireSession(UserRole.ADMIN)
  const body = await request.json()
  const parsed = createDropSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const drop = await createDrop({
      productId: parsed.data.productId,
      dropDate: parsed.data.dropDate,
      quantity: parsed.data.quantity,
    })
    return NextResponse.json(drop, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ошибка создания дропа" },
      { status: 400 }
    )
  }
}


