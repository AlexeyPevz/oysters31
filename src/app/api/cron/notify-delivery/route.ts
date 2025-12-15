import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { broadcastPushNotification } from "@/lib/services/push"
import { sendSMS, sendEmail } from "@/lib/services/notification"
import { getSlotLabel } from "@/lib/order-workflow"

/**
 * API endpoint для cron job, который отправляет уведомления клиентам
 * о предстоящей доставке за N часов до времени доставки
 *
 * Использование:
 * - Настроить cron job (например, через Vercel Cron или внешний сервис)
 * - Вызывать каждые 15-30 минут: GET /api/cron/notify-delivery?hours=1
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const hoursParam = searchParams.get("hours") || "1"
  const hours = parseInt(hoursParam, 10)

  if (isNaN(hours) || hours < 1) {
    return NextResponse.json({ error: "Invalid hours parameter" }, { status: 400 })
  }

  // Проверка авторизации (можно добавить секретный ключ)
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const now = new Date()
    const targetTime = new Date(now.getTime() + hours * 60 * 60 * 1000)

    // Находим заказы, которые должны быть доставлены через N часов
    // и у которых еще не было отправлено уведомление
    const orders = await db.order.findMany({
      where: {
        status: { in: ["CONFIRMED", "PREP", "IN_TRANSIT"] },
        deliveryDate: {
          gte: new Date(targetTime.getTime() - 30 * 60 * 1000), // ±30 минут окно
          lte: new Date(targetTime.getTime() + 30 * 60 * 1000),
        },
        notifyBeforeHours: hours,
        // Можно добавить поле notifiedAt для отслеживания отправленных уведомлений
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        orderItems: {
          include: {
            product: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    const notifications = await Promise.allSettled(
      orders.map(async (order) => {
        if (!order.user) return { orderId: order.id, status: "skipped", reason: "no_user" }

        const deliveryTime = order.hourlySlot || getSlotLabel(order.slot)
        const itemsList = order.orderItems.map((item) => `${item.product.name} x${item.quantity}`).join(", ")

        const message = `Напоминание: ваш заказ №${order.orderNumber} будет доставлен ${new Date(order.deliveryDate).toLocaleDateString("ru-RU")} в ${deliveryTime}. Товары: ${itemsList}`

        const notifications = []

        // Push уведомление
        if (order.user.id) {
          notifications.push(
            broadcastPushNotification(
              {
                title: "Напоминание о доставке",
                body: message,
                url: `/profile?order=${order.id}`,
              },
              { userIds: [order.user.id] }
            )
          )
        }

        // SMS
        if (order.user.phone) {
          notifications.push(sendSMS(order.user.phone, message))
        }

        // Email
        if (order.user.email) {
          notifications.push(
            sendEmail(order.user.email, "Напоминание о доставке", message)
          )
        }

        await Promise.allSettled(notifications)

        return { orderId: order.id, status: "sent" }
      })
    )

    const results = notifications.map((n) => n.status === "fulfilled" ? n.value : null)
    const sent = results.filter((r) => r?.status === "sent").length
    const skipped = results.filter((r) => r?.status === "skipped").length
    const failed = notifications.filter((r) => r.status === "rejected").length

    return NextResponse.json({
      success: true,
      total: orders.length,
      sent,
      skipped,
      failed,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Cron notify-delivery error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

