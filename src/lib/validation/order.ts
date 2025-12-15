import { z } from "zod"
import { emailSchema, phoneSchema } from "@/lib/validation/common"

export const deliverySlotValues = ["MORNING", "DAY", "EVENING"] as const
export const paymentMethodValues = ["CASH", "ONLINE"] as const

export const orderItemSchema = z.object({
  productId: z.string().min(1, "Нужен ID товара"),
  name: z.string().optional(),
  unit: z.string().optional(),
  price: z.coerce.number().positive(),
  quantity: z.coerce.number().int().min(1),
})

export const checkoutSchema = z.object({
  items: z.array(orderItemSchema).min(1, "Добавьте хотя бы один товар"),
  customer: z.object({
    name: z.string().min(2, "Имя слишком короткое"),
    phone: phoneSchema,
    email: emailSchema,
  }),
  delivery: z.object({
    street: z.string().min(1),
    house: z.string().min(1),
    flat: z.string().optional(),
    porch: z.string().optional(),
    floor: z.string().optional(),
    comment: z.string().max(500).optional(),
    date: z.string().min(1),
    slot: z.enum(deliverySlotValues),
    hourlySlot: z.string().regex(/^\d{2}:\d{2}-\d{2}:\d{2}$/).optional(), // Формат: "09:00-10:00"
  }),
  paymentMethod: z.enum(paymentMethodValues),
  promoCode: z.string().trim().optional(),
  consent: z.boolean().refine(Boolean, "Необходимо согласие"),
  dropId: z.string().optional(), // ID дропа для предзаказов
  notifyBeforeHours: z.coerce.number().int().min(1).max(168).default(1), // За сколько часов уведомить (1-168)
})

export const quickOrderSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).default(1),
  name: z.string().min(2, "Имя слишком короткое"),
  phone: phoneSchema,
  deliverySlot: z.enum(deliverySlotValues).default("DAY"),
  comment: z.string().max(500).optional(),
})

export type CheckoutPayload = z.infer<typeof checkoutSchema>
export type QuickOrderPayload = z.infer<typeof quickOrderSchema>
