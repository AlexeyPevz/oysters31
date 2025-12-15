import webPush from "web-push"
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { loadNotificationSettings } from "@/lib/services/notification-config"

let cachedVapid: { publicKey: string; privateKey: string } | null = null

async function ensureVapid() {
  if (cachedVapid) return cachedVapid
  const config = await loadNotificationSettings()
  const push = config.push
  if (!push?.publicKey || !push.privateKey) {
    throw new Error("WEB_PUSH_KEYS_NOT_CONFIGURED")
  }
  const emailFrom = config.email?.from ?? 'notifications@oysters.local'
  webPush.setVapidDetails(`mailto:${emailFrom}`, push.publicKey, push.privateKey)
  cachedVapid = push
  return push
}

export async function savePushSubscription(endpoint: string, keys: Record<string, unknown>, userId?: string) {
  return db.pushSubscription.upsert({
    where: { endpoint },
    update: { keys: keys as Prisma.InputJsonValue, userId },
    create: { endpoint, keys: keys as Prisma.InputJsonValue, userId },
  })
}

export type WebPushPayload = {
  title: string
  body: string
  url?: string
}

export async function sendPushToSubscription(subscription: { id: string; endpoint: string; keys: Prisma.JsonValue }, payload: WebPushPayload) {
  await ensureVapid()
  const { endpoint, keys } = subscription
  const jsonKeys = keys as { p256dh: string; auth: string }

  try {
    await webPush.sendNotification({ endpoint, keys: jsonKeys }, JSON.stringify(payload))
  } catch (error) {
    const status = typeof error === 'object' && error && 'statusCode' in error ? (error as { statusCode?: number }).statusCode : undefined
    if (status === 410 || status === 404) {
      await db.pushSubscription.delete({ where: { id: subscription.id } })
    } else {
      console.error('Push delivery failed', { endpoint, error })
    }
  }
}

export async function broadcastPushNotification(payload: WebPushPayload, options?: { userIds?: string[] }) {
  await ensureVapid()
  const where = options?.userIds?.length ? { userId: { in: options.userIds } } : undefined
  const subscriptions = await db.pushSubscription.findMany({ where })
  await Promise.allSettled(subscriptions.map((subscription) => sendPushToSubscription(subscription, payload)))
  return { total: subscriptions.length }
}

/**
 * Отправляет push-уведомления пользователям по ролям
 */
export async function sendPushByRole(roles: string[], payload: WebPushPayload) {
  await ensureVapid()
  const { UserRole } = await import("@prisma/client")
  
  const validRoles = roles.filter((r) => Object.values(UserRole).includes(r as UserRole)) as UserRole[]
  if (validRoles.length === 0) {
    return { total: 0 }
  }

  const users = await db.user.findMany({
    where: {
      role: { in: validRoles },
      isActive: true,
    },
    select: { id: true },
  })

  if (users.length === 0) {
    return { total: 0 }
  }

  const userIds = users.map((u) => u.id)
  return broadcastPushNotification(payload, { userIds })
}

export async function sendPushPreview(payload: WebPushPayload, options?: { subscriptionId?: string }) {
  await ensureVapid()
  let subscription = options?.subscriptionId
    ? await db.pushSubscription.findUnique({ where: { id: options.subscriptionId } })
    : null
  if (!subscription) {
    subscription = await db.pushSubscription.findFirst({ orderBy: { createdAt: 'desc' } })
  }
  if (!subscription) {
    throw new Error('NO_PUSH_SUBSCRIBERS')
  }
  await sendPushToSubscription(subscription, payload)
  return subscription
}

export async function listPushSubscriptions(limit = 50) {
  const [total, items] = await Promise.all([
    db.pushSubscription.count(),
    db.pushSubscription.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        endpoint: true,
        userId: true,
        createdAt: true,
        user: { 
          select: { 
            id: true, 
            name: true, 
            phone: true 
          } 
        },
      },
    }),
  ])
  
  return { 
    total, 
    items: items.map(item => ({
      id: item.id,
      endpoint: item.endpoint,
      createdAt: item.createdAt.toISOString(),
      userId: item.userId,
      user: item.user,
    }))
  }
}

export async function deletePushSubscription(id: string) {
  return db.pushSubscription.delete({ where: { id } })
}
