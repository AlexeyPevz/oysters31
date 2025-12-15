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
                        },
                    },
                },
            },
        },
        take: 1, // Берем только одну
    })
}

export async function addToWaitlist(supplyId: string, input: AddToWaitlistInput) {
    return await db.$transaction(async (tx) => {
        // 1. Проверяем наличие товара в поставке
        const supplyItem = await tx.supplyItem.findUnique({
            where: {
                supplyId_productId: {
                    supplyId,
                    productId: input.productId,
                },
            },
        })

        if (!supplyItem) {
            throw new Error("Товар не найден в этой поставке")
        }

        // 2. Проверяем доступное количество
        const available = supplyItem.quantity - supplyItem.reservedQty
        if (available < input.quantity) {
            throw new Error(`Недостаточно товара. Доступно: ${available}`)
        }

        // 3. Создаем запись в waitlist
        const waitlistEntry = await tx.supplyWaitlist.create({
            data: {
                supplyId,
                productId: input.productId,
                quantity: input.quantity,
                clientName: input.clientName,
                phone: input.phone,
                email: input.email || null,
                deliveryAddress: input.deliveryAddress,
                deliveryDate: new Date(input.deliveryDate),
                deliveryTimeSlot: input.deliveryTimeSlot,
            },
        })

        // 4. Обновляем резерв
        await tx.supplyItem.update({
            where: {
                supplyId_productId: {
                    supplyId,
                    productId: input.productId,
                },
            },
            data: {
                reservedQty: {
                    increment: input.quantity,
                },
            },
        })

        return waitlistEntry
    })
}
