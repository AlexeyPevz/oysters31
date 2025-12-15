import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ProductCategory, ProductStatus, UserRole } from "@prisma/client"
import { requireSession } from "@/lib/auth/session"
import { adminListProducts, createProduct, ProductPayload } from "@/lib/services/product"
import { slugSchema, priceSchema } from "@/lib/validation/common"

const querySchema = z.object({
  category: z.nativeEnum(ProductCategory).or(z.literal("all")).optional(),
  status: z.nativeEnum(ProductStatus).or(z.literal("all")).optional(),
  search: z.string().optional(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
})

const payloadSchema = z.object({
  name: z.string().min(2),
  slug: slugSchema,
  category: z.nativeEnum(ProductCategory),
  price: priceSchema,
  unit: z.string().min(1),
  shortDescription: z.string().optional().nullable(),
  fullDescription: z.string().optional().nullable(),
  status: z.nativeEnum(ProductStatus).optional(),
  displayOrder: z.number().int().optional(),
  nutritionInfo: z.record(z.string(), z.any()).optional().nullable(),
  pairing: z.record(z.string(), z.any()).optional().nullable(),
  isPromoted: z.boolean().optional(),
  imageUrls: z.array(z.string().url()).max(5).optional(),
})

export async function GET(request: NextRequest) {
  await requireSession(UserRole.ADMIN)

  const { searchParams } = new URL(request.url)
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams))

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
  }

  const result = await adminListProducts(parsed.data)
  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  console.log("[API] POST /api/admin/products started")
  try {
    await requireSession(UserRole.ADMIN)
    const json = await request.json()
    console.log("[API] Payload:", JSON.stringify(json, null, 2))
    
    const parsed = payloadSchema.safeParse(json)

    if (!parsed.success) {
      console.error("[API] Validation error:", JSON.stringify(parsed.error.flatten(), null, 2))
      return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
    }

    const payload: ProductPayload = {
    ...parsed.data,
    nutritionInfo: parsed.data.nutritionInfo ?? undefined,
    pairing: parsed.data.pairing ?? undefined,
  }
    const product = await createProduct(payload)
    console.log("[API] Product created:", product.id)
    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error("[API] Error creating product:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
