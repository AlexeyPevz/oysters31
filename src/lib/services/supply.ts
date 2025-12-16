import { db } from "@/lib/db"
import { z } from "zod"
import { createSupplySchema, addToWaitlistSchema } from "@/lib/validation/supply"

export type CreateSupplyInput = z.infer<typeof createSupplySchema>
export type AddToWaitlistInput = z.infer<typeof addToWaitlistSchema>

export async function createSupply(input: CreateSupplyInput) {
    return await db.$transaction(async (tx) => {
        const supply = await tx.supply.create({
            data: {
                name: input.name,
                description: input.description,
                supplyDate: new Date(input.supplyDate),
                isActive: input.isActive,
                bannerImage: input.bannerImage || null,
                items: {
                    create: input.items.map((item) => ({
                        productId: item.productId,
                        variantId: item.variantId || null,
                        quantity: item.quantity,
                    })),
                },
            },
            include: {
                items: true,
            },
        })
        return supply
    })
}

export async function getSupplies(isAdmin = false) {
    return await db.supply.findMany({
        where: isAdmin ? {} : { isActive: true },
        include: {
            items: {
                include: {
                    product: true,
                    variant: true,
                },
            },
            _count: {
                select: { waitlist: true },
            },
        },
        orderBy: {
            supplyDate: "asc",
        },
    })
}

export async function getSupplyById(id: string) {
    return await db.supply.findUnique({
        where: { id },
        include: {
            items: {
                include: {
                    product: true,
                },
            },
            waitlist: {
                include: {
                    product: true,
                },
                orderBy: {
                    createdAt: "desc",
                },
            },
        },
    })
}

export async function updateSupply(id: string, data: Partial<CreateSupplyInput>) {
    return await db.$transaction(async (tx) => {
        // Если обновляются товары, это сложнее, пока сделаем обновление основных полей
        const { items, ...mainData } = data

        // Обновляем основные поля
        await tx.supply.update({
            where: { id },
            data: {
                ...mainData,
                supplyDate: mainData.supplyDate ? new Date(mainData.supplyDate) : undefined,
            },
        })

        // Если переданы items, нужно синхронизировать
        if (items) {
            // Удаляем старые, которых нет в новом списке (или можно умнее, но пока так для простоты)
            // В реальном проекте лучше upsert
            await tx.supplyItem.deleteMany({
                where: { supplyId: id },
            })

            await tx.supply.update({
                where: { id },
                data: {
                    items: {
                        create: items.map((item) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                        })),
                    },
                },
            })
        }

        return await tx.supply.findUnique({ where: { id }, include: { items: true } })
    })
}

export async function deleteSupply(id: string) {
    return await db.supply.delete({
        where: { id },
    })
}

export async function getActiveSupply() {
    const now = new Date()
    // Ищем ближайшую активную поставку, дата которой >= сейчас (или недавно прошедшая, если еще актуальна)
    // Для простоты возьмем первую активную, у которой supplyDate в будущем или сегодня
    // Или можно брать просто "ближайшую"
    return await db.supply.findFirst({
        where: {
            isActive: true, // Ищем только активные
            // supplyDate: { gte: new Date(now.setHours(0,0,0,0)) } // Можно раскомментировать, чтобы скрыть совсем старые
        },
        orderBy: {
            supplyDate: "desc", // Берем самую свежую из активных (или asc если ближайшую?)
            // Логичнее показывать ближайшую будущую или последнюю созданную
        },
        include: {
            items: {
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            price: true,
                            imageUrls: true,
                            unit: true,
                            hasVariants: true,
                            variants: {
                                where: { isAvailable: true },
                                orderBy: { displayOrder: "asc" },
                            },
                        },
                    },
                    variant: true,
                },
            },
        },
        take: 1, // Берем только одну
    })
}

export async function addToWaitlist(supplyId: string, input: AddToWaitlistInput) {
    return await db.$transaction(async (tx) => {
        // Validate all items exist in supply and have enough quantity
        for (const item of input.items) {
            // Find supply item - match by productId and optionally variantId
            const supplyItem = await tx.supplyItem.findFirst({
                where: {
                    supplyId,
                    productId: item.productId,
                    variantId: item.variantId || null,
                },
            })

            if (!supplyItem) {
                const variantInfo = item.variantId ? " (выбранный вариант)" : ""
                throw new Error(`Товар${variantInfo} не найден в этой поставке`)
            }

            // Check available quantity
            const available = supplyItem.quantity - supplyItem.reservedCount
            if (available < item.quantity) {
                throw new Error(`Недостаточно товара. Доступно: ${available}`)
            }
        }

        // Create waitlist entries for all items
        const waitlistEntries = await Promise.all(
            input.items.map((item) =>
                tx.supplyWaitlist.create({
                    data: {
                        supplyId,
                        productId: item.productId,
                        variantId: item.variantId || null,
                        quantity: item.quantity,
                        customerName: input.customerName,
                        customerPhone: input.customerPhone,
                        deliveryAddress: input.deliveryAddress || null,
                        status: "PENDING",
                    },
                })
            )
        )

        // Update reserved counts
        for (const item of input.items) {
            await tx.supplyItem.updateMany({
                where: {
                    supplyId,
                    productId: item.productId,
                    variantId: item.variantId || null,
                },
                data: {
                    reservedCount: {
                        increment: item.quantity,
                    },
                },
            })
        }

        return waitlistEntries
    })
}
```
