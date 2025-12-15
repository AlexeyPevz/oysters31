import { z } from "zod"

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{10,15}$/u, "Неверный формат телефона")

export const emailSchema = z.string().email("Некорректный email").optional()

export const slugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, "Слаг может содержать только латиницу, цифры и тире")

export const priceSchema = z.coerce.number().positive("Цена должна быть больше нуля")

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20),
  search: z.string().trim().optional(),
})

export type PaginationInput = z.infer<typeof paginationSchema>
