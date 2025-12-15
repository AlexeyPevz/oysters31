import { db } from "@/lib/db"
import { ProductStatus } from "@prisma/client"

/**
 * Проверяет, есть ли в корзине товары со статусом PREORDER
 */
export async function hasPreorderItems(productIds: string[]): Promise<boolean> {
  if (productIds.length === 0) return false

  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    select: { status: true },
  })

  return products.some((p) => p.status === ProductStatus.PREORDER)
}

/**
 * Получает доступные дропы для товаров в корзине
 */
export async function getAvailableDropsForProducts(productIds: string[]) {
  if (productIds.length === 0) return []

  const drops = await db.productDrop.findMany({
    where: {
      productId: { in: productIds },
      isActive: true,
      dropDate: { gte: new Date() },
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    },
    orderBy: { dropDate: "asc" },
  })

  return drops
}


