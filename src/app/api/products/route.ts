import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ProductCategory, ProductStatus } from "@prisma/client"
import { listPublicProducts } from "@/lib/services/product"

const querySchema = z.object({
  category: z.nativeEnum(ProductCategory).or(z.literal("all")).optional(),
  status: z.nativeEnum(ProductStatus).or(z.literal("all")).optional(),
  promoted: z.union([z.literal("true"), z.literal("false")]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  sortBy: z.enum(["price", "createdAt", "displayOrder"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
})

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams))

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
  }

  const { promoted, ...filters } = parsed.data
  const result = await listPublicProducts({
    ...filters,
    promoted: promoted ? promoted === "true" : undefined,
  })

  return NextResponse.json(result)
}

export async function POST() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}
