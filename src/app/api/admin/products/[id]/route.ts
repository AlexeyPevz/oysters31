import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ProductCategory, ProductStatus, UserRole } from "@prisma/client"
import { requireSession } from "@/lib/auth/session"
import { deleteProduct, updateProduct, ProductPayload } from "@/lib/services/product"
import { slugSchema, priceSchema } from "@/lib/validation/common"
import { db } from "@/lib/db"

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  slug: slugSchema.optional(),
  category: z.nativeEnum(ProductCategory).optional(),
  price: priceSchema.optional(),
  unit: z.string().min(1).optional(),
  shortDescription: z.string().nullable().optional(),
  fullDescription: z.string().nullable().optional(),
  status: z.nativeEnum(ProductStatus).optional(),
  displayOrder: z.number().int().optional(),
  nutritionInfo: z.record(z.string(), z.any()).nullable().optional(),
  pairing: z.record(z.string(), z.any()).nullable().optional(),
  isPromoted: z.boolean().optional(),
  imageUrls: z.array(z.string().url()).max(5).optional(),
})

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  await requireSession(UserRole.ADMIN)
  const product = await db.product.findUnique({ where: { id: params.id } })
  if (!product) {
    return NextResponse.json({ error: "Товар не найден" }, { status: 404 })
  }
  return NextResponse.json(product)
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  await requireSession(UserRole.ADMIN)
  const json = await request.json()
  const parsed = updateSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
  }

  const payload: Partial<ProductPayload> = {
    ...parsed.data,
    nutritionInfo: parsed.data.nutritionInfo ?? undefined,
    pairing: parsed.data.pairing ?? undefined,
  }
  const product = await updateProduct(params.id, payload)
  return NextResponse.json(product)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await requireSession(UserRole.ADMIN)
  await deleteProduct(params.id)
  return NextResponse.json({ success: true })
}
