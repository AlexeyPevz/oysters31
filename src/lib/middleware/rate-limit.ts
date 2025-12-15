/**
 * Простой in-memory rate limiter для защиты API
 * Для продакшена рекомендуется использовать Redis или специализированный сервис
 */

type RateLimitStore = Map<string, { count: number; resetAt: number }>

const stores = new Map<string, RateLimitStore>()

function getStore(key: string): RateLimitStore {
  if (!stores.has(key)) {
    stores.set(key, new Map())
  }
  return stores.get(key)!
}

function cleanupExpiredEntries(store: RateLimitStore) {
  const now = Date.now()
  for (const [key, value] of store.entries()) {
    if (value.resetAt < now) {
      store.delete(key)
    }
  }
}

export type RateLimitOptions = {
  windowMs: number // Время окна в миллисекундах
  maxRequests: number // Максимальное количество запросов за окно
  keyGenerator?: (request: Request) => string // Функция для генерации ключа (по умолчанию IP)
}

const defaultKeyGenerator = (request: Request): string => {
  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded ? forwarded.split(",")[0].trim() : request.headers.get("x-real-ip") || "unknown"
  return ip
}

export async function rateLimit(request: Request, options: RateLimitOptions): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const { windowMs, maxRequests, keyGenerator = defaultKeyGenerator } = options
  const key = keyGenerator(request)
  const store = getStore(`${windowMs}-${maxRequests}`)

  // Периодическая очистка устаревших записей
  if (Math.random() < 0.01) {
    cleanupExpiredEntries(store)
  }

  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    // Новое окно или истекшее окно
    store.set(key, {
      count: 1,
      resetAt: now + windowMs,
    })
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs,
    }
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    }
  }

  entry.count += 1
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  }
}

/**
 * Предустановленные конфигурации rate limiting
 */
export const rateLimitConfigs = {
  // Строгий лимит для создания заказов
  strict: {
    windowMs: 60 * 1000, // 1 минута
    maxRequests: 5,
  },
  // Средний лимит для API
  medium: {
    windowMs: 60 * 1000, // 1 минута
    maxRequests: 30,
  },
  // Мягкий лимит для публичных эндпоинтов
  soft: {
    windowMs: 60 * 1000, // 1 минута
    maxRequests: 100,
  },
  // Лимит для аутентификации
  auth: {
    windowMs: 15 * 60 * 1000, // 15 минут
    maxRequests: 5,
  },
}

