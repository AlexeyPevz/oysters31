import { z } from "zod"

export const notificationSettingsSchema = z.object({
  sms: z
    .object({
      apiKey: z.string().min(8, "API ключ обязателен"),
      apiUrl: z.string().url().optional(),
      senderId: z.string().optional(),
    })
    .optional(),
  email: z
    .object({
      smtpUrl: z.string().min(5, "SMTP URL обязателен"),
      from: z.string().email("Укажите корректный email"),
    })
    .optional(),
  telegram: z
    .object({
      botToken: z.string().min(10, "Токен обязателен"),
      chatId: z.string().min(1, "Chat ID обязателен"),
    })
    .optional(),
  push: z
    .object({
      publicKey: z.string().min(10, "Публичный ключ обязателен"),
      privateKey: z.string().min(10, "Приватный ключ обязателен"),
    })
    .optional(),
  test: z
    .object({
      smsPhone: z.string().min(6).optional(),
      email: z.string().email().optional(),
      telegramChatId: z.string().min(2).optional(),
    })
    .optional(),

})

export type NotificationSettings = z.infer<typeof notificationSettingsSchema>

