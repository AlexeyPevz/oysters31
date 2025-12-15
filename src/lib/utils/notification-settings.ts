import type { NotificationSettings } from "@/lib/validation/notification-config"

export function sanitizeNotificationSettings(input: NotificationSettings): NotificationSettings {
  const next: NotificationSettings = {}

  if (input.sms?.apiKey?.trim()) {
    next.sms = {
      apiKey: input.sms.apiKey.trim(),
      apiUrl: input.sms.apiUrl?.trim() || undefined,
      senderId: input.sms.senderId?.trim() || undefined,
    }
  }

  if (input.email?.smtpUrl?.trim()) {
    next.email = {
      smtpUrl: input.email.smtpUrl.trim(),
      from: input.email.from?.trim() || "notifications@oysters.local",
    }
  }

  if (input.telegram?.botToken?.trim() && input.telegram.chatId?.trim()) {
    next.telegram = {
      botToken: input.telegram.botToken.trim(),
      chatId: input.telegram.chatId.trim(),
    }
  }

  if (input.push?.publicKey?.trim() && input.push.privateKey?.trim()) {
    next.push = {
      publicKey: input.push.publicKey.trim(),
      privateKey: input.push.privateKey.trim(),
    }
  }

  if (input.test) {
    const smsPhone = input.test.smsPhone?.trim()
    const email = input.test.email?.trim()
    const telegramChatId = input.test.telegramChatId?.trim()
    if (smsPhone || email || telegramChatId) {
      next.test = {
        smsPhone: smsPhone || undefined,
        email: email || undefined,
        telegramChatId: telegramChatId || undefined,
      }
    }
  }

  return next
}
