import { Prisma, ProductCategory, ProductStatus } from "@prisma/client"
import { db } from "@/lib/db"
import { paginationSchema } from "@/lib/validation/common"

type JsonValueInput = Prisma.InputJsonValue | Record<string, unknown> | null

const jsonValue = (value?: JsonValueInput) => {
  if (value === null) return Prisma.JsonNull
  if (value === undefined) return undefined
  return value as Prisma.InputJsonValue
}

export type ProductFilters = {
  category?: ProductCategory | "all"
  status?: ProductStatus | "all"
  promoted?: boolean
  search?: string
  minPrice?: number
  maxPrice?: number
  page?: number
  limit?: number
  sortBy?: "price" | "createdAt" | "displayOrder"
  sortOrder?: "asc" | "desc"
}

export async function listPublicProducts(filters: ProductFilters = {}) {
  const pagination = paginationSchema.parse({ page: filters.page, limit: filters.limit })

  const where: Prisma.ProductWhereInput = {}

  if (filters.category && filters.category !== "all") {
    where.category = filters.category
  }

  if (filters.status && filters.status !== "all") {
    where.status = filters.status
  } else {
    where.status = { in: ["AVAILABLE", "PREORDER", "SOON"] }
  }

  if (typeof filters.promoted === "boolean") {
    where.isPromoted = filters.promoted
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { shortDescription: { contains: filters.search } },
    ]
  }

  if (filters.minPrice || filters.maxPrice) {
    where.price = {}
    if (filters.minPrice) where.price.gte = filters.minPrice
    if (filters.maxPrice) where.price.lte = filters.maxPrice
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput = {
    [filters.sortBy ?? "displayOrder"]: filters.sortOrder ?? "asc",
  }

  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy,
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      include: {
        variants: {
          where: { isAvailable: true },
          orderBy: { displayOrder: "asc" },
        },
      },
    }),
    db.product.count({ where }),
  ])

  return {
    items,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      pages: Math.ceil(total / pagination.limit) || 1,
    },
  }
}

export async function getProductBySlug(slug: string) {
  return db.product.findUnique({
    where: { slug },
    include: {
      variants: {
        where: { isAvailable: true },
        orderBy: { displayOrder: "asc" },
      },
    },
  })
}

export async function adminListProducts(filters: ProductFilters = {}) {
  return listPublicProducts(filters)
}

export type ProductPayload = {
  name: string
  slug: string
  category: ProductCategory
  price: number
  unit: string
  shortDescription?: string | null
  fullDescription?: string | null
  status?: ProductStatus
  displayOrder?: number
  nutritionInfo?: JsonValueInput
  pairing?: JsonValueInput
  isPromoted?: boolean
  imageUrls?: string[]
}

export async function createProduct(payload: ProductPayload) {
  return db.product.create({
    data: {
      name: payload.name,
      slug: payload.slug,
      category: payload.category,
      price: payload.price,
      unit: payload.unit,
      shortDescription: payload.shortDescription,
      fullDescription: payload.fullDescription,
      status: payload.status ?? "AVAILABLE",
      displayOrder: payload.displayOrder ?? 0,
      nutritionInfo: jsonValue(payload.nutritionInfo ?? undefined),
      pairing: jsonValue(payload.pairing ?? undefined),
      isPromoted: payload.isPromoted ?? false,
      imageUrls: payload.imageUrls ?? [],
    },
  })
}

export async function updateProduct(id: string, payload: Partial<ProductPayload>) {
  const { nutritionInfo, pairing, imageUrls, ...rest } = payload
  return db.product.update({
    where: { id },
    data: {
      ...rest,
      nutritionInfo: nutritionInfo !== undefined ? jsonValue(nutritionInfo) : undefined,
      pairing: pairing !== undefined ? jsonValue(pairing) : undefined,
      imageUrls: imageUrls ?? undefined,
    },
  })
}

export async function deleteProduct(id: string) {
  return db.product.delete({ where: { id } })
}
