import { z } from "zod"

export const bannerSchema = z.object({
  imageUrl: z.string().url({ message: "Введите корректный URL изображения" }),
  title: z.string().min(2, "Заголовок обязателен"),
  subtitle: z.string().nullable().optional(),
  buttonText: z.string().nullable().optional(),
  buttonLink: z.string().url({ message: "Некорректная ссылка" }).nullable().optional(),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
})

export type BannerInput = z.infer<typeof bannerSchema>
