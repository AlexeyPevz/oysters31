import { z } from "zod"

export const supplyItemSchema = z.object({
    productId: z.string().min(1, "Выберите товар"),
    quantity: z.number().int().min(1, "Количество должно быть больше 0"),
})

export const createSupplySchema = z.object({
    name: z.string().min(1, "Введите название поставки"),
    description: z.string().optional(),
    supplyDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: "Некорректная дата",
    }),
    isActive: z.boolean().default(true),
    bannerImage: z.string().url("Введите корректный URL изображения").optional().or(z.literal("")),
    items: z.array(supplyItemSchema).min(1, "Добавьте хотя бы один товар"),
})

export const updateSupplySchema = createSupplySchema.partial()

export const addToWaitlistSchema = z.object({
    productId: z.string().min(1, "Выберите товар"),
    quantity: z.number().int().min(1, "Количество должно быть больше 0"),
    deliveryDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: "Некорректная дата доставки",
    }),
    deliveryTimeSlot: z.string().regex(/^\d{2}:\d{2}-\d{2}:\d{2}$/, "Некорректный формат таймслота (обр. 09:00-10:00)"),
    clientName: z.string().min(1, "Введите имя"),
    phone: z.string().min(10, "Введите корректный номер телефона"),
    email: z.string().email("Введите корректный email").optional().or(z.literal("")),
    deliveryAddress: z.string().min(5, "Введите адрес доставки"),
})
