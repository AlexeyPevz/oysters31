import { z } from "zod"

export const promoSchema = z.object({
  code: z.string().min(3, "Код должен быть не короче 3 символов").toUpperCase(),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  value: z.number().positive("Укажите значение скидки"),
  expiresAt: z.coerce.date({ message: "Укажите дату окончания" }),
  maxUses: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().default(true),
})

export type PromoInput = z.infer<typeof promoSchema>
