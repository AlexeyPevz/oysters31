import { z } from "zod"

type EnvTarget = "server" | "client"

const booleanish = z
  .union([z.string(), z.boolean()])
  .optional()
  .transform((value) => {
    if (value === true || value === "true") return true
    return false
  })

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters"),
  ADMIN_DEFAULT_PHONE: z.string().min(10, "Admin phone is required"),
  ADMIN_DEFAULT_PASSWORD: z.string().min(8, "Admin password must be at least 8 characters"),
  SMS_API_KEY: z.string().optional(),
  SMS_API_URL: z.string().url().optional(),
  SMS_SENDER_ID: z.string().optional(),
  EMAIL_SMTP_URL: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_ALERT_CHAT_ID: z.string().optional(),
  NOTIFY_TEST_SMS_PHONE: z.string().optional(),
  NOTIFY_TEST_EMAIL: z.string().email().optional(),
  NOTIFY_TEST_TELEGRAM_CHAT: z.string().optional(),
  YANDEX_METRICA_ID: z.string().optional(),
  YANDEX_MAPS_API_KEY: z.string().optional(),
  CLOUDPAYMENTS_PUBLIC_ID: z.string().optional(),
  CLOUDPAYMENTS_SECRET_KEY: z.string().optional(),
  YUKASSA_SHOP_ID: z.string().optional(),
  YUKASSA_SECRET_KEY: z.string().optional(),
  WEB_PUSH_PUBLIC_KEY: z.string().optional(),
  WEB_PUSH_PRIVATE_KEY: z.string().optional(),
  ENABLE_ONLINE_PAYMENTS: booleanish,
  ENABLE_WAITLIST_NOTIFICATIONS: booleanish,
})

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY: z.string().optional(),
})

type FormattedErrors = z.ZodFormattedError<Record<string, unknown>>

const formatErrors = (errors: FormattedErrors) => {
  const messages: string[] = []
  for (const [key, value] of Object.entries(errors)) {
    if (typeof value === "object" && value && "_errors" in value) {
      const joined = (value as { _errors?: string[] })._errors?.join(", ") ?? ""
      messages.push(`${key}: ${joined}`)
    } else {
      messages.push(`${key}: ${String(value)}`)
    }
  }
  return messages.join("\n")
}

function validateEnv<S extends z.ZodTypeAny>(schema: S, target: EnvTarget): z.infer<S> {
  const result = schema.safeParse(process.env)
  if (!result.success) {
    console.error(`Invalid ${target} env:
${formatErrors(result.error.format())}`)
    throw new Error("ENV_VALIDATION_ERROR")
  }
  return result.data
}

export const serverEnv = validateEnv(serverSchema, "server")
export const publicEnv = validateEnv(clientSchema, "client")

export const featureFlags = {
  onlinePayments: serverEnv.ENABLE_ONLINE_PAYMENTS,
  waitlistNotifications: serverEnv.ENABLE_WAITLIST_NOTIFICATIONS,
  pushEnabled: !!serverEnv.WEB_PUSH_PUBLIC_KEY,
}


export const isProd = serverEnv.NODE_ENV === "production"
