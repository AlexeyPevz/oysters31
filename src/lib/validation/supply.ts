import { z } from "zod"

export const supplyItemSchema = z.object({
    productId: z.string().cuid(),
    variantId: z.string().cuid().optional(),
    quantity: z.number().int().positive(),
})

export const createSupplySchema = z.object({
    name: z.string().min(1, "Название обязательно"),
    description: z.string().optional(),
    supplyDate: z.string().datetime(),
    isActive: z.boolean().default(true),
    bannerImage: z.string().url().optional(),
    items: z.array(supplyItemSchema).min(1, "Добавьте хотя бы один товар"),
})

export const updateSupplySchema = createSupplySchema.partial()

export const waitlistItemSchema = z.object({
    productId: z.string().cuid(),
    variantId: z.string().cuid().optional(),
    quantity: z.number().int().positive(),
})

export const addToWaitlistSchema = z.object({
    deliveryAddress: z.string().min(5, "Введите адрес доставки"),
})
