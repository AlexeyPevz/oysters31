import { serverEnv } from "@/lib/env"
import { getSettings, updateSettings } from "@/lib/services/settings"
import { sanitizeNotificationSettings } from "@/lib/utils/notification-settings"
import type { NotificationSettings } from "@/lib/validation/notification-config"

const SETTINGS_KEY = "notifications"
let cachedConfig: NotificationSettings | null = null
let cachedAt = 0
const CACHE_TTL = 1000 * 30

function envFallback(): NotificationSettings {
  const sms = serverEnv.SMS_API_KEY
    ? {
        apiKey: serverEnv.SMS_API_KEY,
        apiUrl: serverEnv.SMS_API_URL,
        senderId: serverEnv.SMS_SENDER_ID,
      }
    : undefined

  const email = serverEnv.EMAIL_SMTP_URL
    ? {
        smtpUrl: serverEnv.EMAIL_SMTP_URL,
        from: serverEnv.EMAIL_FROM ?? "notifications@oysters.local",
      }
    : undefined

  const telegram = serverEnv.TELEGRAM_BOT_TOKEN && serverEnv.TELEGRAM_ALERT_CHAT_ID
    ? {
        botToken: serverEnv.TELEGRAM_BOT_TOKEN,
        chatId: serverEnv.TELEGRAM_ALERT_CHAT_ID,
      }
    : undefined

  const push = serverEnv.WEB_PUSH_PUBLIC_KEY && serverEnv.WEB_PUSH_PRIVATE_KEY
    ? {
        publicKey: serverEnv.WEB_PUSH_PUBLIC_KEY,
        privateKey: serverEnv.WEB_PUSH_PRIVATE_KEY,
      }
    : undefined

  const testPhone = serverEnv.NOTIFY_TEST_SMS_PHONE?.trim()
  const testEmail = serverEnv.NOTIFY_TEST_EMAIL?.trim()
  const testTelegram = serverEnv.NOTIFY_TEST_TELEGRAM_CHAT?.trim()
  const test = testPhone || testEmail || testTelegram ? { smsPhone: testPhone || undefined, email: testEmail || undefined, telegramChatId: testTelegram || undefined } : undefined

  return { sms, email, telegram, push, test }
}

export async function loadNotificationSettings(force = false): Promise<NotificationSettings> {
  if (!force && cachedConfig && Date.now() - cachedAt < CACHE_TTL) {
    return cachedConfig
  }
  const stored = (await getSettings<NotificationSettings>(SETTINGS_KEY)) ?? {}
  const fallback = envFallback()
  const merged: NotificationSettings = {
    sms: stored.sms ?? fallback.sms,
    email: stored.email ?? fallback.email,
    telegram: stored.telegram ?? fallback.telegram,
    push: stored.push ?? fallback.push,
    test: stored.test ?? fallback.test,
  }
  cachedConfig = merged
  cachedAt = Date.now()
  return merged
}

export async function saveNotificationSettings(settings: NotificationSettings) {
  const sanitized = sanitizeNotificationSettings(settings)
  await updateSettings(SETTINGS_KEY, sanitized)
  cachedConfig = sanitized
  cachedAt = Date.now()
  return sanitized
}
